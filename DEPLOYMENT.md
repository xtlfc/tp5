# 缘分骰子小程序部署指南

本文档详细介绍了如何部署缘分骰子微信交友小程序的完整过程。

## 环境准备

### 1. 基础环境
- **微信开发者工具**: [下载地址](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- **Node.js**: 版本 >= 14.0.0
- **小程序AppID**: 在微信公众平台申请

### 2. 申请小程序
1. 访问 [微信公众平台](https://mp.weixin.qq.com)
2. 注册小程序账号
3. 获取AppID和AppSecret
4. 配置服务器域名

## 前端部署

### 1. 项目配置

修改 `project.config.json` 文件：
```json
{
  "appid": "你的小程序AppID",
  "projectname": "dice-dating-miniprogram"
}
```

修改 `app.js` 中的API地址：
```javascript
globalData: {
  apiUrl: 'https://your-api-domain.com/api' // 替换为实际的后端API地址
}
```

### 2. 图片资源

在 `images/` 目录中添加必要的图片文件：

```
images/
├── logo.png              # 应用Logo (200x200)
├── dice.png              # 骰子图标 (64x64)
├── dice-active.png       # 激活状态骰子图标
├── chat.png              # 聊天图标
├── chat-active.png       # 激活状态聊天图标
├── profile.png           # 个人中心图标
├── profile-active.png    # 激活状态个人中心图标
├── location.png          # 位置图标
├── shake.png             # 摇动提示图标
├── wechat.png            # 微信图标
├── loading.gif           # 加载动画
├── voice.png             # 语音图标
├── emoji.png             # 表情图标
├── image.png             # 图片图标
├── camera.png            # 相机图标
├── voice-input.png       # 语音输入图标
├── video-call.png        # 视频通话图标
├── voice-call.png        # 语音通话图标
├── edit.png              # 编辑图标
├── history.png           # 历史记录图标
├── match.png             # 匹配图标
├── chat-list.png         # 聊天列表图标
├── settings.png          # 设置图标
├── help.png              # 帮助图标
├── about.png             # 关于图标
├── arrow-right.png       # 右箭头图标
├── avatar1.png           # 头像占位图1
├── avatar2.png           # 头像占位图2
├── avatar3.png           # 头像占位图3
├── avatar4.png           # 头像占位图4
└── avatar5.png           # 头像占位图5
```

### 3. 小程序发布

1. 在微信开发者工具中打开项目
2. 点击"上传"按钮
3. 填写版本号和项目备注
4. 在微信公众平台提交审核
5. 审核通过后发布

## 后端部署

### 1. 服务器准备

推荐使用云服务器（阿里云、腾讯云、AWS等）：
- **配置**: 2核4GB内存起
- **系统**: Ubuntu 20.04 LTS
- **域名**: 需要备案的域名

### 2. 环境安装

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt install nginx -y

# 安装SSL证书工具
sudo apt install certbot python3-certbot-nginx -y
```

### 3. 代码部署

```bash
# 克隆代码到服务器
git clone <your-repo-url> /var/www/dice-dating
cd /var/www/dice-dating/server

# 安装依赖
npm install --production

# 启动服务
pm2 start app.js --name dice-dating-server
pm2 startup
pm2 save
```

### 4. Nginx配置

创建 `/etc/nginx/sites-available/dice-dating` 文件：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # HTTP重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket代理
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/dice-dating /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL证书

```bash
# 申请证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 微信小程序配置

### 1. 服务器域名配置

在微信公众平台-开发-开发设置中配置：

- **request合法域名**: `https://your-domain.com`
- **socket合法域名**: `wss://your-domain.com`
- **uploadFile合法域名**: `https://your-domain.com`
- **downloadFile合法域名**: `https://your-domain.com`

### 2. 业务域名配置

如需使用web-view组件，在业务域名中添加：
- `https://your-domain.com`

### 3. 微信登录配置

修改后端的微信登录逻辑，集成真实的微信API：

```javascript
const axios = require('axios')

// 微信登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { code } = req.body
    
    // 调用微信API获取session_key和openid
    const response = await axios.get(`https://api.weixin.qq.com/sns/jscode2session`, {
      params: {
        appid: 'YOUR_APPID',
        secret: 'YOUR_SECRET',
        js_code: code,
        grant_type: 'authorization_code'
      }
    })
    
    const { openid, session_key } = response.data
    
    // 处理用户信息...
    
  } catch (error) {
    // 错误处理...
  }
})
```

## 数据库配置（可选）

### 1. MongoDB安装

```bash
# 安装MongoDB
sudo apt install mongodb -y

# 启动服务
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### 2. MySQL安装

```bash
# 安装MySQL
sudo apt install mysql-server -y

# 安全配置
sudo mysql_secure_installation

# 创建数据库
mysql -u root -p
CREATE DATABASE dice_dating;
```

### 3. Redis安装

```bash
# 安装Redis
sudo apt install redis-server -y

# 启动服务
sudo systemctl start redis
sudo systemctl enable redis
```

## 监控和日志

### 1. PM2监控

```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs dice-dating-server

# 重启服务
pm2 restart dice-dating-server
```

### 2. Nginx日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 3. 系统监控

安装监控工具：
```bash
# 安装htop
sudo apt install htop -y

# 查看系统资源
htop
```

## 安全配置

### 1. 防火墙设置

```bash
# 安装ufw
sudo apt install ufw -y

# 配置规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# 启用防火墙
sudo ufw enable
```

### 2. 系统安全

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 设置自动安全更新
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades
```

## 性能优化

### 1. Nginx优化

在 `/etc/nginx/nginx.conf` 中添加：

```nginx
http {
    # 启用gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # 缓存配置
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. 应用优化

```javascript
// 启用连接池
const mysql = require('mysql2');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'dice_dating',
  connectionLimit: 10
});

// 使用Redis缓存
const redis = require('redis');
const client = redis.createClient();
```

## 故障排除

### 1. 常见问题

**问题**: 小程序无法连接服务器
- 检查域名配置是否正确
- 确认SSL证书有效
- 检查服务器防火墙设置

**问题**: WebSocket连接失败
- 确认wss://协议配置
- 检查Nginx代理配置
- 验证WebSocket代码逻辑

**问题**: 用户登录失败
- 检查微信AppID和Secret
- 确认code是否过期
- 验证API接口返回

### 2. 日志分析

```bash
# 应用日志
pm2 logs dice-dating-server --lines 100

# Nginx错误日志
sudo tail -100 /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx -f
```

## 维护和更新

### 1. 定期维护

```bash
# 每周执行
sudo apt update && sudo apt upgrade -y
pm2 restart all
sudo systemctl reload nginx
```

### 2. 备份策略

```bash
# 数据备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --out /backup/mongodb_$DATE
tar -czf /backup/app_$DATE.tar.gz /var/www/dice-dating
```

### 3. 版本更新

```bash
# 代码更新
cd /var/www/dice-dating
git pull origin main
cd server
npm install --production
pm2 restart dice-dating-server
```

## 总结

完成以上步骤后，您的缘分骰子小程序就可以正常运行了。记住要定期备份数据和更新系统，确保应用的安全性和稳定性。

如果遇到问题，请参考故障排除部分或联系技术支持。