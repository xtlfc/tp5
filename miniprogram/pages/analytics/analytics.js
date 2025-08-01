// pages/analytics/analytics.js
const app = getApp()
const { cloudFunctionManager } = require('../../utils/network/request')
const { analyticsManager } = require('../../utils/analytics/analytics')

Page({
  data: {
    isRefreshing: false,
    
    // 总体统计
    overview: {
      totalRolls: 0,
      totalMatches: 0,
      totalMessages: 0,
      totalCalls: 0
    },
    
    // 今日统计
    todayStats: {
      rolls: 0,
      matches: 0,
      messages: 0,
      calls: 0
    },
    
    // 匹配分析
    matchRate: 0,
    avgDistance: 0,
    mostCommonDice: 0,
    
    // 活跃时间
    activityTime: [],
    
    // 使用趋势
    usageTrend: [],
    
    // 功能排行
    featureRanking: []
  },

  onLoad() {
    this.loadAnalytics()
  },

  onShow() {
    this.loadAnalytics()
  },

  // 加载数据分析
  async loadAnalytics() {
    try {
      await Promise.all([
        this.loadOverview(),
        this.loadTodayStats(),
        this.loadMatchAnalysis(),
        this.loadActivityTime(),
        this.loadUsageTrend(),
        this.loadFeatureRanking()
      ])
    } catch (error) {
      console.error('加载数据分析失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载总体统计
  async loadOverview() {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.openid

      // 获取摇骰子次数
      const rollsRes = await db.collection('rollHistory').where({
        userId: userId
      }).count()

      // 获取匹配次数
      const matchesRes = await db.collection('matches').where({
        $or: [
          { userId1: userId },
          { userId2: userId }
        ]
      }).count()

      // 获取消息数
      const messagesRes = await db.collection('messages').where({
        senderId: userId
      }).count()

      // 获取通话次数
      const callsRes = await db.collection('calls').where({
        $or: [
          { callerId: userId },
          { calleeId: userId }
        ]
      }).count()

      this.setData({
        overview: {
          totalRolls: rollsRes.total,
          totalMatches: matchesRes.total,
          totalMessages: messagesRes.total,
          totalCalls: callsRes.total
        }
      })

    } catch (error) {
      console.error('加载总体统计失败:', error)
    }
  },

  // 加载今日统计
  async loadTodayStats() {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.openid
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 今日摇骰子次数
      const rollsRes = await db.collection('rollHistory').where({
        userId: userId,
        rollTime: db.command.gte(today)
      }).count()

      // 今日匹配次数
      const matchesRes = await db.collection('matches').where({
        $or: [
          { userId1: userId },
          { userId2: userId }
        ],
        matchTime: db.command.gte(today)
      }).count()

      // 今日消息数
      const messagesRes = await db.collection('messages').where({
        senderId: userId,
        sendTime: db.command.gte(today)
      }).count()

      // 今日通话次数
      const callsRes = await db.collection('calls').where({
        $or: [
          { callerId: userId },
          { calleeId: userId }
        ],
        startTime: db.command.gte(today)
      }).count()

      this.setData({
        todayStats: {
          rolls: rollsRes.total,
          matches: matchesRes.total,
          messages: messagesRes.total,
          calls: callsRes.total
        }
      })

    } catch (error) {
      console.error('加载今日统计失败:', error)
    }
  },

  // 加载匹配分析
  async loadMatchAnalysis() {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.openid

      // 获取所有摇骰子记录
      const rollsRes = await db.collection('rollHistory').where({
        userId: userId
      }).get()

      // 获取所有匹配记录
      const matchesRes = await db.collection('matches').where({
        $or: [
          { userId1: userId },
          { userId2: userId }
        ]
      }).get()

      // 计算匹配成功率
      const totalRolls = rollsRes.data.length
      const totalMatches = matchesRes.data.length
      const matchRate = totalRolls > 0 ? Math.round((totalMatches / totalRolls) * 100) : 0

      // 计算平均距离
      const distances = matchesRes.data.map(match => match.distance || 0)
      const avgDistance = distances.length > 0 ? 
        Math.round(distances.reduce((sum, d) => sum + d, 0) / distances.length) : 0

      // 计算最常摇出的点数
      const diceCounts = {}
      rollsRes.data.forEach(roll => {
        const dice = roll.diceNumber
        diceCounts[dice] = (diceCounts[dice] || 0) + 1
      })
      
      let mostCommonDice = 1
      let maxCount = 0
      Object.entries(diceCounts).forEach(([dice, count]) => {
        if (count > maxCount) {
          maxCount = count
          mostCommonDice = parseInt(dice)
        }
      })

      this.setData({
        matchRate,
        avgDistance,
        mostCommonDice
      })

    } catch (error) {
      console.error('加载匹配分析失败:', error)
    }
  },

  // 加载活跃时间
  async loadActivityTime() {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.openid

      // 获取最近7天的活动记录
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const activityRes = await db.collection('rollHistory').where({
        userId: userId,
        rollTime: db.command.gte(sevenDaysAgo)
      }).get()

      // 统计每小时的活动次数
      const hourCounts = new Array(24).fill(0)
      activityRes.data.forEach(activity => {
        const hour = new Date(activity.rollTime).getHours()
        hourCounts[hour]++
      })

      // 计算百分比
      const maxCount = Math.max(...hourCounts)
      const activityTime = hourCounts.map((count, hour) => ({
        hour: hour.toString().padStart(2, '0'),
        count,
        percentage: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
      }))

      this.setData({ activityTime })

    } catch (error) {
      console.error('加载活跃时间失败:', error)
    }
  },

  // 加载使用趋势
  async loadUsageTrend() {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.openid

      // 获取最近7天的数据
      const usageTrend = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)

        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        // 获取当天的摇骰子次数
        const rollsRes = await db.collection('rollHistory').where({
          userId: userId,
          rollTime: db.command.gte(date).and(db.command.lt(nextDate))
        }).count()

        usageTrend.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          value: rollsRes.total,
          percentage: 0 // 稍后计算
        })
      }

      // 计算百分比
      const maxValue = Math.max(...usageTrend.map(item => item.value))
      usageTrend.forEach(item => {
        item.percentage = maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0
      })

      this.setData({ usageTrend })

    } catch (error) {
      console.error('加载使用趋势失败:', error)
    }
  },

  // 加载功能排行
  async loadFeatureRanking() {
    try {
      const db = wx.cloud.database()
      const userId = app.globalData.openid

      // 统计各功能使用次数
      const features = [
        { name: '摇骰子', icon: '🎲', collection: 'rollHistory', field: 'userId' },
        { name: '聊天', icon: '💬', collection: 'messages', field: 'senderId' },
        { name: '视频通话', icon: '📹', collection: 'calls', field: 'callerId', type: 'video' },
        { name: '语音通话', icon: '📞', collection: 'calls', field: 'callerId', type: 'voice' }
      ]

      const featureCounts = await Promise.all(
        features.map(async (feature) => {
          let query = { [feature.field]: userId }
          if (feature.type) {
            query.callType = feature.type
          }

          const res = await db.collection(feature.collection).where(query).count()
          return {
            ...feature,
            count: res.total
          }
        })
      )

      // 计算百分比
      const totalCount = featureCounts.reduce((sum, feature) => sum + feature.count, 0)
      const featureRanking = featureCounts
        .map(feature => ({
          ...feature,
          percentage: totalCount > 0 ? Math.round((feature.count / totalCount) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)

      this.setData({ featureRanking })

    } catch (error) {
      console.error('加载功能排行失败:', error)
    }
  },

  // 刷新数据
  async refreshData() {
    if (this.data.isRefreshing) return

    this.setData({ isRefreshing: true })

    try {
      await this.loadAnalytics()
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('刷新数据失败:', error)
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isRefreshing: false })
    }
  }
})