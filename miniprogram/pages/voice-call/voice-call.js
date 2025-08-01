// pages/voice-call/voice-call.js
const app = getApp()
const { cloudFunctionManager } = require('../../utils/network/request')
const { analyticsManager } = require('../../utils/analytics/analytics')

Page({
  data: {
    // 通话信息
    callId: '',
    callerInfo: {},
    isIncoming: false,
    isAnswered: false,
    
    // 控制状态
    isLocalAudioMuted: false,
    isSpeakerOn: false,
    
    // 通话状态
    callStatus: '连接中...',
    callDuration: '00:00',
    networkQuality: '良好',
    
    // UI状态
    isLoading: true,
    loadingText: '正在连接...',
    showStatusTip: false,
    statusTipText: '',
    
    // 计时器
    callStartTime: 0,
    durationTimer: null
  },

  onLoad(options) {
    const { callId, callerId, isIncoming } = options
    
    this.setData({
      callId,
      isIncoming: isIncoming === 'true'
    })

    // 获取通话者信息
    this.getCallerInfo(callerId)
    
    // 初始化通话
    if (this.data.isIncoming) {
      this.initIncomingCall()
    } else {
      this.initOutgoingCall()
    }

    // 记录分析事件
    analyticsManager.trackCall({
      type: 'voice',
      isIncoming: this.data.isIncoming,
      status: 'started'
    })
  },

  onUnload() {
    this.cleanup()
  },

  // 获取通话者信息
  async getCallerInfo(callerId) {
    try {
      const db = wx.cloud.database()
      const userRes = await db.collection('users').where({
        openid: callerId
      }).get()

      if (userRes.data.length > 0) {
        this.setData({
          callerInfo: userRes.data[0]
        })
      }
    } catch (error) {
      console.error('获取通话者信息失败:', error)
    }
  },

  // 初始化来电
  async initIncomingCall() {
    this.setData({
      callStatus: '来电',
      loadingText: '等待接听...'
    })

    // 播放来电铃声
    this.playRingtone()
  },

  // 初始化去电
  async initOutgoingCall() {
    try {
      this.setData({
        callStatus: '正在呼叫...',
        loadingText: '正在连接...'
      })

      // 调用云函数创建通话
      const result = await cloudFunctionManager.callFunction('voice-call', {
        action: 'create',
        callId: this.data.callId,
        callerId: app.globalData.openid,
        calleeId: this.data.callerInfo.openid
      })

      if (result.success) {
        this.startCall()
      } else {
        this.showError('创建通话失败')
      }
    } catch (error) {
      console.error('初始化通话失败:', error)
      this.showError('连接失败')
    }
  },

  // 开始通话
  startCall() {
    this.setData({
      isLoading: false,
      callStatus: '通话中',
      callStartTime: Date.now(),
      isAnswered: true
    })

    this.startDurationTimer()
    this.startNetworkMonitor()
  },

  // 接听电话
  async answerCall() {
    try {
      this.setData({
        loadingText: '正在连接...'
      })

      // 停止铃声
      this.stopRingtone()

      // 调用云函数接听
      const result = await cloudFunctionManager.callFunction('voice-call', {
        action: 'answer',
        callId: this.data.callId
      })

      if (result.success) {
        this.startCall()
      } else {
        this.showError('接听失败')
      }
    } catch (error) {
      console.error('接听失败:', error)
      this.showError('接听失败')
    }
  },

  // 拒绝电话
  async rejectCall() {
    try {
      await cloudFunctionManager.callFunction('voice-call', {
        action: 'reject',
        callId: this.data.callId
      })

      this.stopRingtone()
      this.endCall('rejected')
    } catch (error) {
      console.error('拒绝失败:', error)
    }
  },

  // 挂断电话
  async hangup() {
    try {
      await cloudFunctionManager.callFunction('voice-call', {
        action: 'hangup',
        callId: this.data.callId
      })

      this.endCall('ended')
    } catch (error) {
      console.error('挂断失败:', error)
      this.endCall('ended')
    }
  },

  // 结束通话
  endCall(reason) {
    this.cleanup()

    const duration = this.getCallDuration()
    
    // 记录分析事件
    analyticsManager.trackCall({
      type: 'voice',
      duration: duration,
      isIncoming: this.data.isIncoming,
      status: reason
    })

    // 返回上一页
    wx.navigateBack()
  },

  // 切换音频
  toggleAudio() {
    const isMuted = !this.data.isLocalAudioMuted
    this.setData({ isLocalAudioMuted: isMuted })

    // 调用云函数更新状态
    cloudFunctionManager.callFunction('voice-call', {
      action: 'updateAudio',
      callId: this.data.callId,
      muted: isMuted
    })

    this.showStatusTip(isMuted ? '已静音' : '已取消静音')
  },

  // 切换扬声器
  toggleSpeaker() {
    const isOn = !this.data.isSpeakerOn
    this.setData({ isSpeakerOn: isOn })

    // 这里可以调用微信API切换扬声器
    // wx.setInnerAudioOption({
    //   speakerOn: isOn
    // })

    this.showStatusTip(isOn ? '已开启扬声器' : '已关闭扬声器')
  },

  // 开始计时器
  startDurationTimer() {
    this.data.durationTimer = setInterval(() => {
      const duration = this.getCallDuration()
      this.setData({
        callDuration: this.formatDuration(duration)
      })
    }, 1000)
  },

  // 获取通话时长
  getCallDuration() {
    if (!this.data.callStartTime) return 0
    return Math.floor((Date.now() - this.data.callStartTime) / 1000)
  },

  // 格式化时长
  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  },

  // 开始网络监控
  startNetworkMonitor() {
    // 这里可以实现网络质量监控
    setInterval(() => {
      // 模拟网络质量检测
      const qualities = ['优秀', '良好', '一般', '较差']
      const quality = qualities[Math.floor(Math.random() * qualities.length)]
      this.setData({ networkQuality: quality })
    }, 5000)
  },

  // 播放铃声
  playRingtone() {
    // 这里可以播放来电铃声
    console.log('播放来电铃声')
  },

  // 停止铃声
  stopRingtone() {
    // 这里可以停止铃声
    console.log('停止铃声')
  },

  // 显示状态提示
  showStatusTip(text) {
    this.setData({
      showStatusTip: true,
      statusTipText: text
    })

    setTimeout(() => {
      this.setData({
        showStatusTip: false
      })
    }, 2000)
  },

  // 显示错误
  showError(message) {
    this.setData({
      isLoading: false,
      callStatus: '连接失败',
      loadingText: message
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 2000)
  },

  // 清理资源
  cleanup() {
    if (this.data.durationTimer) {
      clearInterval(this.data.durationTimer)
    }
    
    this.stopRingtone()
  }
})