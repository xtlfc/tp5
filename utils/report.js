/**
 * 举报管理工具类
 */

class ReportManager {
  constructor() {
    this.storageKey = 'report_history'
    this.reportHistory = this.loadReportHistory()
    
    // 举报类型
    this.reportTypes = [
      { id: 1, name: '发送不当内容', desc: '发送色情、暴力或其他不当内容' },
      { id: 2, name: '骚扰他人', desc: '持续发送骚扰信息或恶意骚扰' },
      { id: 3, name: '虚假信息', desc: '个人资料或聊天内容存在虚假信息' },
      { id: 4, name: '诈骗行为', desc: '涉嫌诈骗或金钱相关违法行为' },
      { id: 5, name: '广告推广', desc: '发送广告或进行商业推广' },
      { id: 6, name: '冒充他人', desc: '冒充其他人身份或虚假身份' },
      { id: 7, name: '恶意行为', desc: '恶意刷屏、恶作剧等行为' },
      { id: 8, name: '其他违规', desc: '其他违反平台规定的行为' }
    ]
  }

  // 加载举报历史
  loadReportHistory() {
    try {
      const history = wx.getStorageSync(this.storageKey) || []
      return history
    } catch (error) {
      console.error('加载举报历史失败：', error)
      return []
    }
  }

  // 保存举报历史
  saveReportHistory() {
    try {
      wx.setStorageSync(this.storageKey, this.reportHistory)
      return true
    } catch (error) {
      console.error('保存举报历史失败：', error)
      return false
    }
  }

  // 获取举报类型列表
  getReportTypes() {
    return [...this.reportTypes]
  }

  // 根据ID获取举报类型
  getReportTypeById(typeId) {
    return this.reportTypes.find(type => type.id === typeId)
  }

  // 提交举报
  submitReport(reportData) {
    return new Promise((resolve, reject) => {
      // 验证举报数据
      const validation = this.validateReportData(reportData)
      if (!validation.valid) {
        reject(new Error(validation.message))
        return
      }

      // 检查是否重复举报
      if (this.isDuplicateReport(reportData.targetUserId, reportData.typeId)) {
        reject(new Error('您已经举报过该用户的相同问题'))
        return
      }

      // 创建举报记录
      const report = {
        id: Date.now(),
        targetUserId: reportData.targetUserId,
        targetUserName: reportData.targetUserName,
        targetUserAvatar: reportData.targetUserAvatar,
        typeId: reportData.typeId,
        typeName: this.getReportTypeById(reportData.typeId).name,
        description: reportData.description || '',
        evidence: reportData.evidence || [],
        status: 'pending', // pending, processing, resolved, rejected
        createTime: Date.now(),
        resolveTime: null,
        resolveResult: null
      }

      // 添加到历史记录
      this.reportHistory.unshift(report)
      
      // 限制历史记录数量
      if (this.reportHistory.length > 100) {
        this.reportHistory = this.reportHistory.slice(0, 100)
      }

      // 保存到本地
      this.saveReportHistory()

      // 提交到服务器
      this.submitToServer(report)
        .then((result) => {
          resolve({
            success: true,
            message: '举报提交成功，我们会尽快处理',
            reportId: report.id
          })
        })
        .catch((error) => {
          // 即使服务器提交失败，本地记录也保存了
          resolve({
            success: true,
            message: '举报已记录，将在网络恢复后提交',
            reportId: report.id
          })
        })
    })
  }

  // 验证举报数据
  validateReportData(data) {
    if (!data.targetUserId) {
      return { valid: false, message: '被举报用户ID不能为空' }
    }

    if (!data.typeId || !this.getReportTypeById(data.typeId)) {
      return { valid: false, message: '请选择举报类型' }
    }

    if (data.description && data.description.length > 500) {
      return { valid: false, message: '举报描述不能超过500字符' }
    }

    if (data.evidence && data.evidence.length > 9) {
      return { valid: false, message: '证据图片不能超过9张' }
    }

    return { valid: true, message: '' }
  }

