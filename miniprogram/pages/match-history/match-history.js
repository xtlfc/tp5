// pages/match-history/match-history.js
const app = getApp()

Page({
  data: {
    totalMatches: 0,
    todayMatches: 0,
    avgDistance: 0,
    matchHistory: []
  },

  onLoad() {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }

    this.loadMatchHistory()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadMatchHistory()
  },

  // 加载匹配历史
  async loadMatchHistory() {
    try {
      const db = wx.cloud.database()
      
      // 获取匹配历史
      const matchesRes = await db.collection('matches').where({
        user1Id: app.globalData.openid
      }).orderBy('matchTime', 'desc').limit(50).get()

      const matchHistory = []
      let totalDistance = 0

      // 处理匹配数据
      for (const match of matchesRes.data) {
        try {
          // 获取匹配用户信息
          const userRes = await db.collection('users').where({
            openid: match.user2Id
          }).get()

          if (userRes.data.length > 0) {
            const matchedUser = userRes.data[0]
            const matchItem = {
              id: match._id,
              diceNumber: match.diceNumber,
              matchTime: match.matchTime,
              timeText: this.formatTime(match.matchTime),
              distance: match.distance,
              matchedUser: {
                openid: matchedUser.openid,
                nickName: matchedUser.nickName,
                avatarUrl: matchedUser.avatarUrl,
                gender: matchedUser.gender,
                age: matchedUser.age
              },
              isActive: match.status === 'active'
            }

            matchHistory.push(matchItem)
            totalDistance += match.distance
          }
        } catch (error) {
          console.error('获取匹配用户信息失败:', error)
        }
      }

      // 计算统计数据
      const totalMatches = matchHistory.length
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayMatches = matchHistory.filter(match => 
        new Date(match.matchTime) >= today
      ).length
      const avgDistance = totalMatches > 0 ? Math.round((totalDistance / totalMatches) * 10) / 10 : 0

      this.setData({
        totalMatches,
        todayMatches,
        avgDistance,
        matchHistory
      })

    } catch (error) {
      console.error('加载匹配历史失败:', error)
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

  // 查看匹配详情
  viewMatchDetail(e) {
    const match = e.currentTarget.dataset.match
    
    // 跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?chatId=${match.id}&userId=${match.matchedUser.openid}`
    })
  },

  // 去摇骰子
  goToRoll() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})