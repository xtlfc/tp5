// components/lazy-image/lazy-image.js
const { imageCache } = require('../../utils/cache/cache')

Component({
  properties: {
    src: {
      type: String,
      value: ''
    },
    mode: {
      type: String,
      value: 'aspectFill'
    },
    placeholder: {
      type: String,
      value: '/images/placeholder.png'
    },
    errorImage: {
      type: String,
      value: '/images/error.png'
    },
    width: {
      type: String,
      value: '100%'
    },
    height: {
      type: String,
      value: '100%'
    },
    borderRadius: {
      type: String,
      value: '0'
    },
    lazyLoad: {
      type: Boolean,
      value: true
    },
    preload: {
      type: Boolean,
      value: false
    }
  },

  data: {
    imageSrc: '',
    isLoading: false,
    isError: false,
    isLoaded: false,
    isInView: false
  },

  lifetimes: {
    attached() {
      this.initImage()
    },
    detached() {
      this.clearObserver()
    }
  },

  methods: {
    // 初始化图片
    initImage() {
      if (!this.properties.src) {
        this.setData({
          imageSrc: this.properties.placeholder,
          isError: true
        })
        return
      }

      if (this.properties.preload) {
        this.preloadImage()
      } else if (this.properties.lazyLoad) {
        this.setupIntersectionObserver()
      } else {
        this.loadImage()
      }
    },

    // 设置交叉观察器
    setupIntersectionObserver() {
      this.observer = this.createIntersectionObserver({
        thresholds: [0.1]
      })

      this.observer.relativeToViewport().observe('.lazy-image', (res) => {
        if (res.intersectionRatio > 0.1 && !this.data.isInView) {
          this.setData({ isInView: true })
          this.loadImage()
          this.clearObserver()
        }
      })
    },

    // 清除观察器
    clearObserver() {
      if (this.observer) {
        this.observer.disconnect()
        this.observer = null
      }
    },

    // 预加载图片
    async preloadImage() {
      try {
        this.setData({ isLoading: true })
        
        const cachedPath = await imageCache.preloadImage(this.properties.src)
        
        this.setData({
          imageSrc: cachedPath,
          isLoading: false,
          isLoaded: true
        })
      } catch (error) {
        console.error('图片预加载失败:', error)
        this.handleError()
      }
    },

    // 加载图片
    async loadImage() {
      try {
        this.setData({ isLoading: true })
        
        // 先尝试从缓存获取
        let imagePath = imageCache.get(`img_${this.hashCode(this.properties.src)}`)
        
        if (!imagePath) {
          // 缓存中没有，下载图片
          imagePath = await this.downloadImage()
        }
        
        this.setData({
          imageSrc: imagePath,
          isLoading: false,
          isLoaded: true
        })
      } catch (error) {
        console.error('图片加载失败:', error)
        this.handleError()
      }
    },

    // 下载图片
    downloadImage() {
      return new Promise((resolve, reject) => {
        wx.downloadFile({
          url: this.properties.src,
          success: (res) => {
            if (res.statusCode === 200) {
              // 缓存图片路径
              imageCache.set(`img_${this.hashCode(this.properties.src)}`, res.tempFilePath)
              resolve(res.tempFilePath)
            } else {
              reject(new Error('图片下载失败'))
            }
          },
          fail: reject
        })
      })
    },

    // 处理错误
    handleError() {
      this.setData({
        imageSrc: this.properties.errorImage,
        isLoading: false,
        isError: true
      })
    },

    // 图片加载完成
    onImageLoad() {
      this.setData({ isLoaded: true })
      this.triggerEvent('load', { src: this.properties.src })
    },

    // 图片加载失败
    onImageError() {
      this.handleError()
      this.triggerEvent('error', { src: this.properties.src })
    },

    // 图片点击
    onImageTap() {
      this.triggerEvent('tap', { src: this.data.imageSrc })
    },

    // 简单的哈希函数
    hashCode(str) {
      let hash = 0
      if (str.length === 0) return hash
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return hash.toString()
    },

    // 重新加载
    reload() {
      this.setData({
        isError: false,
        isLoaded: false,
        imageSrc: this.properties.placeholder
      })
      this.loadImage()
    }
  }
})