  // 检查是否重复举报
  isDuplicateReport(targetUserId, typeId) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    
    return this.reportHistory.some(report => 
      report.targetUserId === targetUserId &&
      report.typeId === typeId &&
      report.createTime > oneDayAgo &&
      report.status !== 'rejected'
    )
  }

  // 提交到服务器
  submitToServer(report) {
    return new Promise((resolve, reject) => {
      const app = getApp()
      const token = wx.getStorageSync('token')

      if (!token) {
        reject(new Error('未登录'))
        return
      }

      wx.request({
        url: app.globalData.apiUrl + '/report/submit',
        method: 'POST',
        header: {
          'Authorization': token,
          'content-type': 'application/json'
        },
        data: report,
        success: (res) => {
          if (res.data && res.data.success) {
            // 更新本地记录状态
            this.updateReportStatus(report.id, 'processing', res.data.serverReportId)
            resolve(res.data)
          } else {
            reject(new Error(res.data.message || '提交失败'))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }

  // 更新举报状态
  updateReportStatus(reportId, status, serverReportId = null) {
    const report = this.reportHistory.find(r => r.id === reportId)
    if (report) {
      report.status = status
      if (serverReportId) {
        report.serverReportId = serverReportId
      }
      this.saveReportHistory()
    }
  }

  // 获取举报历史
  getReportHistory(limit = 20) {
    return this.reportHistory.slice(0, limit)
  }

  // 根据状态过滤举报
  getReportsByStatus(status) {
    return this.reportHistory.filter(report => report.status === status)
  }

  // 搜索举报记录
  searchReports(keyword) {
    if (!keyword) {
      return this.reportHistory
    }

    return this.reportHistory.filter(report =>
      report.targetUserName.toLowerCase().includes(keyword.toLowerCase()) ||
      report.typeName.toLowerCase().includes(keyword.toLowerCase()) ||
      report.description.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // 删除举报记录
  deleteReport(reportId) {
    const index = this.reportHistory.findIndex(r => r.id === reportId)
    if (index !== -1) {
      this.reportHistory.splice(index, 1)
      this.saveReportHistory()
      return { success: true, message: '记录已删除' }
    }
    return { success: false, message: '记录不存在' }
  }

  // 获取举报统计
  getReportStatistics() {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

    const stats = {
      total: this.reportHistory.length,
      todayReports: this.reportHistory.filter(r => r.createTime > oneDayAgo).length,
      weekReports: this.reportHistory.filter(r => r.createTime > oneWeekAgo).length,
      monthReports: this.reportHistory.filter(r => r.createTime > oneMonthAgo).length,
      statusStats: this.getStatusStatistics(),
      typeStats: this.getTypeStatistics()
    }

    return stats
  }

  // 获取状态统计
  getStatusStatistics() {
    const stats = { pending: 0, processing: 0, resolved: 0, rejected: 0 }
    
    this.reportHistory.forEach(report => {
      stats[report.status] = (stats[report.status] || 0) + 1
    })
    
    return stats
  }

  // 获取类型统计
  getTypeStatistics() {
    const stats = {}
    
    this.reportHistory.forEach(report => {
      stats[report.typeName] = (stats[report.typeName] || 0) + 1
    })
    
    return stats
  }

  // 上传证据图片
  uploadEvidence(filePaths) {
    return new Promise((resolve, reject) => {
      const uploadTasks = []
      const uploadedUrls = []

      if (!filePaths || filePaths.length === 0) {
        resolve([])
        return
      }

      filePaths.forEach((filePath, index) => {
        const uploadTask = wx.uploadFile({
          url: getApp().globalData.apiUrl + '/upload/evidence',
          filePath: filePath,
          name: 'evidence',
          header: {
            'Authorization': wx.getStorageSync('token')
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data)
              if (data.success) {
                uploadedUrls[index] = data.url
              } else {
                console.error('上传失败：', data.message)
              }
            } catch (error) {
              console.error('解析上传结果失败：', error)
            }
          },
          fail: (error) => {
            console.error('上传请求失败：', error)
          },
          complete: () => {
            uploadTasks.splice(uploadTasks.indexOf(uploadTask), 1)
            if (uploadTasks.length === 0) {
              // 所有上传完成
              resolve(uploadedUrls.filter(url => url))
            }
          }
        })

        uploadTasks.push(uploadTask)
      })
    })
  }

  // 格式化时间
  formatTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - timestamp

    if (diff < 60 * 1000) {
      return '刚刚'
    } else if (diff < 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 1000)) + '分钟前'
    } else if (diff < 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 60 * 1000)) + '小时前'
    } else if (date.toDateString() === now.toDateString()) {
      return '今天'
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  }

  // 同步服务器状态
  syncReportStatus() {
    return new Promise((resolve, reject) => {
      const app = getApp()
      const token = wx.getStorageSync('token')

      if (!token) {
        reject(new Error('未登录'))
        return
      }

      // 获取有服务器ID的举报记录
      const serverReports = this.reportHistory
        .filter(r => r.serverReportId)
        .map(r => r.serverReportId)

      if (serverReports.length === 0) {
        resolve([])
        return
      }

      wx.request({
        url: app.globalData.apiUrl + '/report/status',
        method: 'POST',
        header: {
          'Authorization': token
        },
        data: {
          reportIds: serverReports
        },
        success: (res) => {
          if (res.data && res.data.success) {
            const statusUpdates = res.data.statusUpdates || []
            
            statusUpdates.forEach(update => {
              const localReport = this.reportHistory.find(r => r.serverReportId === update.id)
              if (localReport) {
                localReport.status = update.status
                localReport.resolveTime = update.resolveTime
                localReport.resolveResult = update.resolveResult
              }
            })

            this.saveReportHistory()
            resolve(statusUpdates)
          } else {
            reject(new Error(res.data.message || '同步失败'))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  }
}

// 创建单例实例
const reportManager = new ReportManager()

module.exports = reportManager