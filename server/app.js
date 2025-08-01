const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const WebSocket = require('ws')
const http = require('http')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

// 中间件
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// 模拟数据存储
let users = new Map()
let diceRecords = []
let chatRooms = new Map()

// 微信登录接口
app.post('/api/auth/login', async (req, res) => {
  try {
    const { code, userInfo, encryptedData, iv } = req.body
    
    // 这里应该调用微信API验证code和解密用户信息
    // 暂时使用模拟数据
    const mockUser = {
      openid: 'mock_openid_' + Date.now(),
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      gender: userInfo.gender || (Math.random() > 0.5 ? 1 : 2),
      city: userInfo.city || '北京',
      province: userInfo.province || '北京',
      country: userInfo.country || '中国',
      createTime: new Date().toISOString()
    }
    
    // 生成token
    const token = 'token_' + mockUser.openid + '_' + Date.now()
    
    // 保存用户信息
    users.set(mockUser.openid, {
      ...mockUser,
      token: token,
      lastActiveTime: new Date().toISOString()
    })
    
    res.json({
      success: true,
      message: '登录成功',
      token: token,
      openid: mockUser.openid,
      userInfo: mockUser
    })
    
  } catch (error) {
    console.error('登录失败：', error)
    res.status(500).json({
      success: false,
      message: '登录失败'
    })
  }
})

// 提交摇骰结果
app.post('/api/dice/submit', (req, res) => {
  try {
    const { result, location, timestamp } = req.body
    const token = req.headers.authorization
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      })
    }
    
    // 查找用户
    const user = Array.from(users.values()).find(u => u.token === token)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 保存摇骰记录
    const record = {
      id: Date.now(),
      userId: user.openid,
      result: result,
      location: location,
      timestamp: timestamp || Date.now(),
      createTime: new Date().toISOString()
    }
    
    diceRecords.push(record)
    
    res.json({
      success: true,
      message: '提交成功',
      recordId: record.id
    })
    
  } catch (error) {
    console.error('提交摇骰结果失败：', error)
    res.status(500).json({
      success: false,
      message: '提交失败'
    })
  }
})

// 查找匹配用户
app.get('/api/match/find', (req, res) => {
  try {
    const { result, latitude, longitude } = req.query
    const token = req.headers.authorization
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      })
    }
    
    // 查找当前用户
    const currentUser = Array.from(users.values()).find(u => u.token === token)
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 查找相同点数的异性用户（最近5分钟内摇的）
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const matchingRecords = diceRecords.filter(record => {
      const user = users.get(record.userId)
      return record.result == result &&
             record.timestamp > fiveMinutesAgo &&
             user &&
             user.openid !== currentUser.openid &&
             user.gender !== currentUser.gender
    })
    
    // 计算距离并排序
    const matches = matchingRecords.map(record => {
      const user = users.get(record.userId)
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        record.location.latitude,
        record.location.longitude
      )
      
      return {
        id: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        age: Math.floor(Math.random() * 20) + 20, // 模拟年龄
        diceResult: record.result,
        distance: Math.round(distance),
        timestamp: record.timestamp
      }
    }).sort((a, b) => a.distance - b.distance)
    
    res.json({
      success: true,
      matches: matches.slice(0, 10) // 最多返回10个匹配
    })
    
  } catch (error) {
    console.error('查找匹配失败：', error)
    res.status(500).json({
      success: false,
      message: '查找失败'
    })
  }
})

// 获取用户信息
app.get('/api/user/info', (req, res) => {
  try {
    const token = req.headers.authorization
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      })
    }
    
    const user = Array.from(users.values()).find(u => u.token === token)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 统计数据
    const userRecords = diceRecords.filter(r => r.userId === user.openid)
    
    res.json({
      success: true,
      userInfo: {
        openid: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        city: user.city,
        totalDiceCount: userRecords.length,
        matchCount: Math.floor(Math.random() * 20) + 5,
        chatCount: Math.floor(Math.random() * 10) + 2
      }
    })
    
  } catch (error) {
    console.error('获取用户信息失败：', error)
    res.status(500).json({
      success: false,
      message: '获取失败'
    })
  }
})

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  console.log('新的WebSocket连接')
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      console.log('收到消息：', data)
      
      switch (data.type) {
        case 'join':
          // 用户加入聊天室
          ws.userId = data.userId
          ws.roomId = data.roomId
          
          if (!chatRooms.has(data.roomId)) {
            chatRooms.set(data.roomId, new Set())
          }
          chatRooms.get(data.roomId).add(ws)
          
          console.log(`用户 ${data.userId} 加入聊天室 ${data.roomId}`)
          break
          
        case 'message':
          // 转发消息到聊天室其他用户
          if (ws.roomId && chatRooms.has(ws.roomId)) {
            const room = chatRooms.get(ws.roomId)
            room.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'message',
                  data: data.data
                }))
              }
            })
          }
          break
          
        case 'typing':
          // 转发正在输入状态
          if (ws.roomId && chatRooms.has(ws.roomId)) {
            const room = chatRooms.get(ws.roomId)
            room.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'typing',
                  isTyping: data.isTyping
                }))
              }
            })
          }
          break
      }
    } catch (error) {
      console.error('处理WebSocket消息失败：', error)
    }
  })
  
  ws.on('close', () => {
    console.log('WebSocket连接关闭')
    
    // 从聊天室移除
    if (ws.roomId && chatRooms.has(ws.roomId)) {
      const room = chatRooms.get(ws.roomId)
      room.delete(ws)
      
      if (room.size === 0) {
        chatRooms.delete(ws.roomId)
      }
    }
  })
})

// 计算两点间距离（公里）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // 地球半径(km)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  return distance * 1000 // 返回米
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    users: users.size,
    diceRecords: diceRecords.length,
    chatRooms: chatRooms.size
  })
})

// 启动服务器
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`HTTP API: http://localhost:${PORT}`)
  console.log(`WebSocket: ws://localhost:${PORT}`)
})