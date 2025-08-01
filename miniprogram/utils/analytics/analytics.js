// utils/analytics/analytics.js

const { cloudFunctionManager } = require('../network/request')

class AnalyticsManager {
  constructor() {
    this.events = []
    this.maxEvents = 100 // 最大事件数量
    this.batchSize = 20 // 批量发送大小
    this.flushInterval = 30000 // 30秒自动发送
    this.isFlushing = false
    
    // 启动定时发送
    this.startAutoFlush()
  }

  // 记录事件
  track(eventName, properties = {}) {
    const event = {
      eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    }

    this.events.push(event)

    // 检查是否需要发送
    if (this.events.length >= this.batchSize) {
      this.flush()
    }

    // 检查事件数量限制
    if (this.events.length >= this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents / 2)
    }
  }

  // 记录页面访问
  trackPageView(pageName, properties = {}) {
    this.track('page_view', {
      pageName,
      ...properties
    })
  }

  // 记录用户行为
  trackUserAction(action, properties = {}) {
    this.track('user_action', {
      action,
      ...properties
    })
  }

  // 记录错误
  trackError(error, properties = {}) {
    this.track('error', {
      error: error.message || error,
      stack: error.stack,
      ...properties
    })
  }

  // 记录性能数据
  trackPerformance(metric, value, properties = {}) {
    this.track('performance', {
      metric,
      value,
      ...properties
    })
  }

  // 记录匹配事件
  trackMatch(matchData) {
    this.track('match', {
      diceNumber: matchData.diceNumber,
      distance: matchData.distance,
      matchTime: matchData.matchTime,
      isSuccess: matchData.isSuccess
    })
  }

  // 记录聊天事件
  trackChat(chatData) {
    this.track('chat', {
      messageType: chatData.type,
      messageLength: chatData.content?.length || 0,
      chatDuration: chatData.duration,
      messageCount: chatData.messageCount
    })
  }

  // 记录通话事件
  trackCall(callData) {
    this.track('call', {
      callType: callData.type, // 'video' | 'voice'
      duration: callData.duration,
      isIncoming: callData.isIncoming,
      status: callData.status // 'started' | 'ended' | 'missed' | 'rejected'
    })
  }

  // 记录用户资料更新
  trackProfileUpdate(updateData) {
    this.track('profile_update', {
      fields: Object.keys(updateData),
      hasAvatar: !!updateData.avatarUrl,
      hasLocation: !!updateData.location
    })
  }

  // 记录举报事件
  trackReport(reportData) {
    this.track('report', {
      reportType: reportData.type,
      targetUserId: reportData.targetUserId,
      reason: reportData.reason
    })
  }

  // 记录黑名单操作
  trackBlacklist(blacklistData) {
    this.track('blacklist', {
      action: blacklistData.action, // 'add' | 'remove'
      targetUserId: blacklistData.targetUserId
    })
  }

  // 获取会话ID
  getSessionId() {
    let sessionId = wx.getStorageSync('analytics_session_id')
    if (!sessionId) {
      sessionId = this.generateId()
      wx.setStorageSync('analytics_session_id', sessionId)
    }
    return sessionId
  }

  // 获取用户ID
  getUserId() {
    const app = getApp()
    return app.globalData.openid || 'anonymous'
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // 发送事件到服务器
  async flush() {
    if (this.isFlushing || this.events.length === 0) {
      return
    }

    this.isFlushing = true
    const eventsToSend = [...this.events]
    this.events = []

    try {
      await cloudFunctionManager.callFunction('analytics', {
        action: 'track',
        events: eventsToSend
      })
    } catch (error) {
      console.error('Analytics flush failed:', error)
      // 失败时恢复事件
      this.events = [...eventsToSend, ...this.events]
    } finally {
      this.isFlushing = false
    }
  }

  // 启动自动发送
  startAutoFlush() {
    setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  // 手动发送
  async send() {
    await this.flush()
  }

  // 获取统计信息
  getStats() {
    return {
      eventCount: this.events.length,
      isFlushing: this.isFlushing,
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    }
  }
}

// 性能监控
class PerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.analytics = null
  }

  // 设置分析器
  setAnalytics(analytics) {
    this.analytics = analytics
  }

  // 开始计时
  startTimer(name) {
    this.metrics[name] = {
      startTime: Date.now(),
      endTime: null,
      duration: null
    }
  }

  // 结束计时
  endTimer(name) {
    if (this.metrics[name] && this.metrics[name].startTime) {
      this.metrics[name].endTime = Date.now()
      this.metrics[name].duration = this.metrics[name].endTime - this.metrics[name].startTime
      
      if (this.analytics) {
        this.analytics.trackPerformance(name, this.metrics[name].duration)
      }
    }
  }

  // 记录内存使用
  trackMemoryUsage() {
    const systemInfo = wx.getSystemInfoSync()
    if (this.analytics) {
      this.analytics.trackPerformance('memory_usage', {
        totalMemory: systemInfo.totalMemory,
        availableMemory: systemInfo.availableMemory
      })
    }
  }

  // 记录网络性能
  trackNetworkPerformance(url, duration, status) {
    if (this.analytics) {
      this.analytics.trackPerformance('network_request', {
        url,
        duration,
        status
      })
    }
  }

  // 记录页面加载性能
  trackPageLoadPerformance(pageName, loadTime) {
    if (this.analytics) {
      this.analytics.trackPerformance('page_load', {
        pageName,
        loadTime
      })
    }
  }
}

