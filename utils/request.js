/**
 * 网络请求优化工具
 * 提供请求缓存、重试机制、并发控制、防抖节流等功能
 */

class RequestManager {
  constructor() {
    this.baseURL = ''
    this.timeout = 10000
    this.retryTimes = 3
    this.retryDelay = 1000
    this.maxConcurrent = 10
    this.cacheTime = 5 * 60 * 1000 // 5分钟缓存
    
    // 请求队列和缓存
    this.requestQueue = []
    this.activeRequests = new Set()
    this.requestCache = new Map()
    this.pendingRequests = new Map()
    
    // 防抖节流
    this.debounceMap = new Map()
    this.throttleMap = new Map()
    
    // 请求拦截器
    this.requestInterceptors = []
    this.responseInterceptors = []
    
    // 初始化
    this.init()
  }

  // 初始化
  init() {
    // 设置默认配置
    this.setBaseURL(getApp().globalData.apiUrl || '')
    
    // 监听网络状态
    this.setupNetworkListener()
    
    // 定期清理缓存
    this.setupCacheCleanup()
  }

  // 设置基础URL
  setBaseURL(url) {
    this.baseURL = url
  }

  // 设置超时时间
  setTimeout(timeout) {
    this.timeout = timeout
  }

  // 设置重试次数
  setRetryTimes(times) {
    this.retryTimes = times
  }

  // 设置缓存时间
  setCacheTime(time) {
    this.cacheTime = time
  }

  // 主要请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      // 参数处理
      const config = this.mergeConfig(options)
      
      // 生成请求唯一标识
      const requestKey = this.generateRequestKey(config)
      
      // 检查缓存
      if (config.useCache && this.hasValidCache(requestKey)) {
        const cachedResponse = this.getCache(requestKey)
        resolve(cachedResponse)
        return
      }
      
      // 检查是否有相同请求正在进行
      if (this.pendingRequests.has(requestKey)) {
        this.pendingRequests.get(requestKey).push({ resolve, reject })
        return
      }
      
      // 创建请求队列项
      const requestItem = {
        config,
        requestKey,
        resolve,
        reject,
        retryCount: 0,
        timestamp: Date.now()
      }
      
      // 如果启用防抖
      if (config.debounce) {
        this.handleDebounce(requestItem, config.debounce)
        return
      }
      
      // 如果启用节流
      if (config.throttle) {
        this.handleThrottle(requestItem, config.throttle)
        return
      }
      
