// cloudfunctions/chat/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, data } = event

  try {
    switch (action) {
      case 'sendMessage':
        return await sendMessage(OPENID, data)
      case 'getMessages':
        return await getMessages(OPENID, data)
      case 'markAsRead':
        return await markAsRead(OPENID, data)
      case 'getChatSessions':
        return await getChatSessions(OPENID)
      default:
        return {
          success: false,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('聊天操作失败:', error)
    return {
      success: false,
      message: '操作失败，请重试'
    }
  }
}

// 发送消息
async function sendMessage(senderId, data) {
  const { receiverId, content, type, chatId } = data

  try {
    // 保存消息到数据库
    const messageData = {
      chatId: chatId,
      senderId: senderId,
      receiverId: receiverId,
      content: content,
      type: type || 'text',
      status: 'sent',
      createTime: new Date(),
      isDestroyed: false
    }

    const result = await db.collection('messages').add({
      data: messageData
    })

    // 更新聊天会话
    await updateChatSession(senderId, receiverId, content, type)

    return {
      success: true,
      messageId: result._id,
      message: '发送成功'
    }

  } catch (error) {
    console.error('发送消息失败:', error)
    throw error
  }
}

// 获取消息列表
async function getMessages(userId, data) {
  const { chatId, page = 1, pageSize = 20 } = data

  try {
    const messagesRes = await db.collection('messages')
      .where({
        chatId: chatId
      })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    const messages = messagesRes.data.reverse().map(msg => ({
      id: msg._id,
      content: msg.content,
      type: msg.type,
      isSelf: msg.senderId === userId,
      createTime: msg.createTime,
      status: msg.status,
      isDestroyed: msg.isDestroyed
    }))

    return {
      success: true,
      messages: messages,
      hasMore: messages.length === pageSize
    }

  } catch (error) {
    console.error('获取消息失败:', error)
    throw error
  }
}

// 标记消息为已读
async function markAsRead(userId, data) {
  const { messageIds } = data

  try {
    // 批量更新消息状态
    const updatePromises = messageIds.map(messageId => 
      db.collection('messages').doc(messageId).update({
        data: { 
          status: 'read',
          readTime: new Date()
        }
      })
    )

    await Promise.all(updatePromises)

    return {
      success: true,
      message: '标记成功'
    }

  } catch (error) {
    console.error('标记已读失败:', error)
    throw error
  }
}

// 获取聊天会话列表
async function getChatSessions(userId) {
  try {
    const sessionsRes = await db.collection('chatSessions')
      .where({
        _openid: userId
      })
      .orderBy('lastMessageTime', 'desc')
      .get()

    // 获取每个会话的最新消息
    const sessionsWithMessages = await Promise.all(
      sessionsRes.data.map(async (session) => {
        const lastMessageRes = await db.collection('messages')
          .where({
            chatId: `${userId}_${session.matchedUserId}`
          })
          .orderBy('createTime', 'desc')
          .limit(1)
          .get()

        const lastMessage = lastMessageRes.data[0] || null

        return {
          id: session._id,
          matchedUserId: session.matchedUserId,
          matchedUserInfo: session.matchedUserInfo,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            type: lastMessage.type,
            createTime: lastMessage.createTime,
            isSelf: lastMessage.senderId === userId
          } : null,
          lastMessageTime: session.lastMessageTime,
          unreadCount: 0 // 可以添加未读消息计数逻辑
        }
      })
    )

    return {
      success: true,
      sessions: sessionsWithMessages
    }

  } catch (error) {
    console.error('获取聊天会话失败:', error)
    throw error
  }
}

// 更新聊天会话
async function updateChatSession(senderId, receiverId, content, type) {
  try {
    const chatId = `${senderId}_${receiverId}`
    const now = new Date()

    // 更新发送者的会话
    await db.collection('chatSessions').where({
      _openid: senderId,
      matchedUserId: receiverId
    }).update({
      data: {
        lastMessageTime: now,
        lastMessage: {
          content: content,
          type: type
        }
      }
    })

    // 检查接收者是否有会话，如果没有则创建
    const receiverSessionRes = await db.collection('chatSessions').where({
      _openid: receiverId,
      matchedUserId: senderId
    }).get()

    if (receiverSessionRes.data.length === 0) {
      // 获取发送者信息
      const senderRes = await db.collection('users').where({
        openid: senderId
      }).get()

      if (senderRes.data.length > 0) {
        const sender = senderRes.data[0]
        await db.collection('chatSessions').add({
          data: {
            matchedUserId: senderId,
            matchedUserInfo: {
              nickName: sender.nickName,
              avatarUrl: sender.avatarUrl
            },
            lastMessageTime: now,
            lastMessage: {
              content: content,
              type: type
            },
            createTime: now
          }
        })
      }
    } else {
      // 更新接收者的会话
      await db.collection('chatSessions').where({
        _openid: receiverId,
        matchedUserId: senderId
      }).update({
        data: {
          lastMessageTime: now,
          lastMessage: {
            content: content,
            type: type
          }
        }
      })
    }

  } catch (error) {
    console.error('更新聊天会话失败:', error)
    throw error
  }
}