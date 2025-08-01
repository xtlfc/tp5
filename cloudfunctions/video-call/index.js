// cloudfunctions/video-call/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, callId, callerId, calleeId, muted } = event
  const wxContext = cloud.getWXContext()

  try {
    switch (action) {
      case 'create':
        return await createCall(callId, callerId, calleeId)
      case 'answer':
        return await answerCall(callId)
      case 'reject':
        return await rejectCall(callId)
      case 'hangup':
        return await hangupCall(callId)
      case 'updateVideo':
        return await updateVideoStatus(callId, muted)
      case 'updateAudio':
        return await updateAudioStatus(callId, muted)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('视频通话云函数错误:', error)
    return { success: false, message: error.message }
  }
}

// 创建通话
async function createCall(callId, callerId, calleeId) {
  try {
    // 生成推流和拉流地址（这里需要根据实际的音视频服务配置）
    const pushUrl = `rtmp://your-rtmp-server/live/${callId}_push`
    const playUrl = `rtmp://your-rtmp-server/live/${callId}_play`

    // 保存通话记录
    await db.collection('calls').add({
      data: {
        callId,
        callerId,
        calleeId,
        callType: 'video',
        status: 'calling',
        pushUrl,
        playUrl,
        startTime: new Date(),
        createTime: new Date()
      }
    })

    // 发送推送通知给被叫方
    await sendCallNotification(calleeId, callerId, 'video')

    return {
      success: true,
      pushUrl,
      playUrl
    }
  } catch (error) {
    console.error('创建通话失败:', error)
    throw error
  }
}

// 接听通话
async function answerCall(callId) {
  try {
    // 更新通话状态
    await db.collection('calls').where({
      callId: callId
    }).update({
      data: {
        status: 'connected',
        answerTime: new Date()
      }
    })

    // 获取通话信息
    const callRes = await db.collection('calls').where({
      callId: callId
    }).get()

    if (callRes.data.length > 0) {
      const call = callRes.data[0]
      return {
        success: true,
        pushUrl: call.pushUrl,
        playUrl: call.playUrl
      }
    }

    return { success: false, message: '通话不存在' }
  } catch (error) {
    console.error('接听通话失败:', error)
    throw error
  }
}

// 拒绝通话
async function rejectCall(callId) {
  try {
    await db.collection('calls').where({
      callId: callId
    }).update({
      data: {
        status: 'rejected',
        endTime: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('拒绝通话失败:', error)
    throw error
  }
}

// 挂断通话
async function hangupCall(callId) {
  try {
    await db.collection('calls').where({
      callId: callId
    }).update({
      data: {
        status: 'ended',
        endTime: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('挂断通话失败:', error)
    throw error
  }
}

// 更新视频状态
async function updateVideoStatus(callId, muted) {
  try {
    await db.collection('calls').where({
      callId: callId
    }).update({
      data: {
        videoMuted: muted,
        updateTime: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('更新视频状态失败:', error)
    throw error
  }
}

// 更新音频状态
async function updateAudioStatus(callId, muted) {
  try {
    await db.collection('calls').where({
      callId: callId
    }).update({
      data: {
        audioMuted: muted,
        updateTime: new Date()
      }
    })

    return { success: true }
  } catch (error) {
    console.error('更新音频状态失败:', error)
    throw error
  }
}

// 发送通话通知
async function sendCallNotification(calleeId, callerId, callType) {
  try {
    // 这里可以集成推送服务，如微信模板消息或其他推送服务
    console.log(`发送${callType}通话通知给用户: ${calleeId}`)
    
    // 示例：保存通知记录
    await db.collection('notifications').add({
      data: {
        userId: calleeId,
        type: 'call',
        callType: callType,
        callerId: callerId,
        title: `${callType === 'video' ? '视频' : '语音'}通话`,
        content: '您有一个新的通话请求',
        isRead: false,
        createTime: new Date()
      }
    })
  } catch (error) {
    console.error('发送通知失败:', error)
  }
}