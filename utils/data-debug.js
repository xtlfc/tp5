/**
 * 数据调试工具
 * 用于检查和管理本地存储数据
 */

class DataDebug {
  constructor() {
    this.storageKeys = [
      'userInfo',
      'diceRecords', 
      'matchRecords',
      'chatHistories',
      'privacySettings',
      'blacklist',
      'report_history'
    ]
  }

  // 获取所有存储数据
  getAllData() {
    const data = {}
    
    this.storageKeys.forEach(key => {
      try {
        data[key] = wx.getStorageSync(key) || null
      } catch (error) {
        data[key] = `读取失败: ${error.message}`
      }
    })
    
    return data
  }

  // 打印所有数据到控制台
  logAllData() {
    console.log('=== 本地存储数据检查 ===')
    
    this.storageKeys.forEach(key => {
      try {
        const data = wx.getStorageSync(key)
        console.log(`${key}:`, data)
        console.log(`${key} 数据类型:`, typeof data)
        if (Array.isArray(data)) {
          console.log(`${key} 数组长度:`, data.length)
        }
      } catch (error) {
        console.error(`读取 ${key} 失败:`, error)
      }
    })
    
    console.log('=== 存储空间信息 ===')
    try {
      const info = wx.getStorageInfoSync()
      console.log('存储信息:', info)
    } catch (error) {
      console.error('获取存储信息失败:', error)
    }
  }

  // 清空所有数据
  clearAllData() {
    this.storageKeys.forEach(key => {
      try {
        wx.removeStorageSync(key)
        console.log(`已清空 ${key}`)
      } catch (error) {
        console.error(`清空 ${key} 失败:`, error)
      }
    })
    
    console.log('所有数据已清空')
  }

  // 创建测试数据
  createTestData() {
    const now = Date.now()
    
    // 创建测试用户信息
    const testUserInfo = {
      nickName: '测试用户',
      avatarUrl: '../../images/avatar-placeholder.png',
      gender: 1,
      age: 25,
      province: '北京市',
      city: '北京市',
      area: '朝阳区',
      bio: '这是一个测试用户的个人简介。',
      interests: ['音乐', '电影', '旅行']
    }
    
    // 创建测试摇骰子记录
    const testDiceRecords = [
      {
        id: now - 300000,
        result: 6,
        time: this.formatTime(new Date(now - 300000)),
        timestamp: now - 300000
      },
      {
        id: now - 600000,
        result: 3,
        time: this.formatTime(new Date(now - 600000)),
        timestamp: now - 600000
      },
      {
        id: now - 900000,
        result: 5,
        time: this.formatTime(new Date(now - 900000)),
        timestamp: now - 900000
      },
      {
        id: now - 1200000,
        result: 2,
        time: this.formatTime(new Date(now - 1200000)),
        timestamp: now - 1200000
      },
      {
        id: now - 1500000,
        result: 4,
        time: this.formatTime(new Date(now - 1500000)),
        timestamp: now - 1500000
      }
    ]
    
    // 创建测试匹配记录
    const testMatchRecords = [
      {
        id: now - 300000,
        matchUser: {
          id: 'test_user_001',
          nickName: '小雨',
          avatarUrl: '../../images/avatar-sample1.jpg',
          gender: 2,
          age: 23
        },
        diceResult: 6,
        timestamp: now - 300000,
        time: this.formatTime(new Date(now - 300000))
      },
      {
        id: now - 900000,
        matchUser: {
          id: 'test_user_002',
          nickName: '阳光',
          avatarUrl: '../../images/avatar-sample2.jpg',
          gender: 2,
          age: 26
        },
        diceResult: 5,
        timestamp: now - 900000,
        time: this.formatTime(new Date(now - 900000))
      },
      {
        id: now - 1500000,
        matchUser: {
          id: 'test_user_003',
          nickName: '微风',
          avatarUrl: '../../images/avatar-sample3.jpg',
          gender: 2,
          age: 24
        },
        diceResult: 4,
        timestamp: now - 1500000,
        time: this.formatTime(new Date(now - 1500000))
      }
    ]
    
    // 创建测试聊天历史
    const testChatHistories = [
      {
        userId: 'test_user_001',
        nickName: '小雨',
        avatarUrl: '../../images/avatar-sample1.jpg',
        lastMessage: '你好，很高兴认识你！',
        timestamp: now - 180000
      },
      {
        userId: 'test_user_002',
        nickName: '阳光',
        avatarUrl: '../../images/avatar-sample2.jpg',
        lastMessage: '今天天气真不错呢~',
        timestamp: now - 360000
      },
      {
        userId: 'test_user_003',
        nickName: '微风',
        avatarUrl: '../../images/avatar-sample3.jpg',
        lastMessage: '有空一起去看电影吗？',
        timestamp: now - 540000
      }
    ]
    
    // 创建测试隐私设置
    const testPrivacySettings = {
      showOnlineStatus: true,
      allowStrangerChat: true,
      showDistance: true
    }
    
    // 保存测试数据
    try {
      wx.setStorageSync('userInfo', testUserInfo)
      wx.setStorageSync('diceRecords', testDiceRecords)
      wx.setStorageSync('matchRecords', testMatchRecords)
      wx.setStorageSync('chatHistories', testChatHistories)
      wx.setStorageSync('privacySettings', testPrivacySettings)
      
      console.log('测试数据创建完成')
      return true
    } catch (error) {
      console.error('创建测试数据失败:', error)
      return false
    }
  }

