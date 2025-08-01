// cloudfunctions/analytics/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, events } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'track':
        return await trackEvents(events)
      case 'getStats':
        return await getAnalyticsStats(wxContext.OPENID)
      case 'getUserBehavior':
        return await getUserBehavior(wxContext.OPENID)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('数据分析云函数错误:', error)
    return { success: false, message: error.message }
  }
}

// 记录事件
async function trackEvents(events) {
  try {
    if (!Array.isArray(events)) {
      events = [events]
    }

    // 批量保存事件到数据库
    const eventPromises = events.map(event => {
      return db.collection('analytics_events').add({
        data: {
          ...event,
          createTime: new Date()
        }
      })
    })

    await Promise.all(eventPromises)

    // 更新用户统计
    await updateUserStats(events)

    return { success: true, count: events.length }
  } catch (error) {
    console.error('记录事件失败:', error)
    throw error
  }
}

// 更新用户统计
async function updateUserStats(events) {
  try {
    const userId = events[0]?.userId
    if (!userId) return

    // 获取用户统计记录
    const statsRes = await db.collection('user_stats').where({
      userId: userId
    }).get()

    let stats = statsRes.data[0] || {
      userId: userId,
      totalEvents: 0,
      lastEventTime: null,
      eventCounts: {},
      createTime: new Date()
    }

    // 更新统计
    events.forEach(event => {
      stats.totalEvents++
      stats.lastEventTime = event.timestamp || new Date()
      
      // 统计事件类型
      const eventType = event.eventName
      stats.eventCounts[eventType] = (stats.eventCounts[eventType] || 0) + 1
    })

    stats.updateTime = new Date()

    // 保存或更新统计
    if (statsRes.data.length > 0) {
      await db.collection('user_stats').doc(statsRes.data[0]._id).update({
        data: stats
      })
    } else {
      await db.collection('user_stats').add({
        data: stats
      })
    }
  } catch (error) {
    console.error('更新用户统计失败:', error)
  }
}

// 获取分析统计
async function getAnalyticsStats(userId) {
  try {
    // 获取用户统计
    const userStatsRes = await db.collection('user_stats').where({
      userId: userId
    }).get()

    const userStats = userStatsRes.data[0] || {}

    // 获取今日事件
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayEventsRes = await db.collection('analytics_events').where({
      userId: userId,
      timestamp: db.command.gte(today)
    }).count()

    // 获取最近7天的事件趋势
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const trendRes = await db.collection('analytics_events').aggregate()
      .match({
        userId: userId,
        timestamp: db.command.gte(sevenDaysAgo)
      })
      .group({
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp'
          }
        },
        count: db.command.aggregate.sum(1)
      })
      .sort({
        _id: 1
      })
      .end()

    // 获取热门事件类型
    const eventTypesRes = await db.collection('analytics_events').aggregate()
      .match({
        userId: userId
      })
      .group({
        _id: '$eventName',
        count: db.command.aggregate.sum(1)
      })
      .sort({
        count: -1
      })
      .limit(10)
      .end()

    return {
      success: true,
      data: {
        totalEvents: userStats.totalEvents || 0,
        todayEvents: todayEventsRes.total || 0,
        lastEventTime: userStats.lastEventTime,
        eventTrend: trendRes.list || [],
        topEventTypes: eventTypesRes.list || []
      }
    }
  } catch (error) {
    console.error('获取分析统计失败:', error)
    throw error
  }
}

// 获取用户行为分析
async function getUserBehavior(userId) {
  try {
    // 获取用户最近的事件
    const eventsRes = await db.collection('analytics_events').where({
      userId: userId
    }).orderBy('timestamp', 'desc').limit(100).get()

    const events = eventsRes.data

    // 分析用户行为模式
    const behavior = {
      mostActiveHour: getMostActiveHour(events),
      mostActiveDay: getMostActiveDay(events),
      averageSessionDuration: calculateAverageSessionDuration(events),
      favoriteFeatures: getFavoriteFeatures(events),
      usagePattern: analyzeUsagePattern(events)
    }

    return {
      success: true,
      data: behavior
    }
  } catch (error) {
    console.error('获取用户行为失败:', error)
    throw error
  }
}

// 获取最活跃时段
function getMostActiveHour(events) {
  const hourCounts = new Array(24).fill(0)
  
  events.forEach(event => {
    const hour = new Date(event.timestamp).getHours()
    hourCounts[hour]++
  })

  const maxHour = hourCounts.indexOf(Math.max(...hourCounts))
  return maxHour
}

// 获取最活跃日期
function getMostActiveDay(events) {
  const dayCounts = new Array(7).fill(0)
  
  events.forEach(event => {
    const day = new Date(event.timestamp).getDay()
    dayCounts[day]++
  })

  const maxDay = dayCounts.indexOf(Math.max(...dayCounts))
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return dayNames[maxDay]
}

// 计算平均会话时长
function calculateAverageSessionDuration(events) {
  const sessions = []
  let currentSession = null

  events.forEach(event => {
    if (event.eventName === 'session_start') {
      currentSession = { start: event.timestamp }
    } else if (event.eventName === 'session_end' && currentSession) {
      currentSession.end = event.timestamp
      sessions.push(currentSession)
      currentSession = null
    }
  })

  if (sessions.length === 0) return 0

  const totalDuration = sessions.reduce((sum, session) => {
    return sum + (new Date(session.end) - new Date(session.start))
  }, 0)

  return Math.round(totalDuration / sessions.length / 1000) // 返回秒数
}

// 获取最常用功能
function getFavoriteFeatures(events) {
  const featureCounts = {}
  
  events.forEach(event => {
    if (event.eventName === 'user_action') {
      const action = event.properties?.action
      if (action) {
        featureCounts[action] = (featureCounts[action] || 0) + 1
      }
    }
  })

  return Object.entries(featureCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([feature, count]) => ({ feature, count }))
}

// 分析使用模式
function analyzeUsagePattern(events) {
  const pattern = {
    isRegularUser: false,
    isActiveUser: false,
    preferredTime: 'unknown',
    usageFrequency: 'low'
  }

  // 分析是否为规律用户（连续7天都有活动）
  const uniqueDays = new Set()
  events.forEach(event => {
    const date = new Date(event.timestamp).toDateString()
    uniqueDays.add(date)
  })

  pattern.isRegularUser = uniqueDays.size >= 7

  // 分析是否为活跃用户（最近7天有活动）
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const recentEvents = events.filter(event => 
    new Date(event.timestamp) >= sevenDaysAgo
  )

  pattern.isActiveUser = recentEvents.length > 0

  // 分析使用频率
  const avgEventsPerDay = events.length / Math.max(uniqueDays.size, 1)
  if (avgEventsPerDay >= 10) {
    pattern.usageFrequency = 'high'
  } else if (avgEventsPerDay >= 5) {
    pattern.usageFrequency = 'medium'
  }

  return pattern
}