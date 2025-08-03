// pages/settings/settings.js
const app = getApp()

Page({
  data: {
    userInfo: {}
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
  },

  // 账户信息设置
  goToAccountSettings() {
    wx.navigateTo({
      url: '/pages/account-settings/account-settings'
    })
  },

  // 隐私设置
  goToPrivacySettings() {
    wx.navigateTo({
      url: '/pages/privacy-settings/privacy-settings'
    })
  },

  // 通知设置
  goToNotificationSettings() {
    wx.navigateTo({
      url: '/pages/notification-settings/notification-settings'
    })
  },

  // 外观设置
  goToAppearanceSettings() {
    wx.navigateTo({
      url: '/pages/appearance-settings/appearance-settings'
    })
  },

  // 语言设置
  goToLanguageSettings() {
    wx.navigateTo({
      url: '/pages/language-settings/language-settings'
    })
  },

  // 存储管理
  goToStorageSettings() {
    wx.navigateTo({
      url: '/pages/storage-settings/storage-settings'
    })
  },

  // 安全中心
  goToSecuritySettings() {
    wx.navigateTo({
      url: '/pages/security-settings/security-settings'
    })
  },

  // 黑名单管理
  goToBlockedUsers() {
    wx.navigateTo({
      url: '/pages/blacklist/blacklist'
    })
  },

  // 帮助中心
  goToHelpCenter() {
    wx.navigateTo({
      url: '/pages/help-center/help-center'
    })
  },

  // 意见反馈
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 关于我们
  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地数据
          wx.clearStorageSync()
          
          // 重置全局数据
          app.globalData = {
            isLoggedIn: false,
            openid: '',
            userInfo: {}
          }

          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })
  }
})