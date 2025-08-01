// pages/chat/chat.js
const app = getApp()

Page({
  data: {
    matchedUser: {},
    userInfo: {},
    messages: [],
    inputMessage: '',
    isSending: false,
    isLoadingMore: false,
    scrollToMessage: '',
    userStatus: '在线',
    showDestroyTip: true,
    chatId: '',
    page: 1,
    pageSize: 20
  },

  onLoad(options) {
    const { userId, userName } = options
    
    this.setData({
      userInfo: app.globalData.userInfo,
      chatId: `${app.globalData.openid}_${userId}`
    })

    // 获取匹配用户信息
    this.getMatchedUserInfo(userId)
    
    // 加载聊天消息
    this.loadMessages()
    
    // 监听新消息
    this.watchNewMessages()
  },

  // 获取匹配用户信息
  async getMatchedUserInfo(userId) {
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('users').where({
        openid: userId
      }).get()

      if (userRes.data.length > 0) {
        this.setData({
          matchedUser: userRes.data[0]
        })
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  },

  // 加载聊天消息
  async loadMessages() {
    try {
      const db = wx.cloud.database()
      const messagesRes = await db.collection('messages').where({
        chatId: this.data.chatId
      }).orderBy('createTime', 'desc').skip((this.data.page - 1) * this.data.pageSize).limit(this.data.pageSize).get()

      const messages = messagesRes.data.reverse().map(msg => ({
        id: msg._id,
        content: msg.content,
        type: msg.type,
        isSelf: msg.senderId === app.globalData.openid,
        createTime: msg.createTime,
        timeText: this.formatTime(msg.createTime),
        showTime: this.shouldShowTime(msg.createTime),
        status: msg.status || 'sent'
      }))

      this.setData({
        messages: this.data.page === 1 ? messages : [...messages, ...this.data.messages]
      })

      // 滚动到底部
      if (this.data.page === 1) {
        this.scrollToBottom()
      }

    } catch (error) {
      console.error('加载消息失败:', error)
    }
  },

  // 加载更多消息
  async loadMoreMessages() {
    if (this.data.isLoadingMore) return

    this.setData({ isLoadingMore: true })
    this.setData({ page: this.data.page + 1 })
    
    await this.loadMessages()
    this.setData({ isLoadingMore: false })
  },

  // 监听新消息
  watchNewMessages() {
    const db = wx.cloud.database()
    const watcher = db.collection('messages').where({
      chatId: this.data.chatId
    }).watch({
      onChange: (snapshot) => {
        const { docChanges } = snapshot
        docChanges.forEach((change) => {
          if (change.dataType === 'add') {
            const newMessage = {
              id: change.doc._id,
              content: change.doc.content,
              type: change.doc.type,
              isSelf: change.doc.senderId === app.globalData.openid,
              createTime: change.doc.createTime,
              timeText: this.formatTime(change.doc.createTime),
              showTime: this.shouldShowTime(change.doc.createTime),
              status: change.doc.status || 'sent'
            }

            this.setData({
              messages: [...this.data.messages, newMessage]
            })

            this.scrollToBottom()

            // 如果不是自己发送的消息，标记为已读
            if (!newMessage.isSelf) {
              this.markMessageAsRead(newMessage.id)
            }
          }
        })
      },
      onError: (err) => {
        console.error('监听消息失败:', err)
      }
    })

    this.messageWatcher = watcher
  },

  // 输入框变化
  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value
    })
  },

  // 发送消息
  async sendMessage() {
    const message = this.data.inputMessage.trim()
    if (!message || this.data.isSending) return

    this.setData({ isSending: true })

    try {
      const messageId = await this.saveMessage(message, 'text')
      
      // 清空输入框
      this.setData({ 
        inputMessage: '',
        isSending: false
      })

      // 滚动到底部
      this.scrollToBottom()

    } catch (error) {
      console.error('发送消息失败:', error)
      this.setData({ isSending: false })
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const tempFilePath = res.tempFilePaths[0]
      await this.uploadAndSendImage(tempFilePath)

    } catch (error) {
      console.error('选择图片失败:', error)
    }
  },

  // 上传并发送图片
  async uploadAndSendImage(filePath) {
    try {
      wx.showLoading({ title: '发送中...' })

      // 上传图片到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `chat-images/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: filePath
      })

      // 发送图片消息
      await this.saveMessage(uploadRes.fileID, 'image')

      wx.hideLoading()
      this.scrollToBottom()

    } catch (error) {
      wx.hideLoading()
      console.error('上传图片失败:', error)
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
  },

  // 保存消息到数据库
  async saveMessage(content, type) {
    try {
      const db = wx.cloud.database()
      const messageData = {
        chatId: this.data.chatId,
        senderId: app.globalData.openid,
        receiverId: this.data.matchedUser.openid,
        content: content,
        type: type,
        status: 'sending',
        createTime: new Date()
      }

      const result = await db.collection('messages').add({
        data: messageData
      })

      // 更新消息状态为已发送
      await db.collection('messages').doc(result._id).update({
        data: { status: 'sent' }
      })

      // 更新聊天会话的最后消息时间
      await this.updateChatSession()

      return result._id

    } catch (error) {
      console.error('保存消息失败:', error)
      throw error
    }
  },

  // 标记消息为已读
  async markMessageAsRead(messageId) {
    try {
      const db = wx.cloud.database()
      await db.collection('messages').doc(messageId).update({
        data: { status: 'read' }
      })

      // 更新本地消息状态
      const messages = this.data.messages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, status: 'read' }
        }
        return msg
      })

      this.setData({ messages })

    } catch (error) {
      console.error('标记已读失败:', error)
    }
  },

  // 更新聊天会话
  async updateChatSession() {
    try {
      const db = wx.cloud.database()
      await db.collection('chatSessions').where({
        _openid: app.globalData.openid,
        matchedUserId: this.data.matchedUser.openid
      }).update({
        data: {
          lastMessageTime: new Date()
        }
      })
    } catch (error) {
      console.error('更新聊天会话失败:', error)
    }
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: [url],
      current: url
    })
  },

  // 开始视频通话
  startVideoCall() {
    const callId = `video_${Date.now()}`
    wx.navigateTo({
      url: `/pages/video-call/video-call?callId=${callId}&callerId=${this.data.matchedUser.openid}&isIncoming=false`
    })
  },

  // 开始语音通话
  startVoiceCall() {
    const callId = `voice_${Date.now()}`
    wx.navigateTo({
      url: `/pages/voice-call/voice-call?callId=${callId}&callerId=${this.data.matchedUser.openid}&isIncoming=false`
    })
  },

  // 显示用户资料
  showUserProfile() {
    wx.showModal({
      title: this.data.matchedUser.nickName,
      content: `距离: ${this.calculateDistance(this.data.matchedUser.location)}km\n匹配时间: ${this.formatTime(this.data.matchedUser.lastRollTime)}`,
      showCancel: false
    })
  },

  // 显示用户操作菜单
  showUserActions() {
    wx.showActionSheet({
      itemList: ['举报用户', '拉黑用户', '取消'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.reportUser()
            break
          case 1:
            this.blockUser()
            break
        }
      }
    })
  },

  // 举报用户
  reportUser() {
    wx.navigateTo({
      url: `/pages/report/report?userId=${this.data.matchedUser.openid}`
    })
  },

  // 拉黑用户
  blockUser() {
    wx.showModal({
      title: '确认拉黑',
      content: `确定要拉黑 ${this.data.matchedUser.nickName} 吗？拉黑后将无法收到对方的消息。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('blacklist').add({
              data: {
                userId: app.globalData.openid,
                blockedUserId: this.data.matchedUser.openid,
                blockTime: new Date(),
                reason: '用户主动拉黑'
              }
            })

            wx.showToast({
              title: '已拉黑',
              icon: 'success'
            })

            // 返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)

          } catch (error) {
            console.error('拉黑失败:', error)
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      if (this.data.messages.length > 0) {
        const lastMessage = this.data.messages[this.data.messages.length - 1]
        this.setData({
          scrollToMessage: `msg-${lastMessage.id}`
        })
      }
    }, 100)
  },

  // 计算距离
  calculateDistance(location) {
    if (!app.globalData.location || !location) return 0
    
    const distance = app.calculateDistance(
      app.globalData.location.latitude,
      app.globalData.location.longitude,
      location.latitude,
      location.longitude
    )
    
    return distance.toFixed(1)
  },

  // 格式化时间
  formatTime(date) {
    const now = new Date()
    const messageTime = new Date(date)
    const diff = now - messageTime
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`
    } else {
      return messageTime.toLocaleDateString()
    }
  },

  // 是否显示时间分割线
  shouldShowTime(currentTime) {
    if (this.data.messages.length === 0) return true
    
    const lastMessage = this.data.messages[this.data.messages.length - 1]
    const timeDiff = new Date(currentTime) - new Date(lastMessage.createTime)
    
    return timeDiff > 300000 // 5分钟间隔显示时间
  },

  onUnload() {
    // 页面卸载时停止消息监听
    if (this.messageWatcher) {
      this.messageWatcher.close()
    }
  }
})