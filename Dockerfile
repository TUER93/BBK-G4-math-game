# 使用 Node.js 16 作为基础镜像
FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制所有项目文件
COPY . .

# 暴露端口（CloudBase 会自动分配）
EXPOSE 80

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 启动应用
CMD ["node", "server.js"]
