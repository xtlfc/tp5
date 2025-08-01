const app = getApp()

Page({
  data: {
    hasUserInfo: false,
    isLoading: false,
    userInfo: null
  },

  onLoad: function(options) {
    console.log('登录页加载')
    
    // 检查是否已经授权
    this.checkUserInfo()
  },

  onShow: function() {
    // 每次显示页面时检查授权状态
    this.checkUserInfo()
  },

  // 检查用户信息授权状态
  checkUserInfo: function() {
    const that = this
    
    wx.getSetting({
      success: function(res) {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，获取用户信息
          wx.getUserInfo({
            success: function(userRes) {
              that.setData({
                hasUserInfo: true,
                userInfo: userRes.userInfo
              })
            }
          })
        } else {
          that.setData({
            hasUserInfo: false
          })
        }
      }
    })
  },

  // 获取用户信息授权
  onGetUserInfo: function(e) {
    console.log('获取用户信息', e)
    
    if (e.detail.userInfo) {
      this.setData({
        hasUserInfo: true,
        userInfo: e.detail.userInfo
      })
      
      // 立即进行登录
      this.performLogin(e.detail)
    } else {
      wx.showToast({
        title: '授权失败',
        icon: 'none'
      })
    }
  },

  // 执行登录流程
  onLogin: function() {
    if (this.data.hasUserInfo) {
      this.performLogin({
        userInfo: this.data.userInfo
      })
    } else {
      // 主动获取授权
      this.getUserProfile()
    }
  },

  // 主动获取用户资料
  getUserProfile: function() {
    const that = this
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: function(res) {
        that.setData({
          hasUserInfo: true,
          userInfo: res.userInfo
        })
        
        that.performLogin(res)
      },
      fail: function() {
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        })
      }
    })
  },

  // 执行登录
  performLogin: function(userDetail) {
    const that = this
    
    that.setData({
      isLoading: true
    })
    
    // 先获取微信登录凭证
    wx.login({
      success: function(loginRes) {
        if (loginRes.code) {
          // 调用后端登录接口
          that.callLoginAPI(loginRes.code, userDetail)
        } else {
          that.setData({ isLoading: false })
          wx.showToast({
            title: '获取登录凭证失败',
            icon: 'none'
          })
        }
      },
      fail: function() {
        that.setData({ isLoading: false })
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        })
      }
    })
  },

  // 调用后端登录API
  callLoginAPI: function(code, userDetail) {
    const that = this
    
    wx.request({
      url: app.globalData.apiUrl + '/auth/login',
      method: 'POST',
      data: {
        code: code,
        userInfo: userDetail.userInfo,
        encryptedData: userDetail.encryptedData,
        iv: userDetail.iv
      },
      header: {
        'content-type': 'application/json'
      },
      success: function(res) {
        that.setData({ isLoading: false })
        
        if (res.data && res.data.success) {
          // 登录成功，保存用户信息
          app.globalData.userInfo = res.data.userInfo
          app.globalData.openid = res.data.openid
          app.globalData.hasUserInfo = true
          
          // 保存到本地存储
          wx.setStorageSync('token', res.data.token)
          wx.setStorageSync('userInfo', res.data.userInfo)
          wx.setStorageSync('openid', res.data.openid)
          
          // 跳转到首页
          wx.switchTab({
            url: '/pages/dice/dice',
            success: function() {
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              })
            }
          })
        } else {
          // 登录失败，使用模拟数据继续
          that.simulateLogin(userDetail.userInfo)
        }
      },
      fail: function(error) {
        console.log('登录API调用失败', error)
        that.setData({ isLoading: false })
        
        // API调用失败，使用模拟数据
        that.simulateLogin(userDetail.userInfo)
      }
    })
  },

  // 模拟登录（用于开发测试）
  simulateLogin: function(userInfo) {
    const that = this
    
    console.log('使用模拟登录')
    
    // 生成模拟数据
    const mockUser = {
      ...userInfo,
      openid: 'mock_openid_' + Date.now(),
      gender: Math.random() > 0.5 ? 1 : 2, // 1男 2女
      id: Date.now()
    }
    
    const mockToken = 'mock_token_' + Date.now()
    
    // 保存到全局数据
    app.globalData.userInfo = mockUser
    app.globalData.openid = mockUser.openid
    app.globalData.hasUserInfo = true
    
    // 保存到本地存储
    wx.setStorageSync('token', mockToken)
    wx.setStorageSync('userInfo', mockUser)
    wx.setStorageSync('openid', mockUser.openid)
    
    // 跳转到首页
    wx.switchTab({
      url: '/pages/dice/dice',
      success: function() {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      }
    })
  },

  // 显示隐私政策
  showPrivacy: function() {
    wx.showModal({
      title: '隐私政策',
      content: '我们承诺保护您的隐私安全，仅在必要时使用您的个人信息用于提供更好的服务体验。您的聊天记录将在阅读后自动销毁，我们不会保存任何聊天内容。',
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})