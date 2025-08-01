App({
  globalData: {
    userInfo: null,
    openid: null,
    sessionKey: null,
    location: null,
    hasUserInfo: false,
    apiUrl: 'https://your-api-domain.com/api' // 替换为实际的后端API地址
  },

  onLaunch: function () {
    console.log('小程序启动')
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 获取地理位置
    this.getLocation()
    
    // 检查更新
    this.checkForUpdate()
  },

  onShow: function (options) {
    console.log('小程序显示')
  },

  onHide: function () {
    console.log('小程序隐藏')
  },

  onError: function (msg) {
    console.log('小程序错误：', msg)
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.hasUserInfo = true
    } else {
      // 跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login'
      })
    }
  },

  // 获取地理位置
  getLocation: function() {
    const that = this
    wx.getLocation({
      type: 'gcj02',
      success: function(res) {
        that.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy
        }
        
        // 保存位置到本地存储
        wx.setStorageSync('location', that.globalData.location)
      },
      fail: function() {
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        })
      }
    })
  },

  // 检查小程序更新
  checkForUpdate: function() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate(function (res) {
        console.log('检查更新结果：', res.hasUpdate)
      })
      
      updateManager.onUpdateReady(function () {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: function (res) {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      
      updateManager.onUpdateFailed(function () {
        console.log('新版本下载失败')
      })
    }
  },

  // 微信授权登录
  wxLogin: function(callback) {
    const that = this
    
    wx.login({
      success: function(loginRes) {
        if (loginRes.code) {
          // 获取用户信息
          wx.getUserProfile({
            desc: '用于完善用户资料',
            success: function(userRes) {
              // 发送code和用户信息到后端
              wx.request({
                url: that.globalData.apiUrl + '/auth/login',
                method: 'POST',
                data: {
                  code: loginRes.code,
                  userInfo: userRes.userInfo,
                  encryptedData: userRes.encryptedData,
                  iv: userRes.iv
                },
                success: function(res) {
                  if (res.data.success) {
                    // 保存用户信息和token
                    that.globalData.userInfo = res.data.userInfo
                    that.globalData.openid = res.data.openid
                    that.globalData.hasUserInfo = true
                    
                    wx.setStorageSync('token', res.data.token)
                    wx.setStorageSync('userInfo', res.data.userInfo)
                    wx.setStorageSync('openid', res.data.openid)
                    
                    if (callback) callback(true)
                  } else {
                    wx.showToast({
                      title: '登录失败',
                      icon: 'none'
                    })
                    if (callback) callback(false)
                  }
                },
                fail: function() {
                  wx.showToast({
                    title: '网络错误',
                    icon: 'none'
                  })
                  if (callback) callback(false)
                }
              })
            },
            fail: function() {
              wx.showToast({
                title: '授权失败',
                icon: 'none'
              })
              if (callback) callback(false)
            }
          })
        } else {
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          })
          if (callback) callback(false)
        }
      },
      fail: function() {
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        })
        if (callback) callback(false)
      }
    })
  },

  // 退出登录
  logout: function() {
    this.globalData.userInfo = null
    this.globalData.openid = null
    this.globalData.hasUserInfo = false
    
    wx.clearStorageSync()
    
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  // 工具函数：计算两点间距离
  calculateDistance: function(lat1, lon1, lat2, lon2) {
    const R = 6371 // 地球半径(km)
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // 距离(km)
    return Math.round(distance * 1000) // 返回米数
  },

  // 格式化距离显示
  formatDistance: function(distance) {
    if (distance < 1000) {
      return distance + 'm'
    } else if (distance < 10000) {
      return (distance / 1000).toFixed(1) + 'km'
    } else {
      return Math.round(distance / 1000) + 'km'
    }
  }
})