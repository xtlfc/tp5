// utils/cache/cache.js

class CacheManager {
  constructor() {
    this.cache = new Map()
    this.maxSize = 100 // 最大缓存数量
    this.expireTime = 5 * 60 * 1000 // 默认过期时间5分钟
  }

  // 设置缓存
  set(key, value, expireTime = this.expireTime) {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    const cacheItem = {
      value,
      timestamp: Date.now(),
      expireTime
    }

    this.cache.set(key, cacheItem)
    
    // 同时存储到本地存储
    try {
      wx.setStorageSync(`cache_${key}`, cacheItem)
    } catch (error) {
      console.error('缓存存储失败:', error)
    }
  }

  // 获取缓存
  get(key) {
    // 先从内存缓存获取
    let cacheItem = this.cache.get(key)
    
    if (!cacheItem) {
      // 从本地存储获取
      try {
        cacheItem = wx.getStorageSync(`cache_${key}`)
        if (cacheItem) {
          this.cache.set(key, cacheItem)
        }
      } catch (error) {
        console.error('缓存读取失败:', error)
      }
    }

    if (!cacheItem) {
      return null
    }

    // 检查是否过期
    if (Date.now() - cacheItem.timestamp > cacheItem.expireTime) {
      this.delete(key)
      return null
    }

    return cacheItem.value
  }

  // 删除缓存
  delete(key) {
    this.cache.delete(key)
    try {
      wx.removeStorageSync(`cache_${key}`)
    } catch (error) {
      console.error('缓存删除失败:', error)
    }
  }

  // 清空所有缓存
  clear() {
    this.cache.clear()
    try {
      const keys = wx.getStorageInfoSync().keys
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          wx.removeStorageSync(key)
        }
      })
    } catch (error) {
      console.error('缓存清空失败:', error)
    }
  }

  // 驱逐最旧的缓存
  evictOldest() {
    let oldestKey = null
    let oldestTime = Date.now()

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  // 获取缓存统计信息
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }

  // 预加载数据
  async preload(key, loader, expireTime = this.expireTime) {
    const cached = this.get(key)
    if (cached) {
      return cached
    }

    try {
      const data = await loader()
      this.set(key, data, expireTime)
      return data
    } catch (error) {
      console.error('预加载失败:', error)
      throw error
    }
  }

  // 批量设置缓存
  setBatch(items) {
    items.forEach(({ key, value, expireTime }) => {
      this.set(key, value, expireTime)
    })
  }

  // 批量获取缓存
  getBatch(keys) {
    const result = {}
    keys.forEach(key => {
      result[key] = this.get(key)
    })
    return result
  }
}

// 图片缓存管理器
class ImageCacheManager extends CacheManager {
  constructor() {
    super()
    this.maxSize = 50 // 图片缓存数量限制
    this.expireTime = 30 * 60 * 1000 // 图片缓存30分钟
  }

  // 预加载图片
  async preloadImage(url) {
    const key = `img_${this.hashCode(url)}`
    
    return this.preload(key, async () => {
      return new Promise((resolve, reject) => {
        wx.downloadFile({
          url: url,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.tempFilePath)
            } else {
              reject(new Error('图片下载失败'))
            }
          },
          fail: reject
        })
      })
    }, this.expireTime)
  }

  // 简单的哈希函数
  hashCode(str) {
    let hash = 0
    if (str.length === 0) return hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString()
  }
}

// 用户数据缓存管理器
class UserCacheManager extends CacheManager {
  constructor() {
    super()
    this.maxSize = 200
    this.expireTime = 10 * 60 * 1000 // 用户数据缓存10分钟
  }

  // 缓存用户信息
  cacheUser(userId, userData) {
    this.set(`user_${userId}`, userData, this.expireTime)
  }

  // 获取用户信息
  getUser(userId) {
    return this.get(`user_${userId}`)
  }

  // 缓存用户列表
  cacheUserList(key, userList) {
    this.set(`userlist_${key}`, userList, this.expireTime)
  }

  // 获取用户列表
  getUserList(key) {
    return this.get(`userlist_${key}`)
  }
}

// 消息缓存管理器
class MessageCacheManager extends CacheManager {
  constructor() {
    super()
    this.maxSize = 500
    this.expireTime = 24 * 60 * 60 * 1000 // 消息缓存24小时
  }

  // 缓存聊天消息
  cacheMessages(chatId, messages) {
    this.set(`messages_${chatId}`, messages, this.expireTime)
  }

  // 获取聊天消息
  getMessages(chatId) {
    return this.get(`messages_${chatId}`)
  }

  // 添加新消息
  addMessage(chatId, message) {
    const messages = this.getMessages(chatId) || []
    messages.push(message)
    this.cacheMessages(chatId, messages)
  }

  // 更新消息状态
  updateMessageStatus(chatId, messageId, status) {
    const messages = this.getMessages(chatId) || []
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex !== -1) {
      messages[messageIndex].status = status
      this.cacheMessages(chatId, messages)
    }
  }
}

// 导出缓存管理器实例
const cacheManager = new CacheManager()
const imageCache = new ImageCacheManager()
const userCache = new UserCacheManager()
const messageCache = new MessageCacheManager()

module.exports = {
  cacheManager,
  imageCache,
  userCache,
  messageCache,
  CacheManager,
  ImageCacheManager,
  UserCacheManager,
  MessageCacheManager
}