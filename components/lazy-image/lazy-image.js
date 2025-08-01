Component({
  properties: {
    // 图片地址
    src: {
      type: String,
      value: ''
    },
    // 图片模式
    mode: {
      type: String,
      value: 'aspectFill'
    },
    // 组件宽度
    width: {
      type: String,
      value: '100%'
    },
    // 组件高度
    height: {
      type: String,
      value: '200rpx'
    },
    // 是否启用懒加载
    lazyLoad: {
      type: Boolean,
      value: true
    },
    // 是否显示占位图
    showPlaceholder: {
      type: Boolean,
      value: true
    },
    // 是否显示进度条
    showProgress: {
      type: Boolean,
      value: false
    },
    // 是否支持长按菜单
    showMenuByLongpress: {
      type: Boolean,
      value: false
    },
    // 预加载距离（像素）
    preloadDistance: {
      type: Number,
      value: 100
    },
    // 最大重试次数
    maxRetry: {
      type: Number,
      value: 3
    },
    // 缓存时间（毫秒）
    cacheTime: {
      type: Number,
      value: 24 * 60 * 60 * 1000 // 24小时
    }
  },

  data: {
    shouldLoad: false,
    imageLoaded: false,
    imageError: false,
    isLoading: false,
    progress: 0,
    retryCount: 0,
    
    // 观察器
    intersectionObserver: null,
    isInViewport: false
  },

  lifetimes: {
    attached() {
      this.initIntersectionObserver()
      this.checkImageCache()
    },

    detached() {
      this.disconnectObserver()
    }
  },

  observers: {
    'src': function(newSrc) {
      if (newSrc) {
        this.resetState()
        this.checkImageCache()
      }
    }
  },

  methods: {
    // 初始化交叉观察器
    initIntersectionObserver() {
      const that = this
      
      this.data.intersectionObserver = this.createIntersectionObserver({
        rootMargin: `${this.properties.preloadDistance}px`
      })
      
      this.data.intersectionObserver.relativeToViewport().observe('.lazy-image-container', (res) => {
        if (res.intersectionRatio > 0) {
          that.setData({ isInViewport: true })
          that.startLoad()
        } else {
          that.setData({ isInViewport: false })
        }
      })
    },

    // 断开观察器
    disconnectObserver() {
      if (this.data.intersectionObserver) {
        this.data.intersectionObserver.disconnect()
        this.data.intersectionObserver = null
      }
    },

    // 检查图片缓存
    checkImageCache() {
      const cacheKey = this.getCacheKey(this.properties.src)
      const cachedImage = this.getImageFromCache(cacheKey)
      
      if (cachedImage && this.isCacheValid(cachedImage)) {
        // 使用缓存
        this.setData({
          shouldLoad: true,
          imageLoaded: true
        })
        
        this.triggerEvent('load', {
          src: this.properties.src,
          fromCache: true
        })
      } else {
        // 需要重新加载
        if (this.data.isInViewport || !this.properties.lazyLoad) {
          this.startLoad()
        }
      }
    },

    // 开始加载图片
    startLoad() {
      if (this.data.shouldLoad || !this.properties.src) {
        return
      }

      this.setData({
        shouldLoad: true,
        isLoading: true,
        imageError: false,
        progress: 0
      })

      // 模拟进度条
      if (this.properties.showProgress) {
        this.simulateProgress()
      }
    },

    // 模拟加载进度
    simulateProgress() {
      const updateProgress = () => {
        if (!this.data.isLoading) return
        
        let progress = this.data.progress + Math.random() * 20
        progress = Math.min(progress, 95) // 最多到95%，实际加载完成后到100%
        
        this.setData({ progress })
        
        if (progress < 95) {
          setTimeout(updateProgress, 100 + Math.random() * 200)
        }
      }
      
      updateProgress()
    },

    // 图片加载成功
    onImageLoad(e) {
      this.setData({
        imageLoaded: true,
        isLoading: false,
        imageError: false,
        progress: 100,
        retryCount: 0
      })

      // 保存到缓存
      this.saveImageToCache(this.properties.src)

      // 触发事件
      this.triggerEvent('load', {
        src: this.properties.src,
        detail: e.detail,
        fromCache: false
      })

      // 断开观察器（已加载完成）
      this.disconnectObserver()
    },

    // 图片加载失败
    onImageError(e) {
      this.setData({
        imageError: true,
        isLoading: false,
        progress: 0
      })

      // 触发事件
      this.triggerEvent('error', {
        src: this.properties.src,
        detail: e.detail,
        retryCount: this.data.retryCount
      })

      console.warn('图片加载失败：', this.properties.src)
    },

    // 重试加载
    retryLoad() {
      if (this.data.retryCount >= this.properties.maxRetry) {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        return
      }

      this.setData({
        retryCount: this.data.retryCount + 1
      })

      this.resetState()
      this.startLoad()
    },

    // 重置状态
    resetState() {
      this.setData({
        shouldLoad: false,
        imageLoaded: false,
        imageError: false,
        isLoading: false,
        progress: 0
      })
    },

    // 点击图片
    onImageTap(e) {
      this.triggerEvent('tap', {
        src: this.properties.src,
        detail: e.detail
      })
    },

    // 生成缓存键
    getCacheKey(src) {
      // 简单的hash函数
      let hash = 0
      for (let i = 0; i < src.length; i++) {
        const char = src.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // 转换为32位整数
      }
      return `img_cache_${Math.abs(hash)}`
    },

    // 从缓存获取图片
    getImageFromCache(cacheKey) {
      try {
        const cached = wx.getStorageSync(cacheKey)
        return cached || null
      } catch (error) {
        console.warn('读取图片缓存失败：', error)
        return null
      }
    },

    // 保存图片到缓存
    saveImageToCache(src) {
      const cacheKey = this.getCacheKey(src)
      const cacheData = {
        src: src,
        timestamp: Date.now()
      }

      try {
        wx.setStorageSync(cacheKey, cacheData)
      } catch (error) {
        console.warn('保存图片缓存失败：', error)
      }
    },

    // 检查缓存是否有效
    isCacheValid(cachedImage) {
      if (!cachedImage || !cachedImage.timestamp) {
        return false
      }

      const now = Date.now()
      const cacheAge = now - cachedImage.timestamp
      
      return cacheAge < this.properties.cacheTime
    },

    // 清理过期缓存
    clearExpiredCache() {
      try {
        const info = wx.getStorageInfoSync()
        const keys = info.keys.filter(key => key.startsWith('img_cache_'))
        
        keys.forEach(key => {
          const cached = wx.getStorageSync(key)
          if (!this.isCacheValid(cached)) {
            wx.removeStorageSync(key)
          }
        })
      } catch (error) {
        console.warn('清理缓存失败：', error)
      }
    },

    // 预加载图片
    preloadImage(src) {
      return new Promise((resolve, reject) => {
        const img = wx.createImage ? wx.createImage() : new Image()
        
        img.onload = () => {
          this.saveImageToCache(src)
          resolve(src)
        }
        
        img.onerror = () => {
          reject(new Error(`预加载失败: ${src}`))
        }
        
        img.src = src
      })
    },

    // 批量预加载
    batchPreload(srcList) {
      const promises = srcList.map(src => this.preloadImage(src))
      return Promise.allSettled(promises)
    }
  }
})