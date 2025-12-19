# Railway 部署指南 - BBK数学答题王

## 🚀 为什么选择 Railway？

✅ 支持文件读写（数据持久化）  
✅ 免费额度充足  
✅ 部署简单，无需改代码  
✅ 自动 HTTPS  
✅ 性能稳定  

---

## 📝 详细部署步骤

### 方法一：直接从文件夹部署（最简单）

#### 1️⃣ 准备工作
- 访问 https://railway.app
- 使用 GitHub 或 Email 注册登录

#### 2️⃣ 创建新项目
- 点击 **"New Project"**
- 选择 **"Deploy from GitHub repo"**
- 或选择 **"Empty Project"** 然后手动上传

#### 3️⃣ 配置项目
如果选择 "Empty Project"：
1. 点击 **"Deploy"** 
2. 选择 **"Deploy from local directory"**
3. 安装 Railway CLI（如果需要）

#### 4️⃣ 使用 Railway CLI 部署
```bash
# 安装 Railway CLI（如果系统允许）
npm install -g @railway/cli

# 登录 Railway
railway login

# 初始化项目
railway init

# 部署
railway up
```

#### 5️⃣ 生成公网域名
- 在项目页面点击 **"Settings"**
- 找到 **"Networking"** 或 **"Domains"**
- 点击 **"Generate Domain"**
- 获得网址如：`https://bbk-game.up.railway.app`

---

### 方法二：通过 GitHub 部署（推荐）

#### 1️⃣ 创建 GitHub 仓库
1. 访问 https://github.com/new
2. 仓库名：`bbk-math-game`
3. 设为 Private（私有）
4. 点击 **"Create repository"**

#### 2️⃣ 上传文件到 GitHub
由于你的系统没有 Git，使用网页上传：
1. 在 GitHub 仓库页面点击 **"Add file"** → **"Upload files"**
2. 将项目所有文件拖拽上传（注意：不要上传 `node_modules` 文件夹）
3. 点击 **"Commit changes"**

需要上传的文件：
```
✅ server.js
✅ app.js
✅ index.html
✅ styles.css
✅ admin.html
✅ admin.js
✅ admin-style.css
✅ audio-manager.js
✅ package.json
✅ package-lock.json
✅ questions.json
✅ students.json
✅ data.json
✅ vercel.json
✅ railway.json
✅ render.yaml
✅ audio/ 文件夹（所有音频文件）
✅ 所有 .md 和 .txt 文件
```

❌ 不要上传：
```
❌ node_modules/
```

#### 3️⃣ 在 Railway 部署
1. 访问 https://railway.app
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 选择你刚创建的 `bbk-math-game` 仓库
5. Railway 自动检测到 Node.js 项目并开始部署
6. 等待 2-3 分钟部署完成

#### 4️⃣ 生成域名
- 部署完成后，点击项目
- 进入 **"Settings"** 标签
- 找到 **"Networking"** 部分
- 点击 **"Generate Domain"**
- 获得公网访问地址

---

## ⚙️ Railway 配置文件

你的项目已经包含 `railway.json`，配置如下：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

这个配置会自动被 Railway 识别！

---

## 🎯 部署后测试

1. 访问生成的域名（如 `https://bbk-game.up.railway.app`）
2. 应该能看到登录页面
3. 测试登录功能
4. 测试答题功能
5. 测试管理后台（访问 `/admin.html`）

---

## 🔍 故障排查

### 如果部署失败：

1. **查看日志**
   - 在 Railway 项目页面点击 **"Deployments"**
   - 点击最新的部署
   - 查看 **"Logs"** 标签

2. **常见问题**
   - 端口错误：确保使用 `process.env.PORT`
   - 依赖缺失：检查 `package.json`
   - 文件路径：使用 `path.join(__dirname, ...)`

3. **重新部署**
   - 在 Railway 点击 **"Redeploy"**
   - 或推送新代码到 GitHub

---

## 💡 提示

- Railway 免费版有每月 500 小时运行时间（约 20 天）
- 如果不够用，可以添加信用卡获得 $5 免费额度
- 数据会持久化保存
- 每次推送代码到 GitHub 会自动重新部署

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. Railway 部署日志截图
2. 错误信息
3. 访问网址

我会立即帮你解决！