      // 执行请求
      this.executeRequest(requestItem)
    })
  }

  // 合并配置
  mergeConfig(options) {
    const defaultConfig = {
      url: '',
      method: 'GET',
      data: {},
      header: {},
      timeout: this.timeout,
      useCache: false,
      cacheTime: this.cacheTime,
      retry: true,
      retryTimes: this.retryTimes,
      retryDelay: this.retryDelay,
      debounce: 0,
      throttle: 0,
      showLoading: false,
      loadingText: '加载中...',
      showError: true
    }

    const config = { ...defaultConfig, ...options }
    
    // 处理URL
    if (config.url && !config.url.startsWith('http')) {
      config.url = this.baseURL + config.url
    }
    
    // 添加通用header
    config.header = {
      'content-type': 'application/json',
      ...config.header
    }
    
    // 添加token
    const token = wx.getStorageSync('token')
    if (token) {
      config.header['Authorization'] = token
    }
    
    return config
  }

  // 生成请求唯一标识
  generateRequestKey(config) {
    const { url, method, data } = config
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
    return `${method}_${url}_${this.hashCode(dataStr)}`
  }

  // 简单哈希函数
  hashCode(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  // 执行请求
  executeRequest(requestItem) {
    const { config, requestKey, resolve, reject } = requestItem
    
    // 检查并发限制
    if (this.activeRequests.size >= this.maxConcurrent) {
      this.requestQueue.push(requestItem)
      return
    }
    
    // 标记为活跃请求
    this.activeRequests.add(requestKey)
    
    // 添加到待处理列表
    this.pendingRequests.set(requestKey, [{ resolve, reject }])
    
    // 显示loading
    if (config.showLoading) {
      wx.showLoading({
        title: config.loadingText,
        mask: true
      })
    }
    
    // 执行请求拦截器
    this.runRequestInterceptors(config)
    
    // 发起请求
    const requestTask = wx.request({
      url: config.url,
      method: config.method,
      data: config.data,
      header: config.header,
      timeout: config.timeout,
      success: (res) => {
        this.handleSuccess(requestItem, res)
      },
      fail: (error) => {
        this.handleError(requestItem, error)
      },
      complete: () => {
        // 隐藏loading
        if (config.showLoading) {
          wx.hideLoading()
        }
        
        // 清理活跃请求
        this.activeRequests.delete(requestKey)
        this.pendingRequests.delete(requestKey)
        
        // 处理队列中的请求
        this.processQueue()
      }
    })
    
    // 保存请求任务（用于取消）
    requestItem.task = requestTask
  }

  // 处理成功响应
  handleSuccess(requestItem, res) {
    const { config, requestKey } = requestItem
    
    // 执行响应拦截器
    const processedRes = this.runResponseInterceptors(res, config)
    
    // 检查业务状态码
    if (this.isBusinessSuccess(processedRes)) {
      // 缓存响应
      if (config.useCache) {
        this.setCache(requestKey, processedRes, config.cacheTime)
      }
      
      // 解析所有等待的Promise
      const pendingList = this.pendingRequests.get(requestKey) || []
      pendingList.forEach(({ resolve }) => {
        resolve(processedRes)
      })
    } else {
      // 业务错误
      const error = new Error(processedRes.data?.message || '请求失败')
      error.response = processedRes
      this.handleError(requestItem, error)
    }
  }

  // 处理错误响应
  handleError(requestItem, error) {
    const { config, requestKey, retryCount } = requestItem
    
    // 是否需要重试
    if (config.retry && retryCount < config.retryTimes && this.shouldRetry(error)) {
      setTimeout(() => {
        requestItem.retryCount++
        this.executeRequest(requestItem)
      }, config.retryDelay * Math.pow(2, retryCount)) // 指数退避
      return
    }
    
    // 显示错误提示
    if (config.showError) {
      this.showErrorToast(error)
    }
    
    // 拒绝所有等待的Promise
    const pendingList = this.pendingRequests.get(requestKey) || []
    pendingList.forEach(({ reject }) => {
      reject(error)
    })
  }

  // 判断是否为业务成功
  isBusinessSuccess(res) {
    return res.statusCode === 200 && res.data && res.data.success !== false
  }

  // 判断是否应该重试
  shouldRetry(error) {
    // 网络错误或5xx服务器错误才重试
    return !error.response || 
           error.response.statusCode >= 500 || 
           error.response.statusCode === 0
  }

  // 显示错误提示
  showErrorToast(error) {
    let message = '网络错误，请稍后重试'
    
    if (error.response) {
      const { statusCode, data } = error.response
      if (statusCode === 401) {
        message = '登录已过期，请重新登录'
        // 清除token并跳转登录页
        wx.removeStorageSync('token')
        wx.reLaunch({ url: '/pages/login/login' })
        return
      } else if (statusCode === 403) {
        message = '没有权限访问'
      } else if (statusCode === 404) {
        message = '请求的资源不存在'
      } else if (data && data.message) {
        message = data.message
      }
    }
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    })
  }

  // 处理防抖
  handleDebounce(requestItem, delay) {
    const { requestKey } = requestItem
    
    // 清除之前的定时器
    if (this.debounceMap.has(requestKey)) {
      clearTimeout(this.debounceMap.get(requestKey))
    }
    
    // 设置新的定时器
    const timer = setTimeout(() => {
      this.debounceMap.delete(requestKey)
      this.executeRequest(requestItem)
    }, delay)
    
    this.debounceMap.set(requestKey, timer)
  }

  // 处理节流
  handleThrottle(requestItem, delay) {
    const { requestKey } = requestItem
    
    // 检查是否在节流期间
    if (this.throttleMap.has(requestKey)) {
      requestItem.reject(new Error('请求过于频繁'))
      return
    }
    
    // 执行请求
    this.executeRequest(requestItem)
    
    // 设置节流标记
    this.throttleMap.set(requestKey, true)
    setTimeout(() => {
      this.throttleMap.delete(requestKey)
    }, delay)
  }

  // 处理请求队列
  processQueue() {
    while (this.requestQueue.length > 0 && this.activeRequests.size < this.maxConcurrent) {
      const requestItem = this.requestQueue.shift()
      this.executeRequest(requestItem)
    }
  }

  // 缓存相关方法
  hasValidCache(key) {
    const cacheItem = this.requestCache.get(key)
    if (!cacheItem) return false
    
    const now = Date.now()
    return now - cacheItem.timestamp < cacheItem.cacheTime
  }

  getCache(key) {
    const cacheItem = this.requestCache.get(key)
    return cacheItem ? cacheItem.data : null
  }

  setCache(key, data, cacheTime) {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      cacheTime
    })
  }

  clearCache(pattern) {
    if (pattern) {
      // 清除匹配模式的缓存
      for (const [key] of this.requestCache) {
        if (key.includes(pattern)) {
          this.requestCache.delete(key)
        }
      }
    } else {
      // 清除所有缓存
      this.requestCache.clear()
    }
  }

  // 设置缓存清理
  setupCacheCleanup() {
    setInterval(() => {
      const now = Date.now()
      for (const [key, cacheItem] of this.requestCache) {
        if (now - cacheItem.timestamp >= cacheItem.cacheTime) {
          this.requestCache.delete(key)
        }
      }
    }, 60000) // 每分钟清理一次过期缓存
  }

  // 网络状态监听
  setupNetworkListener() {
    wx.onNetworkStatusChange((res) => {
      if (!res.isConnected) {
        // 网络断开，清空队列
        this.requestQueue.forEach(item => {
          item.reject(new Error('网络连接已断开'))
        })
        this.requestQueue = []
      } else {
        // 网络恢复，重新处理队列
        this.processQueue()
      }
    })
  }

  // 拦截器相关方法
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor)
  }

  runRequestInterceptors(config) {
    this.requestInterceptors.forEach(interceptor => {
      try {
        interceptor(config)
      } catch (error) {
        console.warn('请求拦截器执行失败：', error)
      }
    })
  }

  runResponseInterceptors(response, config) {
    let processedResponse = response
    
    this.responseInterceptors.forEach(interceptor => {
      try {
        processedResponse = interceptor(processedResponse, config) || processedResponse
      } catch (error) {
        console.warn('响应拦截器执行失败：', error)
      }
    })
    
    return processedResponse
  }

  // 便捷方法
  get(url, options = {}) {
    return this.request({ ...options, url, method: 'GET' })
  }

  post(url, data, options = {}) {
    return this.request({ ...options, url, method: 'POST', data })
  }

  put(url, data, options = {}) {
    return this.request({ ...options, url, method: 'PUT', data })
  }

  delete(url, options = {}) {
    return this.request({ ...options, url, method: 'DELETE' })
  }

  // 批量请求
  all(requests) {
    return Promise.all(requests.map(req => this.request(req)))
  }

  // 竞速请求
  race(requests) {
    return Promise.race(requests.map(req => this.request(req)))
  }

  // 取消请求
  cancel(requestKey) {
    // 从队列中移除
    this.requestQueue = this.requestQueue.filter(item => item.requestKey !== requestKey)
    
    // 取消活跃请求
    const pendingList = this.pendingRequests.get(requestKey)
    if (pendingList) {
      pendingList.forEach(({ reject }) => {
        reject(new Error('请求已取消'))
      })
      this.pendingRequests.delete(requestKey)
    }
    
    this.activeRequests.delete(requestKey)
  }

  // 获取统计信息
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queueLength: this.requestQueue.length,
      cacheSize: this.requestCache.size,
      pendingRequests: this.pendingRequests.size
    }
  }
}

// 创建单例实例
const requestManager = new RequestManager()

// 添加默认拦截器
requestManager.addRequestInterceptor((config) => {
  // 添加时间戳防止缓存
  if (config.method === 'GET' && config.preventCache) {
    const separator = config.url.includes('?') ? '&' : '?'
    config.url += `${separator}_t=${Date.now()}`
  }
})

requestManager.addResponseInterceptor((response, config) => {
  // 统一处理响应格式
  if (response.data && typeof response.data === 'string') {
    try {
      response.data = JSON.parse(response.data)
    } catch (error) {
      console.warn('响应数据解析失败：', error)
    }
  }
  
  return response
})

module.exports = requestManager