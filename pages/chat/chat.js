const app = getApp()
const blacklistManager = require('../../utils/blacklist.js')
const reportManager = require('../../utils/report.js')

Page({
  data: {
    chatUser: null,
    userInfo: null,
    messages: [],
    inputText: '',
    inputMode: 'text', // text, voice
    isRecording: false,
    isTyping: false,
    isOnline: true,
    isConnected: true,
    showEmojiPanel: false,
    scrollTop: 0,
    scrollIntoView: '',
    
    // 表情列表
    emojiList: ['😀', '😂', '😍', '🥰', '😘', '😊', '😉', '😄', '😆', '🤗', '🤔', '😒', '😭', '😡', '👍', '👎', '❤️', '💔', '🎉', '🔥'],
    
    // 消息销毁时间（秒）
    destroyDelay: 30,
    
    // 定时器
    destroyTimers: {}
  },

  onLoad: function(options) {
    console.log('聊天页面加载', options)
    
    // 获取聊天对象信息
    const userId = options.userId
    const userName = options.userName
    
    if (userId) {
      this.initChat(userId, userName)
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onShow: function() {
    // 模拟连接WebSocket
    this.connectWebSocket()
  },

  onHide: function() {
    // 断开WebSocket连接
    this.disconnectWebSocket()
  },

  onUnload: function() {
    // 清理所有定时器
    Object.values(this.data.destroyTimers).forEach(timer => {
      clearInterval(timer)
    })
    
    this.disconnectWebSocket()
  },

  // 初始化聊天
  initChat: function(userId, userName) {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    
    // 模拟聊天对象信息
    const chatUser = {
      id: userId,
      nickName: userName || '匿名用户',
      avatarUrl: this.generateRandomAvatar(),
      gender: Math.random() > 0.5 ? 1 : 2,
      isOnline: true
    }
    
    this.setData({
      chatUser: chatUser,
      userInfo: userInfo
    })
    
    // 保存聊天历史
    this.saveChatHistory(chatUser)
    
    // 设置导航标题
    wx.setNavigationBarTitle({
      title: chatUser.nickName
    })
    
    // 加载历史消息
    this.loadHistoryMessages()
  },

  // 保存聊天历史
  saveChatHistory: function(chatUser) {
    const chatHistories = wx.getStorageSync('chatHistories') || []
    
    // 检查是否已存在
    const existingIndex = chatHistories.findIndex(item => item.userId === chatUser.id)
    
    if (existingIndex >= 0) {
      // 更新时间
      chatHistories[existingIndex].timestamp = Date.now()
    } else {
      // 添加新记录
      chatHistories.unshift({
        userId: chatUser.id,
        nickName: chatUser.nickName,
        avatarUrl: chatUser.avatarUrl,
        lastMessage: '开始聊天',
        timestamp: Date.now()
      })
    }
    
    // 只保留最近50个聊天记录
    if (chatHistories.length > 50) {
      chatHistories.splice(50)
    }
    
    wx.setStorageSync('chatHistories', chatHistories)
    console.log('保存聊天历史：', chatHistories)
  },

  // 连接WebSocket
  connectWebSocket: function() {
    const that = this
    
    // 这里应该连接真实的WebSocket服务器
    // 暂时使用模拟连接
    setTimeout(() => {
      that.setData({
        isConnected: true
      })
      
      // 模拟接收消息
      that.simulateIncomingMessages()
    }, 1000)
  },

  // 断开WebSocket连接
  disconnectWebSocket: function() {
    this.setData({
      isConnected: false
    })
  },

  // 加载历史消息
  loadHistoryMessages: function() {
    const chatId = this.generateChatId()
    const messages = wx.getStorageSync(`chat_${chatId}`) || []
    
    // 过滤已销毁的消息
    const validMessages = messages.filter(msg => msg.status !== 'destroyed')
    
    this.setData({
      messages: validMessages
    })
    
    // 滚动到底部
    this.scrollToBottom()
  },

  // 生成聊天ID
  generateChatId: function() {
    const myId = this.data.userInfo.openid || this.data.userInfo.id
    const otherId = this.data.chatUser.id
    
    // 确保ID顺序固定
    return myId < otherId ? `${myId}_${otherId}` : `${otherId}_${myId}`
  },

  // 保存消息到本地
  saveMessage: function(message) {
    const chatId = this.generateChatId()
    const messages = wx.getStorageSync(`chat_${chatId}`) || []
    
    messages.push(message)
    
    // 只保留最近100条消息
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100)
    }
    
    wx.setStorageSync(`chat_${chatId}`, messages)
  },

  // 输入文字
  onInput: function(e) {
    this.setData({
      inputText: e.detail.value
    })
    
    // 发送正在输入状态
    this.sendTypingStatus(true)
  },

  // 发送消息
  sendMessage: function() {
    const content = this.data.inputText.trim()
    if (!content) return
    
    const message = this.createMessage('text', content, true)
    this.addMessage(message)
    
    // 更新聊天历史的最后消息
    this.updateChatHistoryLastMessage(content)
    
    this.setData({
      inputText: ''
    })
    
    // 模拟发送到服务器
    this.sendToServer(message)
    
    // 停止正在输入状态
    this.sendTypingStatus(false)
  },

  // 更新聊天历史的最后消息
  updateChatHistoryLastMessage: function(lastMessage) {
    const chatHistories = wx.getStorageSync('chatHistories') || []
    const chatUser = this.data.chatUser
    
    if (chatUser) {
      const existingIndex = chatHistories.findIndex(item => item.userId === chatUser.id)
      if (existingIndex >= 0) {
        chatHistories[existingIndex].lastMessage = lastMessage
        chatHistories[existingIndex].timestamp = Date.now()
        wx.setStorageSync('chatHistories', chatHistories)
      }
    }
  },

  // 创建消息对象
  createMessage: function(type, content, isMine = false) {
    const now = new Date()
    const lastMessage = this.data.messages[this.data.messages.length - 1]
    
    // 判断是否显示时间
    const showTime = !lastMessage || (now.getTime() - lastMessage.timestamp > 300000) // 5分钟
    
    return {
      id: Date.now() + Math.random(),
      type: type,
      content: content,
      isMine: isMine,
      timestamp: now.getTime(),
      timeStr: this.formatTime(now),
      showTime: showTime,
      status: 'sent', // sent, delivered, read, destroyed
      isRead: false,
      destroyTime: 0,
      isPlaying: false,
      duration: type === 'voice' ? Math.floor(Math.random() * 10) + 1 : 0
    }
  },

  // 添加消息
  addMessage: function(message) {
    const messages = [...this.data.messages, message]
    
    this.setData({
      messages: messages
    })
    
    // 保存到本地
    this.saveMessage(message)
    
    // 滚动到底部
    this.scrollToBottom()
  },

  // 阅读消息
  readMessage: function(e) {
    const messageId = e.currentTarget.dataset.id
    const messages = this.data.messages.map(msg => {
      if (msg.id == messageId && !msg.isMine && !msg.isRead) {
        msg.isRead = true
        msg.destroyTime = this.data.destroyDelay
        
        // 开始销毁倒计时
        this.startDestroyTimer(messageId)
      }
      return msg
    })
    
    this.setData({
      messages: messages
    })
  },

  // 开始销毁倒计时
  startDestroyTimer: function(messageId) {
    const timer = setInterval(() => {
      const messages = this.data.messages.map(msg => {
        if (msg.id == messageId && msg.destroyTime > 0) {
          msg.destroyTime -= 1
          
          if (msg.destroyTime <= 0) {
            msg.status = 'destroyed'
            msg.content = '[消息已销毁]'
            clearInterval(timer)
            delete this.data.destroyTimers[messageId]
          }
        }
        return msg
      })
      
      this.setData({
        messages: messages
      })
    }, 1000)
    
    this.data.destroyTimers[messageId] = timer
  },

  // 切换输入模式
  toggleVoiceInput: function() {
    const inputMode = this.data.inputMode === 'text' ? 'voice' : 'text'
    this.setData({
      inputMode: inputMode,
      showEmojiPanel: false
    })
  },

  // 切换表情面板
  toggleEmoji: function() {
    this.setData({
      showEmojiPanel: !this.data.showEmojiPanel,
      inputMode: 'text'
    })
  },

  // 发送表情
  sendEmoji: function(e) {
    const emoji = e.currentTarget.dataset.emoji
    const message = this.createMessage('text', emoji, true)
    this.addMessage(message)
    
    this.setData({
      showEmojiPanel: false
    })
    
    this.sendToServer(message)
  },

  // 选择图片
  chooseImage: function() {
    const that = this
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0]
        
        // 创建图片消息
        const message = that.createMessage('image', tempFilePath, true)
        that.addMessage(message)
        
        // 上传图片
        that.uploadImage(tempFilePath, message)
      }
    })
  },

  // 拍照
  takePhoto: function() {
    const that = this
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0]
        
        const message = that.createMessage('image', tempFilePath, true)
        that.addMessage(message)
        
        that.uploadImage(tempFilePath, message)
      }
    })
  },

  // 上传图片
  uploadImage: function(filePath, message) {
    // 这里应该上传到服务器，暂时使用本地路径
    console.log('上传图片：', filePath)
    
    // 模拟上传成功
    setTimeout(() => {
      message.status = 'delivered'
      this.setData({
        messages: this.data.messages
      })
      
      this.sendToServer(message)
    }, 1000)
  },

  // 预览图片
  previewImage: function(e) {
    const url = e.currentTarget.dataset.url
    
    wx.previewImage({
      urls: [url],
      current: url
    })
  },

  // 开始录音
  startRecord: function() {
    const that = this
    
    wx.authorize({
      scope: 'scope.record',
      success: function() {
        that.setData({
          isRecording: true
        })
        
        wx.startRecord({
          success: function(res) {
            console.log('录音成功：', res)
            that.handleRecordSuccess(res.tempFilePath)
          },
          fail: function() {
            that.setData({
              isRecording: false
            })
            wx.showToast({
              title: '录音失败',
              icon: 'none'
            })
          }
        })
      },
      fail: function() {
        wx.showToast({
          title: '需要录音权限',
          icon: 'none'
        })
      }
    })
  },

  // 停止录音
  stopRecord: function() {
    if (this.data.isRecording) {
      wx.stopRecord()
      this.setData({
        isRecording: false
      })
    }
  },

  // 取消录音
  cancelRecord: function() {
    this.setData({
      isRecording: false
    })
    wx.stopRecord()
  },

  // 处理录音成功
  handleRecordSuccess: function(tempFilePath) {
    this.setData({
      isRecording: false
    })
    
    // 创建语音消息
    const message = this.createMessage('voice', tempFilePath, true)
    this.addMessage(message)
    
    // 上传语音
    this.uploadVoice(tempFilePath, message)
  },

  // 上传语音
  uploadVoice: function(filePath, message) {
    console.log('上传语音：', filePath)
    
    // 模拟上传成功
    setTimeout(() => {
      message.status = 'delivered'
      this.setData({
        messages: this.data.messages
      })
      
      this.sendToServer(message)
    }, 1000)
  },

  // 播放语音
  playVoice: function(e) {
    const messageId = e.currentTarget.dataset.id
    const messages = this.data.messages.map(msg => {
      if (msg.id == messageId) {
        msg.isPlaying = !msg.isPlaying
        
        if (msg.isPlaying) {
          // 模拟播放语音
          setTimeout(() => {
            const updatedMessages = this.data.messages.map(m => {
              if (m.id == messageId) {
                m.isPlaying = false
              }
              return m
            })
            this.setData({
              messages: updatedMessages
            })
          }, msg.duration * 1000)
        }
      } else {
        msg.isPlaying = false
      }
      return msg
    })
    
    this.setData({
      messages: messages
    })
  },

  // 发送到服务器
  sendToServer: function(message) {
    // 这里应该发送到WebSocket服务器
    console.log('发送消息到服务器：', message)
    
    // 模拟服务器响应
    setTimeout(() => {
      message.status = 'delivered'
      
      // 模拟对方已读
      setTimeout(() => {
        message.status = 'read'
        this.setData({
          messages: this.data.messages
        })
      }, 2000)
    }, 500)
  },

  // 发送正在输入状态
  sendTypingStatus: function(isTyping) {
    // 这里应该通过WebSocket发送正在输入状态
    console.log('正在输入状态：', isTyping)
  },

  // 模拟接收消息
  simulateIncomingMessages: function() {
    // 模拟对方发送消息
    setTimeout(() => {
      const message = this.createMessage('text', '你好！很高兴认识你 😊', false)
      this.addMessage(message)
    }, 3000)
    
    setTimeout(() => {
      const message = this.createMessage('text', '刚刚摇到了相同的点数呢，真是巧合！', false)
      this.addMessage(message)
    }, 8000)
  },

  // 滚动到底部
  scrollToBottom: function() {
    const messages = this.data.messages
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      this.setData({
        scrollIntoView: `msg${lastMessage.id}`
      })
    }
  },

  // 格式化时间
  formatTime: function(date) {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return Math.floor(diff / 60000) + '分钟前'
    } else if (date.toDateString() === now.toDateString()) { // 今天
      return date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0')
    } else { // 其他日期
      return (date.getMonth() + 1) + '月' + date.getDate() + '日'
    }
  },

  // 生成随机头像
  generateRandomAvatar: function() {
    const avatars = [
      '/images/avatar1.png',
      '/images/avatar2.png',
      '/images/avatar3.png',
      '/images/avatar4.png',
      '/images/avatar5.png'
    ]
    
    return avatars[Math.floor(Math.random() * avatars.length)]
  },

  // 开始视频通话
  startVideoCall: function() {
    wx.showToast({
      title: '视频通话功能开发中',
      icon: 'none'
    })
  },

  // 开始语音通话
  startVoiceCall: function() {
    // 检查是否被拉黑
    if (blacklistManager.isBlocked(this.data.chatUser.id)) {
      wx.showToast({
        title: '无法呼叫该用户',
        icon: 'none'
      })
      return
    }

    // 显示语音通话界面
    this.setData({
      showVoiceCall: true,
      voiceCallType: 'outgoing',
      voiceCallUser: this.data.chatUser
    })
  },

  // 显示更多操作
  showMoreActions: function() {
    const that = this
    
    wx.showActionSheet({
      itemList: ['举报用户', '加入黑名单', '清空聊天记录'],
      success: function(res) {
        switch(res.tapIndex) {
          case 0:
            that.reportUser()
            break
          case 1:
            that.addToBlacklist()
            break
          case 2:
            that.clearChatHistory()
            break
        }
      }
    })
  },

  // 举报用户
  reportUser: function() {
    const that = this
    
    wx.showActionSheet({
      itemList: ['发送不当内容', '骚扰他人', '虚假信息', '诈骗行为', '其他违规'],
      success: function(res) {
        const reportTypes = [1, 2, 3, 4, 8] // 对应举报类型ID
        const typeId = reportTypes[res.tapIndex]
        
        const reportData = {
          targetUserId: that.data.chatUser.id,
          targetUserName: that.data.chatUser.nickName,
          targetUserAvatar: that.data.chatUser.avatarUrl,
          typeId: typeId
        }
        
        reportManager.submitReport(reportData)
          .then(result => {
            wx.showToast({
              title: result.message,
              icon: 'success'
            })
          })
          .catch(error => {
            wx.showToast({
              title: error.message,
              icon: 'none'
            })
          })
      }
    })
  },

  // 加入黑名单
  addToBlacklist: function() {
    const that = this
    
    wx.showModal({
      title: '加入黑名单',
      content: '确定要将该用户加入黑名单吗？加入后将无法收到对方消息。',
      success: function(res) {
        if (res.confirm) {
          const result = blacklistManager.addToBlacklist({
            id: that.data.chatUser.id,
            nickName: that.data.chatUser.nickName,
            avatarUrl: that.data.chatUser.avatarUrl,
            gender: that.data.chatUser.gender,
            reason: '聊天中拉黑'
          })
          
          if (result.success) {
            wx.showToast({
              title: result.message,
              icon: 'success'
            })
            
            // 返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } else {
            wx.showToast({
              title: result.message,
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 清空聊天记录
  clearChatHistory: function() {
    const that = this
    
    wx.showModal({
      title: '清空聊天记录',
      content: '确定要清空与该用户的所有聊天记录吗？此操作不可恢复。',
      success: function(res) {
        if (res.confirm) {
          that.setData({
            messages: []
          })
          
          // 清空本地存储
          const chatId = that.generateChatId()
          wx.removeStorageSync(`chat_${chatId}`)
          
          wx.showToast({
            title: '聊天记录已清空',
            icon: 'success'
          })
        }
      }
    })
  }
})