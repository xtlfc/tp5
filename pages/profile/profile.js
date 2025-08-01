const app = getApp()

Page({
  data: {
    userInfo: null,
    totalDiceCount: 0,
    matchCount: 0,
    chatCount: 0
  },

  onLoad: function(options) {
    console.log('个人资料页面加载')
    this.initPage()
  },

  onShow: function() {
    this.loadUserStats()
  },

  // 初始化页面
  initPage: function() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    } else {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login'
      })
    }
  },

  // 加载用户统计数据
  loadUserStats: function() {
    // 摇骰子次数
    const diceRecords = wx.getStorageSync('diceRecords') || []
    
    // 匹配次数（模拟数据）
    const matchCount = Math.floor(Math.random() * 20) + 5
    
    // 聊天人数（模拟数据）
    const chatCount = Math.floor(Math.random() * 10) + 2
    
    this.setData({
      totalDiceCount: diceRecords.length,
      matchCount: matchCount,
      chatCount: chatCount
    })
  },

  // 编辑资料
  editProfile: function() {
    wx.showModal({
      title: '编辑资料',
      content: '此功能正在开发中，敬请期待！',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 查看摇骰记录
  viewHistory: function() {
    const records = wx.getStorageSync('diceRecords') || []
    
    if (records.length === 0) {
      wx.showToast({
        title: '暂无摇骰记录',
        icon: 'none'
      })
      return
    }
    
    // 显示记录列表
    const recordsText = records.map((record, index) => {
      return `${index + 1}. ${record.time} - 点数：${record.result}`
    }).join('\n')
    
    wx.showModal({
      title: '摇骰记录',
      content: recordsText,
      showCancel: false,
      confirmText: '关闭'
    })
  },

  // 查看匹配记录
  viewMatches: function() {
    wx.showModal({
      title: '匹配记录',
      content: '匹配记录功能正在开发中，敬请期待！',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 查看聊天记录
  viewChats: function() {
    wx.showModal({
      title: '聊天记录',
      content: '聊天记录功能正在开发中，敬请期待！',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 查看设置
  viewSettings: function() {
    wx.showActionSheet({
      itemList: ['通知设置', '隐私设置', '清除缓存', '账号设置'],
      success: function(res) {
        switch(res.tapIndex) {
          case 0:
            wx.showToast({
              title: '通知设置功能开发中',
              icon: 'none'
            })
            break
          case 1:
            wx.showToast({
              title: '隐私设置功能开发中',
              icon: 'none'
            })
            break
          case 2:
            wx.showModal({
              title: '清除缓存',
              content: '确定要清除所有缓存数据吗？',
              success: function(modalRes) {
                if (modalRes.confirm) {
                  // 清除缓存但保留用户信息
                  const userInfo = wx.getStorageSync('userInfo')
                  const token = wx.getStorageSync('token')
                  
                  wx.clearStorageSync()
                  
                  wx.setStorageSync('userInfo', userInfo)
                  wx.setStorageSync('token', token)
                  
                  wx.showToast({
                    title: '缓存已清除',
                    icon: 'success'
                  })
                }
              }
            })
            break
          case 3:
            wx.showToast({
              title: '账号设置功能开发中',
              icon: 'none'
            })
            break
        }
      }
    })
  },

  // 查看帮助
  viewHelp: function() {
    wx.showModal({
      title: '帮助与反馈',
      content: '1. 摇动手机或点击骰子开始游戏\n2. 系统会匹配相同点数的异性用户\n3. 聊天消息阅读后会自动销毁\n4. 如有问题请联系客服',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 关于我们
  viewAbout: function() {
    wx.showModal({
      title: '关于缘分骰子',
      content: '版本：1.0.0\n\n缘分骰子是一款基于地理位置的交友小程序，通过摇骰子的趣味方式让用户结识新朋友。\n\n我们致力于为用户提供安全、有趣的社交体验。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 退出登录
  logout: function() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: function(res) {
        if (res.confirm) {
          // 清除用户数据
          app.logout()
        }
      }
    })
  }
})