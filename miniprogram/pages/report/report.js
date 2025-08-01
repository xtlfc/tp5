// pages/report/report.js
const app = getApp()
const { cloudFunctionManager } = require('../../utils/network/request')
const { analyticsManager } = require('../../utils/analytics/analytics')

Page({
  data: {
    reportedUser: {},
    selectedType: null,
    reportDetail: '',
    evidenceImages: [],
    contactInfo: '',
    isSubmitting: false,
    
    // 举报类型选项
    reportTypes: [
      {
        id: 1,
        name: '骚扰行为',
        description: '包括言语骚扰、恶意骚扰等',
        icon: '🚫'
      },
      {
        id: 2,
        name: '虚假信息',
        description: '发布虚假个人信息或照片',
        icon: '❌'
      },
      {
        id: 3,
        name: '不当内容',
        description: '发布色情、暴力等不当内容',
        icon: '⚠️'
      },
      {
        id: 4,
        name: '诈骗行为',
        description: '涉及金钱诈骗或虚假承诺',
        icon: '💰'
      },
      {
        id: 5,
        name: '恶意举报',
        description: '恶意举报其他用户',
        icon: '🎯'
      },
      {
        id: 6,
        name: '其他',
        description: '其他违规行为',
        icon: '📝'
      }
    ]
  },

  onLoad(options) {
    const { userId } = options
    if (userId) {
      this.loadReportedUser(userId)
    }
  },

  // 加载被举报用户信息
  async loadReportedUser(userId) {
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('users').where({
        openid: userId
      }).get()

      if (userRes.data.length > 0) {
        this.setData({
          reportedUser: userRes.data[0]
        })
      } else {
        wx.showToast({
          title: '用户不存在',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 选择举报类型
  selectReportType(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedType: id })
  },

  // 举报详情变化
  onDetailChange(e) {
    this.setData({
      reportDetail: e.detail.value
    })
  },

  // 联系方式变化
  onContactChange(e) {
    this.setData({
      contactInfo: e.detail.value
    })
  },

  // 选择证据图片
  async chooseEvidence() {
    try {
      const res = await wx.chooseImage({
        count: 4 - this.data.evidenceImages.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      // 检查文件大小
      for (const filePath of res.tempFilePaths) {
        const fileInfo = await wx.getFileInfo({
          filePath: filePath
        })
        
        if (fileInfo.size > 5 * 1024 * 1024) { // 5MB
          wx.showToast({
            title: '图片大小不能超过5MB',
            icon: 'none'
          })
          return
        }
      }

      this.setData({
        evidenceImages: [...this.data.evidenceImages, ...res.tempFilePaths]
      })

    } catch (error) {
      console.error('选择图片失败:', error)
    }
  },

  // 移除证据图片
  removeEvidence(e) {
    const index = e.currentTarget.dataset.index
    const evidenceImages = [...this.data.evidenceImages]
    evidenceImages.splice(index, 1)
    this.setData({ evidenceImages })
  },

  // 上传证据图片
  async uploadEvidenceImages() {
    if (this.data.evidenceImages.length === 0) {
      return []
    }

    wx.showLoading({ title: '上传图片中...' })

    try {
      const uploadPromises = this.data.evidenceImages.map(async (filePath, index) => {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `reports/${app.globalData.openid}_${Date.now()}_${index}.jpg`,
          filePath: filePath
        })
        return uploadRes.fileID
      })

      const uploadedImages = await Promise.all(uploadPromises)
      wx.hideLoading()
      return uploadedImages

    } catch (error) {
      wx.hideLoading()
      console.error('上传图片失败:', error)
      throw new Error('图片上传失败')
    }
  },

  // 提交举报
  async submitReport() {
    if (this.data.isSubmitting) return

    // 验证必填字段
    if (!this.data.selectedType) {
      wx.showToast({
        title: '请选择举报类型',
        icon: 'none'
      })
      return
    }

    if (!this.data.reportDetail || !this.data.reportDetail.trim()) {
      wx.showToast({
        title: '请填写举报详情',
        icon: 'none'
      })
      return
    }

    this.setData({ isSubmitting: true })

    try {
      // 上传证据图片
      let evidenceUrls = []
      if (this.data.evidenceImages.length > 0) {
        evidenceUrls = await this.uploadEvidenceImages()
      }

      // 准备举报数据
      const reportData = {
        reporterId: app.globalData.openid,
        reportedUserId: this.data.reportedUser.openid,
        reportType: this.data.selectedType,
        reportDetail: this.data.reportDetail.trim(),
        evidenceUrls: evidenceUrls,
        contactInfo: this.data.contactInfo.trim(),
        status: 'pending', // pending, processing, resolved, rejected
        createTime: new Date(),
        updateTime: new Date()
      }

      // 保存到数据库
      const db = wx.cloud.database()
      await db.collection('reports').add({
        data: reportData
      })

      // 记录分析事件
      analyticsManager.trackReport({
        type: this.data.selectedType,
        targetUserId: this.data.reportedUser.openid,
        reason: this.data.reportDetail.trim()
      })

      wx.showToast({
        title: '举报提交成功',
        icon: 'success'
      })

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('提交举报失败:', error)
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  }
})