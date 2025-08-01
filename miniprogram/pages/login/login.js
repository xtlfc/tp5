// pages/login/login.js
const app = getApp()

Page({
  data: {
    isLoading: false
  },

  onLoad() {
    // 检查是否已登录
    if (app.globalData.isLoggedIn) {
      this.redirectToIndex()
    }
  },

  // 获取用户信息
  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      this.setData({ isLoading: true })
      this.login(e.detail.userInfo)
    } else {
      wx.showToast({
        title: '需要授权才能使用',
        icon: 'none'
      })
    }
  },

  // 登录处理
  async login(userInfo) {
    try {
      // 获取微信登录凭证
      const loginRes = await wx.login()
      
      // 调用云函数登录
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: {
          code: loginRes.code,
          userInfo: userInfo
        }
      })

      if (result.result.success) {
        // 保存用户信息
        const { openid, token } = result.result
        wx.setStorageSync('token', token)
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('openid', openid)
        
        app.globalData.isLoggedIn = true
        app.globalData.userInfo = userInfo
        app.globalData.openid = openid

        // 获取位置权限
        await this.requestLocationPermission()

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })

        // 跳转到首页
        setTimeout(() => {
          this.redirectToIndex()
        }, 1500)

      } else {
        throw new Error(result.result.message || '登录失败')
      }

    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 请求位置权限
  async requestLocationPermission() {
    try {
      const setting = await wx.getSetting()
      
      if (!setting.authSetting['scope.userLocation']) {
        await wx.authorize({
          scope: 'scope.userLocation'
        })
      }

      // 获取用户位置
      await app.getUserLocation()

    } catch (error) {
      console.error('获取位置权限失败:', error)
      wx.showModal({
        title: '位置权限',
        content: '需要获取您的位置信息来匹配附近用户，请在设置中开启位置权限',
        showCancel: false
      })
    }
  },

  // 跳转到首页
  redirectToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.showModal({
      title: '用户协议和隐私政策',
      content: '我们承诺保护您的隐私信息，仅用于匹配功能，不会泄露给第三方。',
      showCancel: false
    })
  }
})