// 用户行为分析
class UserBehaviorAnalyzer {
  constructor(analytics) {
    this.analytics = analytics
    this.userJourney = []
    this.sessionStartTime = Date.now()
  }

  // 记录用户路径
  trackUserJourney(action, properties = {}) {
    this.userJourney.push({
      action,
      properties,
      timestamp: Date.now(),
      sessionTime: Date.now() - this.sessionStartTime
    })

    // 限制路径长度
    if (this.userJourney.length > 50) {
      this.userJourney = this.userJourney.slice(-25)
    }
  }

  // 分析用户行为模式
  analyzeBehavior() {
    const patterns = {
      mostUsedFeature: this.getMostUsedFeature(),
      averageSessionTime: this.getAverageSessionTime(),
      commonPaths: this.getCommonPaths(),
      dropOffPoints: this.getDropOffPoints()
    }

    if (this.analytics) {
      this.analytics.track('behavior_analysis', patterns)
    }

    return patterns
  }

  // 获取最常用功能
  getMostUsedFeature() {
    const featureCount = {}
    this.userJourney.forEach(journey => {
      const feature = journey.action
      featureCount[feature] = (featureCount[feature] || 0) + 1
    })

    return Object.entries(featureCount)
      .sort(([,a], [,b]) => b - a)[0] || ['none', 0]
  }

  // 获取平均会话时间
  getAverageSessionTime() {
    if (this.userJourney.length === 0) return 0
    
    const totalTime = this.userJourney[this.userJourney.length - 1].sessionTime
    return totalTime / this.userJourney.length
  }

  // 获取常见路径
  getCommonPaths() {
    const paths = []
    for (let i = 0; i < this.userJourney.length - 1; i++) {
      paths.push(`${this.userJourney[i].action} -> ${this.userJourney[i + 1].action}`)
    }
    return paths
  }

  // 获取流失点
  getDropOffPoints() {
    // 这里可以实现更复杂的流失点分析逻辑
    return []
  }
}

// 创建实例
const analyticsManager = new AnalyticsManager()
const performanceMonitor = new PerformanceMonitor()
const userBehaviorAnalyzer = new UserBehaviorAnalyzer(analyticsManager)

// 设置性能监控的分析器
performanceMonitor.setAnalytics(analyticsManager)

module.exports = {
  analyticsManager,
  performanceMonitor,
  userBehaviorAnalyzer,
  AnalyticsManager,
  PerformanceMonitor,
  UserBehaviorAnalyzer
}