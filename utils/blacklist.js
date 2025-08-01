/**
 * 黑名单管理工具类
 */

class BlacklistManager {
  constructor() {
    this.storageKey = 'blacklist'
    this.blacklist = this.loadBlacklist()
  }

  // 加载黑名单
  loadBlacklist() {
    try {
      const blacklist = wx.getStorageSync(this.storageKey) || []
      return blacklist
    } catch (error) {
      console.error('加载黑名单失败：', error)
      return []
    }
  }

  // 保存黑名单
  saveBlacklist() {
    try {
      wx.setStorageSync(this.storageKey, this.blacklist)
      return true
    } catch (error) {
      console.error('保存黑名单失败：', error)
      return false
    }
  }

  // 添加到黑名单
  addToBlacklist(user) {
    if (!user || !user.id) {
      return { success: false, message: '用户信息无效' }
    }

    // 检查是否已在黑名单中
    if (this.isBlocked(user.id)) {
      return { success: false, message: '用户已在黑名单中' }
    }

    // 添加到黑名单
    const blacklistItem = {
      id: user.id,
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      addTime: Date.now(),
      reason: user.reason || '其他'
    }

    this.blacklist.unshift(blacklistItem)
    
    // 限制黑名单数量（最多500个）
    if (this.blacklist.length > 500) {
      this.blacklist = this.blacklist.slice(0, 500)
    }

    // 保存到本地
    const saved = this.saveBlacklist()
    
    if (saved) {
      // 同步到服务器
      this.syncToServer('add', blacklistItem)
      return { success: true, message: '已添加到黑名单' }
    } else {
      return { success: false, message: '保存失败' }
    }
  }

  // 从黑名单移除
  removeFromBlacklist(userId) {
    if (!userId) {
      return { success: false, message: '用户ID无效' }
    }

    const index = this.blacklist.findIndex(item => item.id === userId)
    
    if (index === -1) {
      return { success: false, message: '用户不在黑名单中' }
    }

    const removedItem = this.blacklist.splice(index, 1)[0]
    
    // 保存到本地
    const saved = this.saveBlacklist()
    
    if (saved) {
      // 同步到服务器
      this.syncToServer('remove', removedItem)
      return { success: true, message: '已从黑名单移除' }
    } else {
      return { success: false, message: '保存失败' }
    }
  }

  // 检查用户是否被拉黑
  isBlocked(userId) {
    return this.blacklist.some(item => item.id === userId)
  }

  // 获取黑名单列表
  getBlacklist() {
    return [...this.blacklist]
  }

  // 获取黑名单数量
  getBlacklistCount() {
    return this.blacklist.length
  }

  // 清空黑名单
  clearBlacklist() {
    this.blacklist = []
    const saved = this.saveBlacklist()
    
    if (saved) {
      // 同步到服务器
      this.syncToServer('clear')
      return { success: true, message: '黑名单已清空' }
    } else {
      return { success: false, message: '清空失败' }
    }
  }

  // 搜索黑名单
  searchBlacklist(keyword) {
    if (!keyword) {
      return this.blacklist
    }

    return this.blacklist.filter(item => 
      item.nickName.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // 过滤匹配结果（移除黑名单用户）
  filterMatches(matches) {
    return matches.filter(match => !this.isBlocked(match.id))
  }

  // 过滤聊天列表（移除黑名单用户）
  filterChats(chats) {
    return chats.filter(chat => !this.isBlocked(chat.userId))
  }

  // 同步到服务器
  syncToServer(action, data = null) {
    const app = getApp()
    const token = wx.getStorageSync('token')
    
    if (!token) {
      console.warn('未登录，无法同步黑名单到服务器')
      return
    }

    const requestData = {
      action: action,
      data: data,
      timestamp: Date.now()
    }

    wx.request({
      url: app.globalData.apiUrl + '/blacklist/sync',
      method: 'POST',
      header: {
        'Authorization': token
      },
      data: requestData,
      success: (res) => {
        if (res.data && res.data.success) {
          console.log('黑名单同步成功')
        } else {
          console.warn('黑名单同步失败：', res.data.message)
        }
      },
      fail: (error) => {
        console.error('黑名单同步请求失败：', error)
      }
    })
  }

  // 从服务器同步黑名单
  syncFromServer() {
    return new Promise((resolve, reject) => {
      const app = getApp()
      const token = wx.getStorageSync('token')
      
      if (!token) {
        reject(new Error('未登录'))
        return
      }

      wx.request({
        url: app.globalData.apiUrl + '/blacklist/get',
        method: 'GET',
        header: {
          'Authorization': token
        },
        success: (res) => {
          if (res.data && res.data.success) {
            const serverBlacklist = res.data.blacklist || []
            
            // 合并本地和服务器的黑名单
            this.mergeBlacklist(serverBlacklist)
            
            resolve(this.blacklist)
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

  // 合并黑名单
  mergeBlacklist(serverBlacklist) {
    const mergedMap = new Map()
    
    // 添加本地黑名单
    this.blacklist.forEach(item => {
      mergedMap.set(item.id, item)
    })
    
    // 添加服务器黑名单
    serverBlacklist.forEach(item => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item)
      }
    })
    
    // 转换为数组并按时间排序
    this.blacklist = Array.from(mergedMap.values())
      .sort((a, b) => b.addTime - a.addTime)
    
    // 保存合并后的黑名单
    this.saveBlacklist()
  }

  // 批量添加到黑名单
  batchAddToBlacklist(users) {
    const results = []
    
    users.forEach(user => {
      const result = this.addToBlacklist(user)
      results.push({
        user: user,
        result: result
      })
    })
    
    return results
  }

  // 批量移除黑名单
  batchRemoveFromBlacklist(userIds) {
    const results = []
    
    userIds.forEach(userId => {
      const result = this.removeFromBlacklist(userId)
      results.push({
        userId: userId,
        result: result
      })
    })
    
    return results
  }

  // 获取统计信息
  getStatistics() {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

    return {
      total: this.blacklist.length,
      todayAdded: this.blacklist.filter(item => item.addTime > oneDayAgo).length,
      weekAdded: this.blacklist.filter(item => item.addTime > oneWeekAgo).length,
      monthAdded: this.blacklist.filter(item => item.addTime > oneMonthAgo).length,
      genderStats: this.getGenderStatistics(),
      reasonStats: this.getReasonStatistics()
    }
  }

  // 获取性别统计
  getGenderStatistics() {
    const stats = { male: 0, female: 0, unknown: 0 }
    
    this.blacklist.forEach(item => {
      if (item.gender === 1) {
        stats.male++
      } else if (item.gender === 2) {
        stats.female++
      } else {
        stats.unknown++
      }
    })
    
    return stats
  }

  // 获取拉黑原因统计
  getReasonStatistics() {
    const stats = {}
    
    this.blacklist.forEach(item => {
      const reason = item.reason || '其他'
      stats[reason] = (stats[reason] || 0) + 1
    })
    
    return stats
  }
}

// 创建单例实例
const blacklistManager = new BlacklistManager()

module.exports = blacklistManager