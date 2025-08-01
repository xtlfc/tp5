// utils/network/request.js

const { cacheManager } = require('../cache/cache')

class NetworkManager {
  constructor() {
    this.baseURL = 'https://your-api-domain.com' // 替换为你的API域名
    this.timeout = 10000 // 10秒超时
    this.retryTimes = 3 // 重试次数
    this.retryDelay = 1000 // 重试延迟
    this.requestQueue = new Map() // 请求队列，防止重复请求
  }

  // 生成请求ID
  generateRequestId(config) {
    return `${config.method}_${config.url}_${JSON.stringify(config.data || {})}`
  }

  // 检查是否有重复请求
  isDuplicateRequest(requestId) {
    return this.requestQueue.has(requestId)
  }

  // 添加请求到队列
  addToQueue(requestId, promise) {
    this.requestQueue.set(requestId, promise)
  }

  // 从队列中移除请求
  removeFromQueue(requestId) {
    this.requestQueue.delete(requestId)
  }

  // 获取队列中的请求
  getFromQueue(requestId) {
    return this.requestQueue.get(requestId)
  }

  // 带缓存的请求
  async requestWithCache(config, cacheKey = null, cacheTime = 5 * 60 * 1000) {
    if (cacheKey) {
      const cached = cacheManager.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = await this.request(config)
    
    if (cacheKey && result.success) {
      cacheManager.set(cacheKey, result, cacheTime)
    }

    return result
  }

  // 主要请求方法
  async request(config) {
    const requestId = this.generateRequestId(config)
    
    // 检查重复请求
    if (this.isDuplicateRequest(requestId)) {
      return this.getFromQueue(requestId)
    }

    const promise = this._makeRequest(config, requestId)
    this.addToQueue(requestId, promise)
    
    try {
      const result = await promise
      return result
    } finally {
      this.removeFromQueue(requestId)
    }
  }

  // 实际发起请求
  async _makeRequest(config, requestId) {
    const { retryTimes = this.retryTimes, retryDelay = this.retryDelay } = config
    
    for (let i = 0; i <= retryTimes; i++) {
      try {
        return await this._singleRequest(config)
      } catch (error) {
        if (i === retryTimes) {
          throw error
        }
        
        // 等待后重试
        await this.delay(retryDelay * (i + 1))
      }
    }
  }

  // 单次请求
  async _singleRequest(config) {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data, header = {}, timeout = this.timeout } = config
      
      wx.request({
        url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
        method: method.toUpperCase(),
        data,
        header: {
          'Content-Type': 'application/json',
          ...header
        },
        timeout,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              data: res.data,
              statusCode: res.statusCode,
              header: res.header
            })
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.data?.message || '请求失败'}`))
          }
        },
        fail: (error) => {
          reject(new Error(error.errMsg || '网络请求失败'))
        }
      })
    })
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // GET请求
  async get(url, data = {}, config = {}) {
    return this.request({
      url,
      method: 'GET',
      data,
      ...config
    })
  }

  // POST请求
  async post(url, data = {}, config = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...config
    })
  }

  // PUT请求
  async put(url, data = {}, config = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...config
    })
  }

  // DELETE请求
  async delete(url, data = {}, config = {}) {
    return this.request({
      url,
      method: 'DELETE',
      data,
      ...config
    })
  }

  // 上传文件
  async uploadFile(filePath, name = 'file', formData = {}) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${this.baseURL}/upload`,
        filePath,
        name,
        formData,
        header: {
          'Content-Type': 'multipart/form-data'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(res.data)
              resolve({
                success: true,
                data
              })
            } catch (error) {
              reject(new Error('响应数据解析失败'))
            }
          } else {
            reject(new Error(`上传失败: ${res.statusCode}`))
          }
        },
        fail: (error) => {
          reject(new Error(error.errMsg || '文件上传失败'))
        }
      })
    })
  }

  // 下载文件
  async downloadFile(url, config = {}) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url,
        ...config,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve({
              success: true,
              data: res.tempFilePath,
              statusCode: res.statusCode
            })
          } else {
            reject(new Error(`下载失败: ${res.statusCode}`))
          }
        },
        fail: (error) => {
          reject(new Error(error.errMsg || '文件下载失败'))
        }
      })
    })
  }

  // 批量请求
  async batch(requests) {
    const promises = requests.map(req => this.request(req))
    return Promise.allSettled(promises)
  }

  // 取消所有请求
  cancelAll() {
    this.requestQueue.clear()
  }

  // 获取请求统计
  getStats() {
    return {
      queueSize: this.requestQueue.size,
      pendingRequests: Array.from(this.requestQueue.keys())
    }
  }
}

// 云函数请求封装
class CloudFunctionManager {
  constructor() {
    this.timeout = 30000 // 云函数超时时间
  }

  // 调用云函数
  async callFunction(name, data = {}) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('云函数调用超时'))
      }, this.timeout)

      wx.cloud.callFunction({
        name,
        data,
        success: (res) => {
          clearTimeout(timeoutId)
          if (res.result && res.result.success !== false) {
            resolve(res.result)
          } else {
            reject(new Error(res.result?.message || '云函数调用失败'))
          }
        },
        fail: (error) => {
          clearTimeout(timeoutId)
          reject(new Error(error.errMsg || '云函数调用失败'))
        }
      })
    })
  }

  // 带缓存的云函数调用
  async callFunctionWithCache(name, data = {}, cacheKey = null, cacheTime = 5 * 60 * 1000) {
    if (cacheKey) {
      const cached = cacheManager.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const result = await this.callFunction(name, data)
    
    if (cacheKey && result.success !== false) {
      cacheManager.set(cacheKey, result, cacheTime)
    }

    return result
  }

  // 批量调用云函数
  async batchCall(functions) {
    const promises = functions.map(({ name, data }) => this.callFunction(name, data))
    return Promise.allSettled(promises)
  }
}

// 创建实例
const networkManager = new NetworkManager()
const cloudFunctionManager = new CloudFunctionManager()

module.exports = {
  networkManager,
  cloudFunctionManager,
  NetworkManager,
  CloudFunctionManager
}