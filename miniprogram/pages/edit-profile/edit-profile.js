// pages/edit-profile/edit-profile.js
const app = getApp()
const { cloudFunctionManager } = require('../../utils/network/request')
const { analyticsManager } = require('../../utils/analytics/analytics')

Page({
  data: {
    userInfo: {},
    isSaving: false,
    
    // 选择器选项
    genderOptions: ['男', '女'],
    genderIndex: 0,
    ageOptions: [],
    ageIndex: 0,
    region: ['', '', ''],
    regionText: '请选择城市',
    
    // 兴趣爱好选项
    hobbyOptions: [
      { id: 1, name: '音乐', selected: false },
      { id: 2, name: '电影', selected: false },
      { id: 3, name: '阅读', selected: false },
      { id: 4, name: '运动', selected: false },
      { id: 5, name: '旅行', selected: false },
      { id: 6, name: '美食', selected: false },
      { id: 7, name: '摄影', selected: false },
      { id: 8, name: '游戏', selected: false },
      { id: 9, name: '绘画', selected: false },
      { id: 10, name: '舞蹈', selected: false }
    ]
  },

  onLoad() {
    this.initAgeOptions()
    this.loadUserInfo()
  },

  // 初始化年龄选项
  initAgeOptions() {
    const ageOptions = []
    for (let i = 18; i <= 60; i++) {
      ageOptions.push(`${i}岁`)
    }
    this.setData({ ageOptions })
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('users').where({
        openid: app.globalData.openid
      }).get()

      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        
        // 设置性别索引
        const genderIndex = user.gender === 1 ? 0 : 1
        
        // 设置年龄索引
        const age = user.age || 25
        const ageIndex = Math.max(0, Math.min(age - 18, 42))
        
        // 设置地区
        const region = user.region || ['', '', '']
        const regionText = region.join(' ') || '请选择城市'
        
        // 设置兴趣爱好
        const hobbyOptions = this.data.hobbyOptions.map(hobby => ({
          ...hobby,
          selected: user.hobbies && user.hobbies.includes(hobby.id)
        }))

        this.setData({
          userInfo: {
            ...user,
            bio: user.bio || '',
            locationVisible: user.locationVisible !== false,
            onlineVisible: user.onlineVisible !== false
          },
          genderIndex,
          ageIndex,
          region,
          regionText,
          hobbyOptions
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 选择头像
  async chooseAvatar() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const tempFilePath = res.tempFilePaths[0]
      
      // 显示上传进度
      wx.showLoading({ title: '上传中...' })

      // 上传头像
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${app.globalData.openid}_${Date.now()}.jpg`,
        filePath: tempFilePath
      })

      this.setData({
        'userInfo.avatarUrl': uploadRes.fileID
      })

      wx.hideLoading()
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })

    } catch (error) {
      wx.hideLoading()
      console.error('选择头像失败:', error)
      wx.showToast({
        title: '头像上传失败',
        icon: 'none'
      })
    }
  },

  // 昵称变化
  onNickNameChange(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    })
  },

  // 性别变化
  onGenderChange(e) {
    this.setData({
      genderIndex: e.detail.value
    })
  },

  // 年龄变化
  onAgeChange(e) {
    this.setData({
      ageIndex: e.detail.value
    })
  },

  // 地区变化
  onRegionChange(e) {
    const region = e.detail.value
    const regionText = region.join(' ')
    
    this.setData({
      region,
      regionText
    })
  },

  // 个人介绍变化
  onBioChange(e) {
    this.setData({
      'userInfo.bio': e.detail.value
    })
  },

  // 切换兴趣爱好
  toggleHobby(e) {
    const id = e.currentTarget.dataset.id
    const hobbyOptions = this.data.hobbyOptions.map(hobby => {
      if (hobby.id === id) {
        return { ...hobby, selected: !hobby.selected }
      }
      return hobby
    })

    this.setData({ hobbyOptions })
  },

  // 位置可见性变化
  onLocationVisibleChange(e) {
    this.setData({
      'userInfo.locationVisible': e.detail.value
    })
  },

  // 在线状态可见性变化
  onOnlineVisibleChange(e) {
    this.setData({
      'userInfo.onlineVisible': e.detail.value
    })
  },

  // 保存资料
  async saveProfile() {
    if (this.data.isSaving) return

    // 验证必填字段
    if (!this.data.userInfo.nickName || !this.data.userInfo.nickName.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    this.setData({ isSaving: true })

    try {
      // 准备更新数据
      const updateData = {
        nickName: this.data.userInfo.nickName.trim(),
        gender: this.data.genderIndex === 0 ? 1 : 2,
        age: this.data.ageIndex + 18,
        region: this.data.region,
        bio: this.data.userInfo.bio,
        hobbies: this.data.hobbyOptions
          .filter(hobby => hobby.selected)
          .map(hobby => hobby.id),
        locationVisible: this.data.userInfo.locationVisible,
        onlineVisible: this.data.userInfo.onlineVisible,
        updateTime: new Date()
      }

      // 如果有新头像，添加到更新数据中
      if (this.data.userInfo.avatarUrl && this.data.userInfo.avatarUrl !== app.globalData.userInfo.avatarUrl) {
        updateData.avatarUrl = this.data.userInfo.avatarUrl
      }

      // 更新数据库
      const db = wx.cloud.database()
      await db.collection('users').where({
        openid: app.globalData.openid
      }).update({
        data: updateData
      })

      // 更新全局数据
      app.globalData.userInfo = {
        ...app.globalData.userInfo,
        ...updateData
      }

      // 记录分析事件
      analyticsManager.trackProfileUpdate(updateData)

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('保存资料失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isSaving: false })
    }
  }
})