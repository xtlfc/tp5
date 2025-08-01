# 缘分骰子后端服务

这是缘分骰子微信小程序的后端服务，提供用户认证、摇骰匹配和实时聊天功能。

## 功能特性

- 用户登录认证
- 摇骰结果提交和匹配
- 基于地理位置的距离计算
- WebSocket实时聊天
- 简单的内存数据存储

## 技术栈

- Node.js + Express
- WebSocket (ws)
- CORS跨域支持
- Body-parser解析

## 快速开始

### 安装依赖

```bash
cd server
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 启动生产服务器

```bash
npm start
```

服务器默认运行在 `http://localhost:3000`

## API接口

### 1. 用户登录
- **URL**: `POST /api/auth/login`
- **参数**: 
  ```json
  {
    "code": "微信登录code",
    "userInfo": "用户信息",
    "encryptedData": "加密数据",
    "iv": "初始向量"
  }
  ```
- **返回**: 
  ```json
  {
    "success": true,
    "token": "访问令牌",
    "openid": "用户openid",
    "userInfo": "用户信息"
  }
  ```

### 2. 提交摇骰结果
- **URL**: `POST /api/dice/submit`
- **Headers**: `Authorization: token`
- **参数**: 
  ```json
  {
    "result": 1-6,
    "location": {
      "latitude": 纬度,
      "longitude": 经度
    },
    "timestamp": 时间戳
  }
  ```

### 3. 查找匹配用户
- **URL**: `GET /api/match/find?result=1&latitude=39.9&longitude=116.4`
- **Headers**: `Authorization: token`
- **返回**: 匹配的用户列表

### 4. 获取用户信息
- **URL**: `GET /api/user/info`
- **Headers**: `Authorization: token`
- **返回**: 用户详细信息和统计数据

### 5. 健康检查
- **URL**: `GET /health`
- **返回**: 服务器状态信息

## WebSocket消息

### 连接聊天室
```json
{
  "type": "join",
  "userId": "用户ID",
  "roomId": "聊天室ID"
}
```

### 发送消息
```json
{
  "type": "message",
  "data": {
    "content": "消息内容",
    "messageType": "text|image|voice"
  }
}
```

### 正在输入
```json
{
  "type": "typing",
  "isTyping": true
}
```

## 数据存储

当前版本使用内存存储，重启服务器会丢失数据。生产环境建议使用：

- **数据库**: MongoDB / MySQL
- **缓存**: Redis
- **文件存储**: OSS / S3

## 部署说明

### 环境变量

```bash
PORT=3000                    # 服务端口
NODE_ENV=production         # 环境模式
```

### Docker部署

```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### PM2部署

```bash
npm install -g pm2
pm2 start app.js --name dice-dating-server
pm2 startup
pm2 save
```

## 安全注意事项

1. **生产环境**需要实现真实的微信登录验证
2. **添加请求频率限制**防止滥用
3. **验证用户输入**防止注入攻击
4. **使用HTTPS**保护数据传输
5. **实现内容审核**防止不当内容

## 扩展功能

- [ ] 数据库持久化存储
- [ ] 用户认证和授权
- [ ] 消息推送服务
- [ ] 内容审核机制
- [ ] 数据统计分析
- [ ] 日志记录和监控

## 许可证

MIT License