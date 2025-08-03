// pages/match/match.js
const app = getApp()

Page({
  data: {
    totalMatches: 0,
    todayMatches: 0,
    activeChats: 0,
    chatSessions: [],
    matchHistory: [],
    isMatching: false,
    matchFailed: false,
    countdownTime: 30,
    progressPercent: 100,
    countdownTimer: null,
    matchTimer: null
  },

  onLoad() {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }

    this.loadData()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadData()
  },

  onLoad(options) {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }

    // 如果是从摇骰子页面跳转过来的，开始匹配
    if (options.fromRoll === 'true') {
      this.startMatching()
    } else {
      this.loadData()
    }
  },

  // 加载数据
  async loadData() {
    await Promise.all([
      this.loadStats(),
      this.loadChatSessions(),
      this.loadMatchHistory()
    ])
  },

  // 加载统计数据
  async loadStats() {
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('users').where({
        openid: app.globalData.openid
      }).get()

      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        this.setData({
          totalMatches: user.matchCount || 0,
          todayMatches: user.todayMatches || 0
        })
      }

      // 获取活跃聊天数量
      const sessionsRes = await db.collection('chatSessions').where({
        _openid: app.globalData.openid
      }).get()

      this.setData({
        activeChats: sessionsRes.data.length
      })

    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 加载聊天会话
  async loadChatSessions() {
    try {
      const db = wx.cloud.database()
      const sessionsRes = await db.collection('chatSessions').where({
        _openid: app.globalData.openid
      }).orderBy('lastMessageTime', 'desc').get()

      const sessions = sessionsRes.data.map(session => ({
        id: session._id,
        matchedUserId: session.matchedUserId,
        matchedUserInfo: session.matchedUserInfo,
        lastMessage: session.lastMessage,
        lastMessageTime: session.lastMessageTime,
        lastMessageTimeText: this.formatTime(session.lastMessageTime),
        unreadCount: 0 // 可以添加未读消息计数逻辑
      }))

      this.setData({ chatSessions: sessions })

    } catch (error) {
      console.error('加载聊天会话失败:', error)
    }
  },

  // 加载匹配历史
  async loadMatchHistory() {
    try {
      const db = wx.cloud.database()
      const historyRes = await db.collection('matches').where({
        user1Id: app.globalData.openid
      }).orderBy('matchTime', 'desc').limit(10).get()

      // 获取匹配用户信息
      const historyWithUsers = await Promise.all(
        historyRes.data.map(async (match) => {
          const userRes = await db.collection('users').where({
            openid: match.user2Id
          }).get()

          const matchedUser = userRes.data[0] || {}
          
          return {
            id: match._id,
            diceNumber: match.diceNumber,
            distance: match.distance,
            matchTime: match.matchTime,
            matchTimeText: this.formatTime(match.matchTime),
            isActive: match.isActive,
            matchedUser: {
              openid: matchedUser.openid,
              nickName: matchedUser.nickName,
              avatarUrl: matchedUser.avatarUrl
            }
          }
        })
      )

      this.setData({ matchHistory: historyWithUsers })

    } catch (error) {
      console.error('加载匹配历史失败:', error)
    }
  },

  // 打开聊天
  openChat(e) {
    const session = e.currentTarget.dataset.session
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${session.matchedUserId}&userName=${session.matchedUserInfo.nickName}`
    })
  },

  // 去摇骰子
  goToRoll() {
    wx.switchTab({
      url: '/pages/index/index'
    })
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
    } else if (diff < 604800000) { // 1周内
      return `${Math.floor(diff / 86400000)}天前`
    } else {
      return messageTime.toLocaleDateString()
    }
  },

  // 开始匹配
  startMatching() {
    this.setData({
      isMatching: true,
      matchFailed: false,
      countdownTime: 30,
      progressPercent: 100
    })

    // 开始倒计时
    this.startCountdown()

    // 开始匹配逻辑
    this.startMatchLogic()
  },

  // 开始倒计时
  startCountdown() {
    this.data.countdownTimer = setInterval(() => {
      const newTime = this.data.countdownTime - 1
      const newProgress = (newTime / 30) * 100

      this.setData({
        countdownTime: newTime,
        progressPercent: newProgress
      })

      if (newTime <= 0) {
        this.stopCountdown()
        this.handleMatchTimeout()
      }
    }, 1000)
  },

  // 停止倒计时
  stopCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
      this.data.countdownTimer = null
    }
  },

  // 开始匹配逻辑
  async startMatchLogic() {
    try {
      // 调用匹配云函数
      const result = await wx.cloud.callFunction({
        name: 'match',
        data: {
          action: 'findMatch',
          userId: app.globalData.openid,
          diceNumber: app.globalData.lastDiceNumber || 1
        }
      })

      if (result.result.success && result.result.matchedUser) {
        // 匹配成功
        this.handleMatchSuccess(result.result.matchedUser)
      }
    } catch (error) {
      console.error('匹配失败:', error)
    }
  },

  // 处理匹配成功
  handleMatchSuccess(matchedUser) {
    this.stopCountdown()
    
    this.setData({
      isMatching: false,
      matchFailed: false
    })

    // 跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${matchedUser.openid}&userName=${matchedUser.nickName}`
    })
  },

  // 处理匹配超时
  handleMatchTimeout() {
    this.setData({
      isMatching: false,
      matchFailed: true
    })
  },

  // 取消匹配
  cancelMatching() {
    this.stopCountdown()
    this.setData({
      isMatching: false,
      matchFailed: false
    })
    
    // 返回首页
    wx.navigateBack()
  },

  // 重新匹配
  retryMatch() {
    this.startMatching()
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  },

  onUnload() {
    // 页面卸载时清理定时器
    this.stopCountdown()
  }
})