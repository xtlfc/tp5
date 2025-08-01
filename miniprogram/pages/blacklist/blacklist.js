// pages/blacklist/blacklist.js
const app = getApp()
const { cloudFunctionManager } = require('../../utils/network/request')
const { analyticsManager } = require('../../utils/analytics/analytics')

Page({
  data: {
    blacklist: [],
    selectedItems: [],
    isAllSelected: false,
    hasSelection: false
  },

  onLoad() {
    this.loadBlacklist()
  },

  onShow() {
    this.loadBlacklist()
  },

  // 加载黑名单
  async loadBlacklist() {
    try {
      const db = wx.cloud.database()
      const blacklistRes = await db.collection('blacklist').where({
        userId: app.globalData.openid
      }).orderBy('blockTime', 'desc').get()

      // 获取被屏蔽用户的信息
      const blacklistWithUsers = await Promise.all(
        blacklistRes.data.map(async (item) => {
          const userRes = await db.collection('users').where({
            openid: item.blockedUserId
          }).get()

          const userInfo = userRes.data[0] || {}
          
          return {
            id: item._id,
            blockedUserId: item.blockedUserId,
            userInfo: {
              openid: userInfo.openid,
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl
            },
            reason: item.reason,
            blockTime: item.blockTime,
            blockTimeText: this.formatTime(item.blockTime)
          }
        })
      )

      this.setData({ blacklist: blacklistWithUsers })

    } catch (error) {
      console.error('加载黑名单失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 解除屏蔽单个用户
  async unblockUser(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认解除屏蔽',
      content: '确定要解除对此用户的屏蔽吗？',
      success: async (res) => {
        if (res.confirm) {
          await this.removeFromBlacklist(id)
        }
      }
    })
  },

  // 批量解除屏蔽
  async batchUnblock() {
    if (this.data.selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要解除屏蔽的用户',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '批量解除屏蔽',
      content: `确定要解除对 ${this.data.selectedItems.length} 个用户的屏蔽吗？`,
      success: async (res) => {
        if (res.confirm) {
          await this.batchRemoveFromBlacklist()
        }
      }
    })
  },

  // 全选/取消全选
  selectAll() {
    const isAllSelected = !this.data.isAllSelected
    const selectedItems = isAllSelected ? this.data.blacklist.map(item => item.id) : []
    
    this.setData({
      isAllSelected,
      selectedItems,
      hasSelection: selectedItems.length > 0
    })
  },

  // 选择单个项目
  selectItem(e) {
    const id = e.currentTarget.dataset.id
    const selectedItems = [...this.data.selectedItems]
    const index = selectedItems.indexOf(id)
    
    if (index > -1) {
      selectedItems.splice(index, 1)
    } else {
      selectedItems.push(id)
    }
    
    const isAllSelected = selectedItems.length === this.data.blacklist.length
    
    this.setData({
      selectedItems,
      isAllSelected,
      hasSelection: selectedItems.length > 0
    })
  },

  // 从黑名单中移除单个用户
  async removeFromBlacklist(id) {
    try {
      const db = wx.cloud.database()
      await db.collection('blacklist').doc(id).remove()

      // 更新本地数据
      const blacklist = this.data.blacklist.filter(item => item.id !== id)
      this.setData({ blacklist })

      // 记录分析事件
      const item = this.data.blacklist.find(item => item.id === id)
      if (item) {
        analyticsManager.trackBlacklist({
          action: 'remove',
          targetUserId: item.blockedUserId
        })
      }

      wx.showToast({
        title: '已解除屏蔽',
        icon: 'success'
      })

    } catch (error) {
      console.error('解除屏蔽失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 批量从黑名单中移除
  async batchRemoveFromBlacklist() {
    try {
      const db = wx.cloud.database()
      
      // 批量删除
      const deletePromises = this.data.selectedItems.map(id => 
        db.collection('blacklist').doc(id).remove()
      )
      
      await Promise.all(deletePromises)

      // 更新本地数据
      const blacklist = this.data.blacklist.filter(item => 
        !this.data.selectedItems.includes(item.id)
      )
      
      this.setData({
        blacklist,
        selectedItems: [],
        isAllSelected: false,
        hasSelection: false
      })

      // 记录分析事件
      analyticsManager.trackBlacklist({
        action: 'batch_remove',
        count: this.data.selectedItems.length
      })

      wx.showToast({
        title: '批量解除成功',
        icon: 'success'
      })

    } catch (error) {
      console.error('批量解除屏蔽失败:', error)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 格式化时间
  formatTime(date) {
    const now = new Date()
    const blockTime = new Date(date)
    const diff = now - blockTime
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}小时前`
    } else if (diff < 604800000) { // 1周内
      return `${Math.floor(diff / 86400000)}天前`
    } else {
      return blockTime.toLocaleDateString()
    }
  }
})