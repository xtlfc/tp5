// pages/index/index.js
const app = getApp()

Page({
  data: {
    userInfo: {},
    isRolling: false,
    diceNumber: 1,
    diceClass: '',
    matchResult: null,
    rollHistory: [],
    matchCount: 0,
    todayRolls: 0,
    shakeThreshold: 15, // 摇动阈值
    lastShakeTime: 0
  },

  onLoad() {
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }

    this.setData({
      userInfo: app.globalData.userInfo
    })

    // 初始化数据
    this.loadUserData()
    
    // 开启摇一摇监听
    this.startShakeListener()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadUserData()
  },

  // 加载用户数据
  async loadUserData() {
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('users').where({
        openid: app.globalData.openid
      }).get()

      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        this.setData({
          matchCount: user.matchCount || 0,
          todayRolls: user.todayRolls || 0
        })
      }

      // 加载今日摇骰子历史
      this.loadRollHistory()

    } catch (error) {
      console.error('加载用户数据失败:', error)
    }
  },

  // 加载摇骰子历史
  async loadRollHistory() {
    try {
      const db = wx.cloud.database()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const historyRes = await db.collection('rollHistory').where({
        openid: app.globalData.openid,
        createTime: db.command.gte(today)
      }).orderBy('createTime', 'desc').limit(10).get()

      const history = historyRes.data.map(item => ({
        number: item.diceNumber,
        time: this.formatTime(item.createTime),
        matched: item.matched
      }))

      this.setData({ rollHistory: history })

    } catch (error) {
      console.error('加载历史记录失败:', error)
    }
  },

  // 开始摇骰子
  async startRoll() {
    if (this.data.isRolling) return

    this.setData({ isRolling: true })

    // 播放摇骰子动画
    this.playRollAnimation()

    // 等待动画完成后生成结果
    setTimeout(async () => {
      await this.generateRollResult()
    }, 600)
  },

  // 播放摇骰子动画
  playRollAnimation() {
    this.setData({
      diceClass: 'rolling'
    })

    // 随机切换骰子点数
    const animationInterval = setInterval(() => {
      const randomNumber = Math.floor(Math.random() * 6) + 1
      this.setData({ diceNumber: randomNumber })
    }, 100)

    // 停止动画
    setTimeout(() => {
      clearInterval(animationInterval)
      this.setData({ diceClass: '' })
    }, 600)
  },

  // 生成摇骰子结果
  async generateRollResult() {
    try {
      // 生成随机点数
      const diceNumber = Math.floor(Math.random() * 6) + 1
      
      this.setData({ 
        diceNumber,
        isRolling: false
      })

      // 保存摇骰子记录
      await this.saveRollRecord(diceNumber)

      // 尝试匹配用户
      await this.tryMatchUser(diceNumber)

    } catch (error) {
      console.error('生成摇骰子结果失败:', error)
      this.setData({ isRolling: false })
    }
  },

  // 保存摇骰子记录
  async saveRollRecord(diceNumber) {
    try {
      const db = wx.cloud.database()
      
      // 保存到历史记录
      await db.collection('rollHistory').add({
        data: {
          openid: app.globalData.openid,
          diceNumber: diceNumber,
          createTime: new Date(),
          matched: false
        }
      })

      // 更新用户今日摇骰子次数
      await db.collection('users').where({
        openid: app.globalData.openid
      }).update({
        data: {
          todayRolls: db.command.inc(1),
          lastRollTime: new Date()
        }
      })

      // 刷新本地数据
      this.loadUserData()

    } catch (error) {
      console.error('保存摇骰子记录失败:', error)
    }
  },

  // 尝试匹配用户
  async tryMatchUser(diceNumber) {
    try {
      // 调用匹配云函数
      const result = await wx.cloud.callFunction({
        name: 'match',
        data: {
          openid: app.globalData.openid,
          diceNumber: diceNumber,
          location: app.globalData.location
        }
      })

      if (result.result.success && result.result.matchedUser) {
        // 匹配成功
        const matchedUser = result.result.matchedUser
        matchedUser.distance = this.calculateDistance(matchedUser.location)
        matchedUser.matchTime = this.formatTime(new Date())

        this.setData({ matchResult: matchedUser })

        // 更新匹配记录
        await this.updateMatchRecord(diceNumber, matchedUser)

        wx.showToast({
          title: '匹配成功！',
          icon: 'success'
        })

      } else {
        // 没有匹配到用户
        wx.showToast({
          title: '暂时没有匹配到用户',
          icon: 'none'
        })
      }

    } catch (error) {
      console.error('匹配用户失败:', error)
      wx.showToast({
        title: '匹配失败，请重试',
        icon: 'none'
      })
    }
  },

  // 更新匹配记录
  async updateMatchRecord(diceNumber, matchedUser) {
    try {
      const db = wx.cloud.database()
      
      // 更新摇骰子记录为已匹配
      await db.collection('rollHistory').where({
        openid: app.globalData.openid,
        diceNumber: diceNumber,
        createTime: db.command.gte(new Date(Date.now() - 60000)) // 最近1分钟的记录
      }).update({
        data: { matched: true }
      })

      // 更新用户匹配次数
      await db.collection('users').where({
        openid: app.globalData.openid
      }).update({
        data: { matchCount: db.command.inc(1) }
      })

      // 创建聊天会话
      await this.createChatSession(matchedUser)

    } catch (error) {
      console.error('更新匹配记录失败:', error)
    }
  },

  // 创建聊天会话
  async createChatSession(matchedUser) {
    try {
      const db = wx.cloud.database()
      
      // 检查是否已存在会话
      const sessionRes = await db.collection('chatSessions').where({
        _openid: app.globalData.openid,
        matchedUserId: matchedUser.openid
      }).get()

      if (sessionRes.data.length === 0) {
        // 创建新会话
        await db.collection('chatSessions').add({
          data: {
            matchedUserId: matchedUser.openid,
            matchedUserInfo: {
              nickName: matchedUser.nickName,
              avatarUrl: matchedUser.avatarUrl
            },
            createTime: new Date(),
            lastMessageTime: new Date()
          }
        })
      }

    } catch (error) {
      console.error('创建聊天会话失败:', error)
    }
  },

  // 开始聊天
  startChat(e) {
    const user = e.currentTarget.dataset.user
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${user.openid}&userName=${user.nickName}`
    })
  },

  // 开启摇一摇监听
  startShakeListener() {
    wx.onAccelerometerChange((res) => {
      const { x, y, z } = res
      const acceleration = Math.sqrt(x * x + y * y + z * z)
      
      if (acceleration > this.data.shakeThreshold) {
        const now = Date.now()
        if (now - this.data.lastShakeTime > 1000) { // 防止频繁触发
          this.setData({ lastShakeTime: now })
          this.startRoll()
        }
      }
    })
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
    const diff = now - new Date(date)
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`
    } else {
      return new Date(date).toLocaleDateString()
    }
  },

  onUnload() {
    // 页面卸载时停止摇一摇监听
    wx.stopAccelerometer()
  }
})