  // 格式化时间
  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  // 验证数据完整性
  validateData() {
    const issues = []
    
    // 检查用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      issues.push('用户信息缺失')
    } else {
      if (!userInfo.nickName) issues.push('用户昵称缺失')
      if (!userInfo.gender) issues.push('用户性别缺失')
    }
    
    // 检查摇骰子记录
    const diceRecords = wx.getStorageSync('diceRecords')
    if (Array.isArray(diceRecords)) {
      diceRecords.forEach((record, index) => {
        if (!record.result) issues.push(`摇骰记录${index + 1}缺少结果`)
        if (!record.timestamp) issues.push(`摇骰记录${index + 1}缺少时间戳`)
      })
    }
    
    // 检查匹配记录
    const matchRecords = wx.getStorageSync('matchRecords')
    if (Array.isArray(matchRecords)) {
      matchRecords.forEach((record, index) => {
        if (!record.matchUser) issues.push(`匹配记录${index + 1}缺少匹配用户`)
        if (!record.diceResult) issues.push(`匹配记录${index + 1}缺少骰子结果`)
      })
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    }
  }

  // 修复数据问题
  fixData() {
    console.log('开始修复数据...')
    
    // 确保基础数据结构存在
    if (!wx.getStorageSync('diceRecords')) {
      wx.setStorageSync('diceRecords', [])
    }
    
    if (!wx.getStorageSync('matchRecords')) {
      wx.setStorageSync('matchRecords', [])
    }
    
    if (!wx.getStorageSync('chatHistories')) {
      wx.setStorageSync('chatHistories', [])
    }
    
    // 如果没有用户信息，创建默认用户信息
    if (!wx.getStorageSync('userInfo')) {
      const defaultUserInfo = {
        nickName: '新用户',
        avatarUrl: '../../images/avatar-placeholder.png',
        gender: 1,
        age: 25
      }
      wx.setStorageSync('userInfo', defaultUserInfo)
      
      // 同时更新全局数据
      const app = getApp()
      if (app) {
        app.globalData.userInfo = defaultUserInfo
      }
    }
    
    console.log('数据修复完成')
  }

  // 导出数据
  exportData() {
    const data = this.getAllData()
    const dataStr = JSON.stringify(data, null, 2)
    
    console.log('导出数据:', dataStr)
    
    // 可以复制到剪贴板或保存到文件
    wx.setClipboardData({
      data: dataStr,
      success: () => {
        console.log('数据已复制到剪贴板')
      }
    })
    
    return dataStr
  }

  // 导入数据
  importData(dataStr) {
    try {
      const data = JSON.parse(dataStr)
      
      Object.keys(data).forEach(key => {
        if (this.storageKeys.includes(key) && data[key] !== null) {
          wx.setStorageSync(key, data[key])
        }
      })
      
      console.log('数据导入完成')
      return true
    } catch (error) {
      console.error('数据导入失败:', error)
      return false
    }
  }

  // 显示调试界面
  showDebugModal() {
    const data = this.getAllData()
    const validation = this.validateData()
    
    let content = '=== 数据统计 ===\n'
    content += `摇骰记录: ${(data.diceRecords || []).length} 条\n`
    content += `匹配记录: ${(data.matchRecords || []).length} 条\n`
    content += `聊天记录: ${(data.chatHistories || []).length} 条\n`
    content += `用户信息: ${data.userInfo ? '已设置' : '未设置'}\n\n`
    
    if (!validation.isValid) {
      content += '=== 数据问题 ===\n'
      content += validation.issues.join('\n')
    } else {
      content += '数据完整性: ✓ 正常'
    }
    
    wx.showModal({
      title: '数据调试信息',
      content: content,
      confirmText: '修复数据',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.fixData()
          wx.showToast({
            title: '数据已修复',
            icon: 'success'
          })
        }
      }
    })
  }
}

// 创建单例实例
const dataDebug = new DataDebug()

// 添加全局调试方法
if (typeof global !== 'undefined') {
  global.debugData = dataDebug
} else if (typeof window !== 'undefined') {
  window.debugData = dataDebug
}

module.exports = dataDebug