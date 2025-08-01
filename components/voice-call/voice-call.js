Component({
  properties: {
    // 是否显示组件
    isVisible: {
      type: Boolean,
      value: false
    },
    // 通话类型：outgoing（拨打）、incoming（接听）
    callType: {
      type: String,
      value: 'outgoing'
    },
    // 远程用户信息
    remoteUser: {
      type: Object,
      value: {}
    }
  },

  data: {
    // 通话状态
    isConnected: false,
    isMuted: false,
    isSpeaker: false,
    callDuration: 0,
    networkStatus: 'good', // good, poor, disconnected
    callStatusText: '正在连接...',
    
    // 定时器
    durationTimer: null,
    networkTimer: null,
    
    // 通话管理器
    callManager: null
  },

  lifetimes: {
    attached() {
      console.log('语音通话组件已加载')
      this.initCallManager()
    },

    detached() {
      console.log('语音通话组件已卸载')
      this.cleanup()
    }
  },

  observers: {
    'isVisible': function(visible) {
      if (visible) {
        this.startCall()
      } else {
        this.cleanup()
      }
    }
  },

  methods: {
    // 初始化通话管理器
    initCallManager() {
      // 这里应该初始化实际的音频通话SDK
      // 比如腾讯云TRTC、声网Agora等
      console.log('初始化通话管理器')
      
      // 模拟初始化
      this.data.callManager = {
        startCall: this.mockStartCall.bind(this),
        answerCall: this.mockAnswerCall.bind(this),
        hangupCall: this.mockHangupCall.bind(this),
        toggleMute: this.mockToggleMute.bind(this),
        toggleSpeaker: this.mockToggleSpeaker.bind(this)
      }
    },

    // 开始通话
    startCall() {
      const { callType } = this.properties
      
      if (callType === 'outgoing') {
        this.setData({
          callStatusText: '正在呼叫...'
        })
        
        // 播放拨号音
        this.playDialTone()
        
        // 模拟连接延迟
        setTimeout(() => {
          this.data.callManager.startCall()
        }, 2000)
        
      } else if (callType === 'incoming') {
        this.setData({
          callStatusText: '来电话了...'
        })
        
        // 播放来电铃声
        this.playRingtone()
      }
    },

    // 接听电话
    answerCall() {
      wx.vibrateShort()
      
      this.setData({
        callStatusText: '正在连接...'
      })
      
      // 停止铃声
      this.stopRingtone()
      
      setTimeout(() => {
        this.data.callManager.answerCall()
      }, 1000)
    },

    // 挂断电话
    hangupCall() {
      wx.vibrateShort()
      
      this.data.callManager.hangupCall()
      this.endCall()
    },

    // 切换静音
    toggleMute() {
      const isMuted = !this.data.isMuted
      this.setData({ isMuted })
      
      this.data.callManager.toggleMute(isMuted)
      
      wx.showToast({
        title: isMuted ? '已静音' : '已取消静音',
        icon: 'none',
        duration: 1000
      })
    },

    // 切换免提
    toggleSpeaker() {
      const isSpeaker = !this.data.isSpeaker
      this.setData({ isSpeaker })
      
      this.data.callManager.toggleSpeaker(isSpeaker)
      
      wx.showToast({
        title: isSpeaker ? '免提已开启' : '免提已关闭',
        icon: 'none',
        duration: 1000
      })
    },

    // 格式化通话时长
    formatDuration(seconds) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    },

    // 开始计时
    startDurationTimer() {
      this.data.durationTimer = setInterval(() => {
        this.setData({
          callDuration: this.data.callDuration + 1
        })
      }, 1000)
    },

    // 停止计时
    stopDurationTimer() {
      if (this.data.durationTimer) {
        clearInterval(this.data.durationTimer)
        this.data.durationTimer = null
      }
    },

    // 监控网络状态
    monitorNetworkStatus() {
      this.data.networkTimer = setInterval(() => {
        wx.getNetworkType({
          success: (res) => {
            let networkStatus = 'good'
            
            if (res.networkType === 'none') {
              networkStatus = 'disconnected'
            } else if (res.networkType === '2g') {
              networkStatus = 'poor'
            }
            
            this.setData({ networkStatus })
          }
        })
      }, 3000)
    },

    // 播放拨号音
    playDialTone() {
      const audioContext = wx.createAudioContext('dialTone')
      // 这里应该播放实际的拨号音文件
      console.log('播放拨号音')
    },

    // 播放来电铃声
    playRingtone() {
      const audioContext = wx.createAudioContext('ringtone')
      // 这里应该播放实际的来电铃声文件
      console.log('播放来电铃声')
      
      // 震动提醒
      wx.vibrateLong()
    },

    // 停止铃声
    stopRingtone() {
      const audioContext = wx.createAudioContext('ringtone')
      audioContext.stop()
      console.log('停止铃声')
    },

    // 结束通话
    endCall() {
      this.stopDurationTimer()
      this.stopRingtone()
      
      // 通知父组件通话结束
      this.triggerEvent('callEnded', {
        duration: this.data.callDuration
      })
      
      // 重置状态
      this.setData({
        isConnected: false,
        isMuted: false,
        isSpeaker: false,
        callDuration: 0,
        callStatusText: '通话已结束'
      })
    },

    // 清理资源
    cleanup() {
      this.stopDurationTimer()
      this.stopRingtone()
      
      if (this.data.networkTimer) {
        clearInterval(this.data.networkTimer)
        this.data.networkTimer = null
      }
    },

    // === 模拟通话功能 ===
    
    mockStartCall() {
      console.log('模拟开始通话')
      
      // 模拟连接成功
      setTimeout(() => {
        this.setData({
          isConnected: true,
          callStatusText: '通话中'
        })
        
        this.startDurationTimer()
        this.monitorNetworkStatus()
        
        // 通知父组件通话已连接
        this.triggerEvent('callConnected')
        
      }, Math.random() * 3000 + 2000) // 2-5秒随机延迟
    },

    mockAnswerCall() {
      console.log('模拟接听电话')
      
      this.setData({
        isConnected: true,
        callStatusText: '通话中'
      })
      
      this.startDurationTimer()
      this.monitorNetworkStatus()
      
      // 通知父组件通话已连接
      this.triggerEvent('callConnected')
    },

    mockHangupCall() {
      console.log('模拟挂断电话')
      // 实际挂断逻辑在endCall中处理
    },

    mockToggleMute(isMuted) {
      console.log('模拟切换静音：', isMuted)
      // 实际SDK会在这里控制麦克风
    },

    mockToggleSpeaker(isSpeaker) {
      console.log('模拟切换免提：', isSpeaker)
      // 实际SDK会在这里控制扬声器
    }
  }
})