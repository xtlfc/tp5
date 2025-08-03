// pages/profile/profile.js
const app = getApp()

Page({
  data: {
    userInfo: {},
    openid: '',
    location: null,
    locationEnabled: false,
    totalRolls: 0,
    totalMatches: 0,
    todayRolls: 0,
    todayMatches: 0
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
      userInfo: app.globalData.userInfo,
      openid: app.globalData.openid,
      location: app.globalData.location
    })

    this.loadUserData()
    this.checkLocationPermission()
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
          totalRolls: user.totalRolls || 0,
          totalMatches: user.matchCount || 0,
          todayRolls: user.todayRolls || 0,
          todayMatches: user.todayMatches || 0
        })
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
    }
  },

  // 检查位置权限
  async checkLocationPermission() {
    try {
      const setting = await wx.getSetting()
      this.setData({
        locationEnabled: setting.authSetting['scope.userLocation'] || false
      })
    } catch (error) {
      console.error('检查位置权限失败:', error)
    }
  },

  // 切换位置权限
  async toggleLocation(e) {
    const enabled = e.detail.value
    
    if (enabled) {
      try {
        await wx.authorize({
          scope: 'scope.userLocation'
        })
        
        // 获取位置
        await app.getUserLocation()
        
        this.setData({
          locationEnabled: true,
          location: app.globalData.location
        })

        wx.showToast({
          title: '位置权限已开启',
          icon: 'success'
        })

      } catch (error) {
        console.error('开启位置权限失败:', error)
        this.setData({ locationEnabled: false })
        
        wx.showModal({
          title: '位置权限',
          content: '请在设置中手动开启位置权限',
          showCancel: false
        })
      }
    } else {
      this.setData({ locationEnabled: false })
      wx.showToast({
        title: '位置权限已关闭',
        icon: 'none'
      })
    }
  },

  // 编辑资料
  editProfile() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    })
  },

  // 显示数据统计
  showAnalytics() {
    wx.navigateTo({
      url: '/pages/analytics/analytics'
    })
  },

  // 显示黑名单
  showBlacklist() {
    wx.navigateTo({
      url: '/pages/blacklist/blacklist'
    })
  },

  // 显示设置
  showSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 显示摇骰子历史
  showRollHistory() {
    wx.showModal({
      title: '摇骰子历史',
      content: `总摇骰子: ${this.data.totalRolls}次\n今日摇骰子: ${this.data.todayRolls}次`,
      showCancel: false
    })
  },

  // 显示匹配历史
  showMatchHistory() {
    wx.showModal({
      title: '匹配历史',
      content: `总匹配: ${this.data.totalMatches}次\n今日匹配: ${this.data.todayMatches}次`,
      showCancel: false
    })
  },

  // 显示设置
  showSettings() {
    wx.showActionSheet({
      itemList: ['清除缓存', '重置数据', '恢复默认设置'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.clearCache()
            break
          case 1:
            this.resetData()
            break
          case 2:
            this.resetSettings()
            break
        }
      }
    })
  },

  // 显示关于我们
  showAbout() {
    wx.showModal({
      title: '关于摇骰子交友',
      content: '版本: 1.0.0\n\n通过摇骰子匹配到志同道合的朋友，让交友变得更有趣！\n\n消息看完即销毁，保护您的隐私安全。',
      showCancel: false
    })
  },

  // 清除缓存
  async clearCache() {
    try {
      await wx.clearStorage()
      wx.showToast({
        title: '缓存已清除',
        icon: 'success'
      })
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  },

  // 重置数据
  resetData() {
    wx.showModal({
      title: '确认重置',
      content: '此操作将清除所有本地数据，确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          // 这里可以添加重置数据的逻辑
          wx.showToast({
            title: '数据已重置',
            icon: 'success'
          })
        }
      }
    })
  },

  // 重置设置
  resetSettings() {
    wx.showModal({
      title: '确认重置',
      content: '此操作将恢复所有默认设置，确定要继续吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            locationEnabled: false
          })
          wx.showToast({
            title: '设置已重置',
            icon: 'success'
          })
        }
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('openid')
          
          app.globalData.isLoggedIn = false
          app.globalData.userInfo = null
          app.globalData.openid = null

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })

          // 跳转到登录页
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            })
          }, 1500)
        }
      }
    })
  }
})