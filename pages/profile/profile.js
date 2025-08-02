const app = getApp()
const dataDebug = require('../../utils/data-debug.js')

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
    this.initPage()
    this.loadUserStats()
  },

  // 初始化页面
  initPage: function() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
      console.log('个人中心页面用户信息：', userInfo)
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
    console.log('加载的摇骰子记录：', diceRecords)
    
    // 匹配次数 - 从历史记录计算
    const matchRecords = wx.getStorageSync('matchRecords') || []
    
    // 聊天记录 - 从聊天历史计算
    const chatHistories = wx.getStorageSync('chatHistories') || []
    
    // 如果没有数据，创建一些示例数据
    if (diceRecords.length === 0) {
      this.createSampleData()
    }
    
    this.setData({
      totalDiceCount: diceRecords.length,
      matchCount: matchRecords.length,
      chatCount: chatHistories.length
    })
    
    console.log('统计数据更新：', {
      totalDiceCount: diceRecords.length,
      matchCount: matchRecords.length,
      chatCount: chatHistories.length
    })
  },

  // 创建示例数据
  createSampleData: function() {
    const now = Date.now()
    
    // 创建示例摇骰子记录
    const sampleDiceRecords = [
      {
        id: now - 86400000,
        result: 6,
        time: this.formatTime(new Date(now - 86400000)),
        timestamp: now - 86400000
      },
      {
        id: now - 172800000,
        result: 3,
        time: this.formatTime(new Date(now - 172800000)),
        timestamp: now - 172800000
      },
      {
        id: now - 259200000,
        result: 5,
        time: this.formatTime(new Date(now - 259200000)),
        timestamp: now - 259200000
      }
    ]
    
    // 创建示例匹配记录
    const sampleMatchRecords = [
      {
        id: now - 86400000,
        matchUser: { nickName: '小雨', avatarUrl: '../../images/avatar-sample1.jpg' },
        diceResult: 6,
        timestamp: now - 86400000
      },
      {
        id: now - 259200000,
        matchUser: { nickName: '阳光', avatarUrl: '../../images/avatar-sample2.jpg' },
        diceResult: 5,
        timestamp: now - 259200000
      }
    ]
    
    // 创建示例聊天记录
    const sampleChatHistories = [
      {
        userId: 'user001',
        nickName: '小雨',
        lastMessage: '你好呀！',
        timestamp: now - 86400000
      }
    ]
    
    // 保存到本地存储
    wx.setStorageSync('diceRecords', sampleDiceRecords)
    wx.setStorageSync('matchRecords', sampleMatchRecords)
    wx.setStorageSync('chatHistories', sampleChatHistories)
    
    console.log('创建示例数据完成')
  },

  // 格式化时间
  formatTime: function(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  // 编辑资料
  editProfile: function() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    })
  },

  // 查看摇骰记录
  viewHistory: function() {
    const records = wx.getStorageSync('diceRecords') || []
    console.log('查看摇骰记录：', records)
    
    if (records.length === 0) {
      wx.showToast({
        title: '暂无摇骰记录',
        icon: 'none'
      })
      return
    }
    
    // 显示记录列表
    const recordsText = records.map((record, index) => {
      const time = record.time || this.formatTime(new Date(record.timestamp))
      return `${index + 1}. ${time} - 点数：${record.result}`
    }).join('\n')
    
    wx.showModal({
      title: `摇骰记录（共${records.length}条）`,
      content: recordsText,
      showCancel: false,
      confirmText: '关闭'
    })
  },

  // 查看匹配记录
  viewMatches: function() {
    const records = wx.getStorageSync('matchRecords') || []
    console.log('查看匹配记录：', records)
    
    if (records.length === 0) {
      wx.showToast({
        title: '暂无匹配记录',
        icon: 'none'
      })
      return
    }
    
    // 显示匹配记录列表
    const recordsText = records.map((record, index) => {
      const time = record.time || this.formatTime(new Date(record.timestamp))
      const userName = record.matchUser ? record.matchUser.nickName : '未知用户'
      return `${index + 1}. ${time}\n匹配用户：${userName}\n摇骰结果：${record.diceResult}点`
    }).join('\n\n')
    
    wx.showModal({
      title: `匹配记录（共${records.length}条）`,
      content: recordsText,
      showCancel: false,
      confirmText: '关闭'
    })
  },

  // 查看聊天记录
  viewChats: function() {
    const records = wx.getStorageSync('chatHistories') || []
    console.log('查看聊天记录：', records)
    
    if (records.length === 0) {
      wx.showToast({
        title: '暂无聊天记录',
        icon: 'none'
      })
      return
    }
    
    // 显示聊天记录列表
    const recordsText = records.map((record, index) => {
      const time = this.formatTime(new Date(record.timestamp))
      return `${index + 1}. ${record.nickName}\n最后消息：${record.lastMessage}\n时间：${time}`
    }).join('\n\n')
    
    wx.showModal({
      title: `聊天记录（共${records.length}条）`,
      content: recordsText,
      showCancel: false,
      confirmText: '关闭'
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
      content: '版本：2.0.0\n\n缘分骰子是一款基于地理位置的交友小程序，通过摇骰子的趣味方式让用户结识新朋友。\n\n我们致力于为用户提供安全、有趣的社交体验。\n\n长按可进入数据调试模式',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 数据调试 (长按触发)
  onDebugLongPress: function() {
    dataDebug.showDebugModal()
  },

  // 创建测试数据 
  createTestData: function() {
    dataDebug.createTestData()
    
    // 刷新页面数据
    this.initPage()
    this.loadUserStats()
    
    wx.showToast({
      title: '测试数据已创建',
      icon: 'success'
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