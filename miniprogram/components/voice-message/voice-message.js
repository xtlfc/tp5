// components/voice-message/voice-message.js
Component({
  properties: {
    url: {
      type: String,
      value: ''
    },
    duration: {
      type: Number,
      value: 0
    },
    isSelf: {
      type: Boolean,
      value: false
    }
  },

  data: {
    isPlaying: false,
    currentTime: 0,
    audioContext: null
  },

  lifetimes: {
    attached() {
      this.initAudioContext()
    },
    detached() {
      this.destroyAudioContext()
    }
  },

  methods: {
    // 初始化音频上下文
    initAudioContext() {
      this.data.audioContext = wx.createInnerAudioContext()
      
      this.data.audioContext.onPlay(() => {
        this.setData({ isPlaying: true })
      })
      
      this.data.audioContext.onPause(() => {
        this.setData({ isPlaying: false })
      })
      
      this.data.audioContext.onStop(() => {
        this.setData({ isPlaying: false, currentTime: 0 })
      })
      
      this.data.audioContext.onEnded(() => {
        this.setData({ isPlaying: false, currentTime: 0 })
      })
      
      this.data.audioContext.onTimeUpdate(() => {
        this.setData({
          currentTime: this.data.audioContext.currentTime
        })
      })
      
      this.data.audioContext.onError((error) => {
        console.error('音频播放错误:', error)
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        })
      })
    },

    // 销毁音频上下文
    destroyAudioContext() {
      if (this.data.audioContext) {
        this.data.audioContext.destroy()
        this.data.audioContext = null
      }
    },

    // 播放/暂停语音
    togglePlay() {
      if (!this.data.audioContext) return

      if (this.data.isPlaying) {
        this.data.audioContext.pause()
      } else {
        this.data.audioContext.src = this.properties.url
        this.data.audioContext.play()
      }
    },

    // 格式化时间
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
  }
})