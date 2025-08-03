// pages/roll-history/roll-history.js
const app = getApp()

Page({
  data: {
    totalRolls: 0,
    todayRolls: 0,
    successRate: 0,
    rollHistory: []
  },

  onLoad() {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }

    this.loadRollHistory()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadRollHistory()
  },

  // 加载摇骰子历史
  async loadRollHistory() {
    try {
      const db = wx.cloud.database()
      
      // 获取摇骰子历史
      const historyRes = await db.collection('rollHistory').where({
        userId: app.globalData.openid
      }).orderBy('createTime', 'desc').limit(50).get()

      // 获取匹配历史
      const matchesRes = await db.collection('matches').where({
        user1Id: app.globalData.openid
      }).get()

      const matches = matchesRes.data
      const matchMap = new Map()
      matches.forEach(match => {
        matchMap.set(match.rollId, match)
      })

      // 处理历史数据
      const rollHistory = historyRes.data.map(roll => {
        const match = matchMap.get(roll._id)
        return {
          id: roll._id,
          diceNumber: roll.diceNumber,
          createTime: roll.createTime,
          timeText: this.formatTime(roll.createTime),
          matched: !!match,
          distance: match ? match.distance : null
        }
      })

      // 计算统计数据
      const totalRolls = rollHistory.length
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayRolls = rollHistory.filter(roll => 
        new Date(roll.createTime) >= today
      ).length
      const successCount = rollHistory.filter(roll => roll.matched).length
      const successRate = totalRolls > 0 ? Math.round((successCount / totalRolls) * 100) : 0

      this.setData({
        totalRolls,
        todayRolls,
        successRate,
        rollHistory
      })

    } catch (error) {
      console.error('加载摇骰子历史失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
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

  // 去摇骰子
  goToRoll() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})