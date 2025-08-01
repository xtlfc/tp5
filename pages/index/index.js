const app = getApp()

Page({
  onLoad: function(options) {
    console.log('首页加载')
    
    // 检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      // 已登录，跳转到摇骰子页
      wx.switchTab({
        url: '/pages/dice/dice'
      })
    } else {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login'
      })
    }
  }
})