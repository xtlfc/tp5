const app = getApp()

Page({
  data: {
    userInfo: null,
    location: null,
    isShaking: false,
    result: 0,
    currentFace: 1,
    isMatching: false,
    matchUser: null,
    recentRecords: [],
    
    // 骰子点数对应的点位置
    dots: {
      1: [1],
      2: [1, 1],
      3: [1, 1, 1],
      4: [1, 1, 1, 1],
      5: [1, 1, 1, 1, 1],
      6: [1, 1, 1, 1, 1, 1]
    },
    
    // 传感器相关
    lastX: 0,
    lastY: 0,
    lastZ: 0,
    shakeThreshold: 800,
    isAccelerometerActive: false
  },

  onLoad: function(options) {
    console.log('摇骰子页面加载')
    this.initPage()
  },

  onShow: function() {
    console.log('摇骰子页面显示')
    this.startAccelerometer()
  },

  onHide: function() {
    console.log('摇骰子页面隐藏')
    this.stopAccelerometer()
  },

  onUnload: function() {
    this.stopAccelerometer()
  },

  // 初始化页面
  initPage: function() {
    // 获取用户信息
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }

    // 获取位置信息
    this.getLocation()
    
    // 加载历史记录
    this.loadRecentRecords()
  },

  // 获取地理位置
  getLocation: function() {
    const that = this
    
    wx.getLocation({
      type: 'gcj02',
      success: function(res) {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy
        }
        
        that.setData({
          location: location
        })
        
        // 保存位置信息
        app.globalData.location = location
        wx.setStorageSync('location', location)
        
        // 获取详细地址
        that.getLocationAddress(res.latitude, res.longitude)
      },
      fail: function() {
        wx.showToast({
          title: '获取位置失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  // 获取详细地址（逆地理编码）
  getLocationAddress: function(lat, lng) {
    // 这里应该调用地图API获取详细地址，暂时使用模拟数据
    const mockAddress = '北京市朝阳区'
    this.setData({
      'location.address': mockAddress
    })
  },

  // 开始加速度计监听
  startAccelerometer: function() {
    const that = this
    
    if (this.data.isAccelerometerActive) return
    
    wx.startAccelerometer({
      interval: 'normal',
      success: function() {
        that.setData({
          isAccelerometerActive: true
        })
        
        wx.onAccelerometerChange(function(res) {
          that.handleAccelerometerChange(res)
        })
      },
      fail: function() {
        console.log('开启加速度计失败')
      }
    })
  },

  // 停止加速度计监听
  stopAccelerometer: function() {
    if (this.data.isAccelerometerActive) {
      wx.stopAccelerometer()
      wx.offAccelerometerChange()
      this.setData({
        isAccelerometerActive: false
      })
    }
  },

  // 处理加速度计数据
  handleAccelerometerChange: function(res) {
    if (this.data.isShaking || this.data.result) return
    
    const { x, y, z } = res
    const { lastX, lastY, lastZ } = this.data
    
    // 计算加速度变化
    const deltaX = Math.abs(x - lastX)
    const deltaY = Math.abs(y - lastY)
    const deltaZ = Math.abs(z - lastZ)
    const acceleration = deltaX + deltaY + deltaZ
    
    // 更新上次的值
    this.setData({
      lastX: x,
      lastY: y,
      lastZ: z
    })
    
    // 检测摇动
    if (acceleration > this.data.shakeThreshold / 1000) {
      this.startShakeDice()
    }
  },

  // 点击骰子
  onDiceClick: function() {
    if (this.data.isShaking || this.data.result) return
    this.startShakeDice()
  },

  // 开始摇骰子
  startShakeDice: function() {
    if (this.data.isShaking) return
    
    console.log('开始摇骰子')
    
    // 震动反馈
    wx.vibrateShort()
    
    this.setData({
      isShaking: true,
      result: 0,
      matchUser: null
    })
    
    // 骰子动画
    this.animateDice()
    
    // 3秒后停止摇动并显示结果
    setTimeout(() => {
      this.stopShakeDice()
    }, 3000)
  },

  // 骰子动画
  animateDice: function() {
    if (!this.data.isShaking) return
    
    const randomFace = Math.floor(Math.random() * 6) + 1
    this.setData({
      currentFace: randomFace
    })
    
    // 继续动画
    setTimeout(() => {
      this.animateDice()
    }, 100)
  },

  // 停止摇骰子
  stopShakeDice: function() {
    const result = Math.floor(Math.random() * 6) + 1
    
    this.setData({
      isShaking: false,
      result: result,
      currentFace: result
    })
    
    // 震动反馈
    wx.vibrateShort()
    
    // 保存记录
    this.saveRecord(result)
    
    console.log('摇骰子结果：', result)
  },

  // 保存摇骰子记录
  saveRecord: function(result) {
    const records = wx.getStorageSync('diceRecords') || []
    const newRecord = {
      id: Date.now(),
      result: result,
      time: this.formatTime(new Date()),
      timestamp: Date.now()
    }
    
    records.unshift(newRecord)
    
    // 只保留最近10条记录
    if (records.length > 10) {
      records.splice(10)
    }
    
    wx.setStorageSync('diceRecords', records)
    this.setData({
      recentRecords: records
    })
  },

  // 加载历史记录
  loadRecentRecords: function() {
    const records = wx.getStorageSync('diceRecords') || []
    this.setData({
      recentRecords: records
    })
  },

  // 寻找匹配
  findMatch: function() {
    if (!this.data.result || this.data.isMatching) return
    
    this.setData({
      isMatching: true
    })
    
    // 模拟匹配过程
    setTimeout(() => {
      this.performMatch()
    }, 2000)
  },

  // 执行匹配算法
  performMatch: function() {
    const myResult = this.data.result
    const myLocation = this.data.location
    const myGender = this.data.userInfo.gender || (Math.random() > 0.5 ? 1 : 2)
    
    // 模拟匹配用户数据
    const mockUsers = this.generateMockUsers(myResult, myLocation, myGender)
    
    if (mockUsers.length > 0) {
      // 找到距离最近的异性用户
      const matchUser = mockUsers[0]
      
      this.setData({
        isMatching: false,
        matchUser: matchUser
      })
      
      wx.showToast({
        title: '匹配成功！',
        icon: 'success'
      })
    } else {
      this.setData({
        isMatching: false
      })
      
      wx.showToast({
        title: '暂无匹配用户',
        icon: 'none'
      })
    }
  },

  // 生成模拟匹配用户
  generateMockUsers: function(targetResult, myLocation, myGender) {
    const oppositeGender = myGender === 1 ? 2 : 1
    const users = []
    
    // 生成5-10个模拟用户
    const userCount = Math.floor(Math.random() * 6) + 5
    
    for (let i = 0; i < userCount; i++) {
      // 随机生成是否有相同点数的用户
      const hasSameResult = Math.random() > 0.3 // 70%概率有相同点数的用户
      
      if (hasSameResult) {
        const distance = Math.floor(Math.random() * 10000) + 100 // 100m-10km
        
        users.push({
          id: 'mock_user_' + i,
          nickName: this.generateRandomName(),
          avatarUrl: this.generateRandomAvatar(),
          gender: oppositeGender,
          age: Math.floor(Math.random() * 20) + 20, // 20-40岁
          diceResult: targetResult,
          distance: distance,
          location: {
            latitude: myLocation.latitude + (Math.random() - 0.5) * 0.1,
            longitude: myLocation.longitude + (Math.random() - 0.5) * 0.1
          },
          timestamp: Date.now() - Math.floor(Math.random() * 300000) // 5分钟内摇的
        })
      }
    }
    
    // 按距离排序
    users.sort((a, b) => a.distance - b.distance)
    
    return users
  },

  // 生成随机姓名
  generateRandomName: function() {
    const surnames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴']
    const names = ['小明', '小红', '小华', '小李', '小王', '小张', '小刘', '小陈', '小杨', '小黄']
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)]
    const name = names[Math.floor(Math.random() * names.length)]
    
    return surname + name.substring(1)
  },

  // 生成随机头像
  generateRandomAvatar: function() {
    const avatars = [
      '/images/avatar1.png',
      '/images/avatar2.png', 
      '/images/avatar3.png',
      '/images/avatar4.png',
      '/images/avatar5.png'
    ]
    
    return avatars[Math.floor(Math.random() * avatars.length)]
  },

  // 开始聊天
  startChat: function() {
    if (!this.data.matchUser) return
    
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${this.data.matchUser.id}&userName=${this.data.matchUser.nickName}`
    })
  },

  // 跳过当前匹配
  passMatch: function() {
    this.setData({
      matchUser: null
    })
    
    // 继续寻找下一个匹配
    this.findMatch()
  },

  // 重置骰子
  resetDice: function() {
    this.setData({
      result: 0,
      currentFace: 1,
      matchUser: null,
      isMatching: false
    })
  },

  // 格式化时间
  formatTime: function(date) {
    const hour = date.getHours()
    const minute = date.getMinutes()
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  },

  // 格式化距离
  formatDistance: function(distance) {
    return app.formatDistance(distance)
  }
})