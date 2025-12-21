# Render 持久化存储配置指南

## 问题说明

Render 免费版容器重启后会丢失文件系统数据，导致 `data.json` 每天清零。

## 解决方案：配置 Persistent Disk

### 方法 1：通过 Dashboard 配置（推荐）

1. **登录 Render Dashboard**
   - 访问：https://dashboard.render.com/

2. **选择你的服务**
   - 找到 `bbk-math-game` 服务

3. **添加持久化磁盘**
   - 点击左侧菜单 `Disks`
   - 点击 `Add Disk`
   - 配置如下：
     ```
     Name: bbk-game-data
     Mount Path: /app/data
     Size: 1 GB
     ```
   - 点击 `Save`

4. **配置环境变量**
   - 点击左侧菜单 `Environment`
   - 添加环境变量：
     ```
     KEY: DATA_DIR
     VALUE: /app/data
     ```
   - 点击 `Save Changes`

5. **重新部署**
   - 服务会自动重启
   - 数据将持久化保存到磁盘

### 方法 2：通过 render.yaml 配置

已经在 `render.yaml` 中配置好了：

```yaml
disk:
  name: bbk-game-data
  mountPath: /app/data
  sizeGB: 1

envVars:
  - key: DATA_DIR
    value: /app/data
```

**推送代码到 GitHub 即可自动生效**：

```bash
git add .
git commit -m "添加 Render 持久化存储配置"
git push origin main
```

## 验证数据持久化

### 1. 查看日志

部署后查看启动日志，应该看到：

```
📁 数据存储目录: /app/data
```

### 2. 测试数据保存

1. 登录游戏，答几道题
2. 手动重启服务（Dashboard > Manual Deploy）
3. 再次登录，检查数据是否保留

### 3. 检查文件位置

通过 Render Shell 查看：

```bash
ls -la /app/data/
```

应该看到：
- `data.json` - 用户游戏数据

## 注意事项

### 免费版限制

- ✅ **1 GB 免费存储空间**（足够使用）
- ⚠️ **容器 15 分钟无活动会休眠**（首次访问需要等待启动）
- ✅ **磁盘数据永久保留**（不会因重启丢失）

### 数据备份建议

定期通过管理后台导出数据：

1. 访问：`https://你的域名.onrender.com/admin.html`
2. 登录后台（密码：`bbk2024admin`）
3. 点击 `导出所有数据`
4. 保存 JSON 文件到本地

### 迁移现有数据

如果之前有数据需要恢复：

1. 下载本地 `data.json`
2. 通过 Render Shell 上传：
   ```bash
   # 使用 Render Shell
   cd /app/data
   # 复制本地 data.json 内容粘贴保存
   ```

## 其他持久化方案

如果 Render Disk 遇到问题，可以考虑：

### 方案 A：使用免费数据库

- **MongoDB Atlas**（512MB 免费）
- **Supabase**（500MB 免费）
- **Railway PostgreSQL**（512MB 免费）

### 方案 B：换平台

- **Railway**：500 小时/月免费，自带持久化存储
- **Fly.io**：3 个免费实例，支持 Volume

## 技术原理

```javascript
// server.js 中的配置
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// 数据会保存到持久化磁盘
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2));
}
```

## 问题排查

### 数据还是丢失？

1. **检查环境变量**
   ```bash
   echo $DATA_DIR
   # 应该输出: /app/data
   ```

2. **检查磁盘挂载**
   ```bash
   df -h | grep /app/data
   ```

3. **检查文件权限**
   ```bash
   ls -la /app/data/data.json
   ```

4. **查看保存日志**
   - Dashboard > Logs
   - 搜索 "保存数据" 或 "saveData"

## 成本说明

- **Disk**: 1 GB 免费 ✅
- **超出**: $0.25/GB/月
- **建议**: 1 GB 足够数千名学生使用

---

配置完成后，数据将永久保存，不会因容器重启而丢失！
