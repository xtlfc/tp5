const app = getApp()

Page({
  data: {
    userInfo: {},
    originalUserInfo: {},
    bioLength: 0,
    customInterest: '',
    isSaving: false,
    
    // 年龄选择数据
    ageRange: [],
    ageIndex: 0,
    
    // 地区选择
    regionValue: ['北京市', '北京市', '朝阳区'],
    
    // 兴趣爱好列表
    interestsList: [
      { id: 1, name: '音乐', selected: false },
      { id: 2, name: '电影', selected: false },
      { id: 3, name: '旅行', selected: false },
      { id: 4, name: '美食', selected: false },
      { id: 5, name: '运动', selected: false },
      { id: 6, name: '读书', selected: false },
      { id: 7, name: '摄影', selected: false },
      { id: 8, name: '游戏', selected: false },
      { id: 9, name: '购物', selected: false },
      { id: 10, name: '瑜伽', selected: false },
      { id: 11, name: '健身', selected: false },
      { id: 12, name: '绘画', selected: false }
    ],
    
    // 隐私设置
    privacySettings: {
      showOnlineStatus: true,
      allowStrangerChat: true,
      showDistance: true
    }
  },

  onLoad: function(options) {
    console.log('资料编辑页面加载')
    this.initPage()
  },

  // 初始化页面
  initPage: function() {
    // 获取用户信息
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    
    if (!userInfo) {
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 初始化年龄数据
    const ageRange = []
    for (let i = 18; i <= 60; i++) {
      ageRange.push(i + '岁')
    }

    // 设置数据
    this.setData({
      userInfo: { ...userInfo },
      originalUserInfo: { ...userInfo },
      bioLength: (userInfo.bio || '').length,
      ageRange: ageRange,
      ageIndex: userInfo.age ? userInfo.age - 18 : 0
    })

    // 加载用户兴趣
    this.loadUserInterests()
    
    // 加载隐私设置
    this.loadPrivacySettings()
  },

  // 加载用户兴趣
  loadUserInterests: function() {
    const userInterests = this.data.userInfo.interests || []
    const interestsList = this.data.interestsList.map(item => ({
      ...item,
      selected: userInterests.includes(item.name)
    }))
    
    this.setData({ interestsList })
  },

  // 加载隐私设置
  loadPrivacySettings: function() {
    const settings = wx.getStorageSync('privacySettings') || this.data.privacySettings
    this.setData({ privacySettings: settings })
  },

  // 更换头像
  changeAvatar: function() {
    const that = this
    
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: function(res) {
        let sourceType = []
        if (res.tapIndex === 0) {
          sourceType = ['album']
        } else if (res.tapIndex === 1) {
          sourceType = ['camera']
        }
        
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: sourceType,
          success: function(res) {
            const tempFilePath = res.tempFilePaths[0]
            
            // 更新头像
            that.setData({
              'userInfo.avatarUrl': tempFilePath
            })
            
            // 上传头像到服务器
            that.uploadAvatar(tempFilePath)
          }
        })
      }
    })
  },

  // 上传头像
  uploadAvatar: function(filePath) {
    wx.showLoading({ title: '上传中...' })
    
    // 这里应该上传到服务器，暂时模拟
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    }, 2000)
  },

  // 昵称输入
  onNickNameInput: function(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    })
  },

  // 选择性别
  selectGender: function(e) {
    const gender = parseInt(e.currentTarget.dataset.gender)
    this.setData({
      'userInfo.gender': gender
    })
  },

  // 年龄选择
  onAgeChange: function(e) {
    const ageIndex = e.detail.value
    const age = parseInt(this.data.ageRange[ageIndex])
    
    this.setData({
      ageIndex: ageIndex,
      'userInfo.age': age
    })
  },

  // 地区选择
  onRegionChange: function(e) {
    const regionValue = e.detail.value
    this.setData({
      regionValue: regionValue,
      'userInfo.province': regionValue[0],
      'userInfo.city': regionValue[1],
      'userInfo.area': regionValue[2]
    })
  },

  // 个人简介输入
  onBioInput: function(e) {
    const bio = e.detail.value
    this.setData({
      'userInfo.bio': bio,
      bioLength: bio.length
    })
  },

  // 切换兴趣
  toggleInterest: function(e) {
    const interestId = e.currentTarget.dataset.id
    const interestsList = this.data.interestsList.map(item => {
      if (item.id === interestId) {
        item.selected = !item.selected
      }
      return item
    })
    
    this.setData({ interestsList })
  },

  // 自定义兴趣输入
  onCustomInterestInput: function(e) {
    this.setData({
      customInterest: e.detail.value
    })
  },

  // 添加自定义兴趣
  addCustomInterest: function() {
    const customInterest = this.data.customInterest.trim()
    
    if (!customInterest) return
    
    // 检查是否已存在
    const exists = this.data.interestsList.some(item => item.name === customInterest)
    if (exists) {
      wx.showToast({
        title: '兴趣已存在',
        icon: 'none'
      })
      return
    }
    
    // 添加到列表
    const newInterest = {
      id: Date.now(),
      name: customInterest,
      selected: true
    }
    
    const interestsList = [...this.data.interestsList, newInterest]
    
    this.setData({
      interestsList: interestsList,
      customInterest: ''
    })
  },

  // 隐私设置变更
  onShowOnlineChange: function(e) {
    this.setData({
      'privacySettings.showOnlineStatus': e.detail.value
    })
  },

  onAllowStrangerChange: function(e) {
    this.setData({
      'privacySettings.allowStrangerChat': e.detail.value
    })
  },

  onShowDistanceChange: function(e) {
    this.setData({
      'privacySettings.showDistance': e.detail.value
    })
  },

  // 保存资料
  saveProfile: function() {
    // 验证必填字段
    if (!this.validateForm()) {
      return
    }
    
    this.setData({ isSaving: true })
    
    // 整理用户兴趣
    const selectedInterests = this.data.interestsList
      .filter(item => item.selected)
      .map(item => item.name)
    
    const userInfo = {
      ...this.data.userInfo,
      interests: selectedInterests
    }
    
    // 保存到服务器
    this.saveToServer(userInfo)
  },

  // 表单验证
  validateForm: function() {
    const { userInfo } = this.data
    
    if (!userInfo.nickName || userInfo.nickName.trim().length === 0) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return false
    }
    
    if (userInfo.nickName.length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'none'
      })
      return false
    }
    
    if (!userInfo.gender) {
      wx.showToast({
        title: '请选择性别',
        icon: 'none'
      })
      return false
    }
    
    if (!userInfo.age) {
      wx.showToast({
        title: '请选择年龄',
        icon: 'none'
      })
      return false
    }
    
    return true
  },

  // 保存到服务器
  saveToServer: function(userInfo) {
    const that = this
    
    // 直接保存到本地，因为没有真实的后端服务器
    console.log('保存用户信息：', userInfo)
    
    // 模拟网络请求延迟
    setTimeout(() => {
      that.setData({ isSaving: false })
      
      try {
        // 更新全局用户信息
        app.globalData.userInfo = { ...userInfo }
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('privacySettings', that.data.privacySettings)
        
        // 触发个人中心页面数据更新
        wx.setStorageSync('profileUpdated', Date.now())
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        
      } catch (error) {
        console.error('保存用户信息失败：', error)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    }, 1000)
  },

  // 保存到本地
  saveToLocal: function(userInfo) {
    app.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('privacySettings', this.data.privacySettings)
    
    wx.showToast({
      title: '保存成功（本地）',
      icon: 'success'
    })
    
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  // 取消编辑
  cancelEdit: function() {
    // 检查是否有修改
    if (this.hasChanges()) {
      wx.showModal({
        title: '提示',
        content: '您有未保存的修改，确定要离开吗？',
        success: function(res) {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  // 检查是否有修改
  hasChanges: function() {
    const current = JSON.stringify(this.data.userInfo)
    const original = JSON.stringify(this.data.originalUserInfo)
    return current !== original
  },

  // 页面卸载时的处理
  onUnload: function() {
    // 清理定时器等资源
  }
})