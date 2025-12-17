# BBK数学答题王 - 部署指南 🚀

本指南提供多种免费部署方案,选择其中一种即可。

---

## 方案一: Vercel 部署 (推荐 ⭐)

**优点**: 完全免费、部署速度快、自动HTTPS

### 步骤:

1. **注册 Vercel 账号**
   - 访问: https://vercel.com
   - 使用 GitHub/GitLab/Email 注册

2. **上传代码到 GitHub**
   ```bash
   # 在项目目录下执行
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   
   # 在 GitHub 创建仓库后
   git remote add origin https://github.com/你的用户名/bbk-game.git
   git push -u origin main
   ```

3. **在 Vercel 导入项目**
   - 登录 Vercel
   - 点击 "New Project"
   - 导入你的 GitHub 仓库
   - 点击 "Deploy"

4. **完成!**
   - Vercel 会自动部署
   - 获得地址如: `https://bbk-game.vercel.app`

### 注意事项:
- Vercel 使用无服务器架构,数据存储需要使用外部数据库
- 建议集成 MongoDB Atlas (免费) 或 Supabase

---

## 方案二: Railway 部署

**优点**: 支持持久化存储、有免费额度

### 步骤:

1. **注册 Railway**
   - 访问: https://railway.app
   - 使用 GitHub 登录

2. **上传代码到 GitHub** (同方案一)

3. **部署到 Railway**
   - 登录 Railway
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库
   - 自动检测并部署

4. **获取访问地址**
   - 在 Settings → Networking 中生成域名
   - 如: `https://bbk-game.up.railway.app`

---

## 方案三: Render 部署

**优点**: 完全免费、支持数据持久化

### 步骤:

1. **注册 Render**
   - 访问: https://render.com
   - 使用 GitHub 登录

2. **上传代码到 GitHub** (同方案一)

3. **创建 Web Service**
   - 点击 "New +" → "Web Service"
   - 连接 GitHub 仓库
   - 配置:
     - Name: bbk-math-game
     - Build Command: `npm install`
     - Start Command: `npm start`
   - 点击 "Create Web Service"

4. **完成!**
   - 获得地址如: `https://bbk-math-game.onrender.com`

---

## 方案四: Glitch 部署 (最简单)

**优点**: 无需 Git、在线编辑、即时部署

### 步骤:

1. **访问 Glitch**
   - 访问: https://glitch.com
   - 注册账号

2. **创建新项目**
   - 点击 "New Project" → "glitch-hello-node"

3. **上传文件**
   - 删除默认文件
   - 上传所有项目文件

4. **完成!**
   - 自动部署
   - 获得地址如: `https://bbk-game.glitch.me`

---

## 方案五: 腾讯云 CloudBase (国内推荐)

**优点**: 国内访问快、有免费额度、支持微信小程序

### 步骤:

1. **注册腾讯云**
   - 访问: https://cloud.tencent.com/product/tcb

2. **创建云开发环境**
   - 进入控制台
   - 创建新环境

3. **部署代码**
   - 安装 CLI: `npm install -g @cloudbase/cli`
   - 登录: `cloudbase login`
   - 部署: `cloudbase functions:deploy`

---

## 方案六: 自己的服务器

如果你有自己的服务器(VPS/云服务器):

### Linux 服务器部署:

```bash
# 1. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 上传代码
scp -r ./* user@你的服务器IP:/home/user/bbk-game/

# 3. SSH 连接服务器
ssh user@你的服务器IP

# 4. 安装依赖
cd /home/user/bbk-game
npm install

# 5. 安装 PM2 (进程管理)
sudo npm install -g pm2

# 6. 启动应用
pm2 start server.js --name bbk-game

# 7. 设置开机自启
pm2 startup
pm2 save

# 8. 查看状态
pm2 status
pm2 logs bbk-game
```

### 配置域名和 HTTPS:

```bash
# 安装 Nginx
sudo apt install nginx

# 配置反向代理
sudo nano /etc/nginx/sites-available/bbk-game

# 添加配置:
server {
    listen 80;
    server_name 你的域名.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 启用配置
sudo ln -s /etc/nginx/sites-available/bbk-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 安装 SSL 证书 (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名.com
```

---

## 数据持久化方案

由于云平台可能不支持文件存储,建议使用数据库:

### 选项 1: MongoDB Atlas (免费 512MB)
```javascript
// 安装: npm install mongodb
const { MongoClient } = require('mongodb');
const uri = "你的MongoDB连接字符串";
```

### 选项 2: Supabase (免费 500MB)
```javascript
// 安装: npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');
```

### 选项 3: 保持 JSON 文件存储
- Railway、Render 支持持久化卷
- 在设置中配置 Volume/Persistent Disk

---

## 推荐方案总结

| 平台 | 难度 | 费用 | 国内访问 | 持久化 | 推荐度 |
|------|------|------|----------|--------|--------|
| Glitch | ⭐ | 免费 | 慢 | ✅ | ⭐⭐⭐⭐ |
| Vercel | ⭐⭐ | 免费 | 较慢 | ❌ | ⭐⭐⭐ |
| Railway | ⭐⭐ | 免费额度 | 较慢 | ✅ | ⭐⭐⭐⭐⭐ |
| Render | ⭐⭐ | 免费 | 较慢 | ✅ | ⭐⭐⭐⭐ |
| CloudBase | ⭐⭐⭐ | 免费额度 | 快 | ✅ | ⭐⭐⭐⭐⭐ |
| 自己服务器 | ⭐⭐⭐⭐ | 付费 | 取决于服务器 | ✅ | ⭐⭐⭐⭐ |

---

## 快速开始 (Railway - 最推荐)

```bash
# 1. 初始化 Git
git init
git add .
git commit -m "Initial commit"

# 2. 创建 GitHub 仓库并推送
# (在 GitHub 网站创建仓库)
git remote add origin https://github.com/你的用户名/bbk-game.git
git push -u origin main

# 3. 访问 Railway.app
# 4. 使用 GitHub 登录
# 5. New Project → Deploy from GitHub
# 6. 选择仓库 → Deploy
# 7. 完成! 获得访问链接
```

---

## 环境变量配置

部署后可能需要设置环境变量:

```bash
NODE_ENV=production
PORT=3000
```

---

## 故障排查

### 问题1: 部署后无法访问
- 检查端口配置 (使用 `process.env.PORT`)
- 查看构建日志

### 问题2: 数据丢失
- 使用数据库替代 JSON 文件
- 或配置持久化存储卷

### 问题3: 跨域问题
- 服务器已配置 CORS
- 检查 `app.js` 中的 `SERVER_URL`

---

## 获取帮助

- Vercel 文档: https://vercel.com/docs
- Railway 文档: https://docs.railway.app
- Render 文档: https://render.com/docs

---

**祝部署成功! 🎉**

如有问题,请检查日志或联系平台客服。
