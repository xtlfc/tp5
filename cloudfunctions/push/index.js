// cloudfunctions/push/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, userId, message, type, data } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'sendNotification':
        return await sendNotification(userId, message, type, data)
      case 'sendBatchNotification':
        return await sendBatchNotification(data)
      case 'sendMatchNotification':
        return await sendMatchNotification(data)
      case 'sendMessageNotification':
        return await sendMessageNotification(data)
      case 'sendCallNotification':
        return await sendCallNotification(data)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('推送云函数错误:', error)
    return { success: false, message: error.message }
  }
}

// 发送通知
async function sendNotification(userId, message, type, data) {
  try {
    // 保存通知到数据库
    const notification = {
      userId: userId,
      type: type || 'general',
      title: message.title || '新消息',
      content: message.content || message,
      data: data || {},
      isRead: false,
      createTime: new Date()
    }

    await db.collection('notifications').add({
      data: notification
    })

    // 发送微信模板消息（需要配置模板）
    await sendWechatTemplateMessage(userId, notification)

    return { success: true }
  } catch (error) {
    console.error('发送通知失败:', error)
    throw error
  }
}

// 批量发送通知
async function sendBatchNotification(data) {
  try {
    const { userIds, message, type } = data
    
    const promises = userIds.map(userId => 
      sendNotification(userId, message, type)
    )

    await Promise.all(promises)

    return { success: true, count: userIds.length }
  } catch (error) {
    console.error('批量发送通知失败:', error)
    throw error
  }
}

// 发送匹配通知
async function sendMatchNotification(data) {
  try {
    const { userId, matchedUser, diceNumber, distance } = data

    const message = {
      title: '🎲 新匹配！',
      content: `您与 ${matchedUser.nickName} 摇出了相同的点数 ${diceNumber}，距离 ${distance}km`
    }

    const notificationData = {
      matchedUserId: matchedUser.openid,
      diceNumber: diceNumber,
      distance: distance,
      matchTime: new Date()
    }

    await sendNotification(userId, message, 'match', notificationData)

    return { success: true }
  } catch (error) {
    console.error('发送匹配通知失败:', error)
    throw error
  }
}

// 发送消息通知
async function sendMessageNotification(data) {
  try {
    const { receiverId, senderInfo, messageContent, messageType } = data

    const message = {
      title: `💬 来自 ${senderInfo.nickName} 的消息`,
      content: messageType === 'text' ? messageContent : '[图片]'
    }

    const notificationData = {
      senderId: senderInfo.openid,
      messageType: messageType,
      messageContent: messageContent
    }

    await sendNotification(receiverId, message, 'message', notificationData)

    return { success: true }
  } catch (error) {
    console.error('发送消息通知失败:', error)
    throw error
  }
}

// 发送通话通知
async function sendCallNotification(data) {
  try {
    const { receiverId, callerInfo, callType } = data

    const message = {
      title: `📞 ${callType === 'video' ? '视频' : '语音'}通话`,
      content: `${callerInfo.nickName} 正在呼叫您...`
    }

    const notificationData = {
      callerId: callerInfo.openid,
      callType: callType,
      callTime: new Date()
    }

    await sendNotification(receiverId, message, 'call', notificationData)

    return { success: true }
  } catch (error) {
    console.error('发送通话通知失败:', error)
    throw error
  }
}

// 发送微信模板消息
async function sendWechatTemplateMessage(userId, notification) {
  try {
    // 获取用户的formId（需要在小程序端收集）
    const formIdRes = await db.collection('form_ids').where({
      userId: userId,
      isUsed: false
    }).orderBy('createTime', 'desc').limit(1).get()

    if (formIdRes.data.length === 0) {
      console.log('用户没有可用的formId')
      return
    }

    const formId = formIdRes.data[0].formId

    // 根据通知类型选择模板
    let templateId = ''
    let templateData = {}

    switch (notification.type) {
      case 'match':
        templateId = 'your-match-template-id'
        templateData = {
          thing1: { value: notification.title },
          thing2: { value: notification.content },
          time3: { value: new Date().toLocaleString() }
        }
        break
      case 'message':
        templateId = 'your-message-template-id'
        templateData = {
          thing1: { value: notification.title },
          thing2: { value: notification.content },
          time3: { value: new Date().toLocaleString() }
        }
        break
      case 'call':
        templateId = 'your-call-template-id'
        templateData = {
          thing1: { value: notification.title },
          thing2: { value: notification.content },
          time3: { value: new Date().toLocaleString() }
        }
        break
      default:
        templateId = 'your-general-template-id'
        templateData = {
          thing1: { value: notification.title },
          thing2: { value: notification.content },
          time3: { value: new Date().toLocaleString() }
        }
    }

    // 发送模板消息
    const result = await cloud.openapi.subscribeMessage.send({
      touser: userId,
      templateId: templateId,
      formId: formId,
      data: templateData,
      page: 'pages/index/index'
    })

    // 标记formId为已使用
    await db.collection('form_ids').doc(formIdRes.data[0]._id).update({
      data: { isUsed: true }
    })

    console.log('模板消息发送成功:', result)
  } catch (error) {
    console.error('发送微信模板消息失败:', error)
  }
}

// 获取用户未读通知数量
async function getUnreadNotificationCount(userId) {
  try {
    const countRes = await db.collection('notifications').where({
      userId: userId,
      isRead: false
    }).count()

    return countRes.total
  } catch (error) {
    console.error('获取未读通知数量失败:', error)
    return 0
  }
}

// 标记通知为已读
async function markNotificationAsRead(notificationId) {
  try {
    await db.collection('notifications').doc(notificationId).update({
      data: { isRead: true }
    })

    return { success: true }
  } catch (error) {
    console.error('标记通知已读失败:', error)
    throw error
  }
}