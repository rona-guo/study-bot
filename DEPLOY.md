# 错题本智能体 - Vercel 部署指南

## 前置准备
1. 注册 Vercel 账号：https://vercel.com（推荐用 GitHub 登录）

## 部署步骤

### 方式一：GitHub 导入（推荐）

1. **创建 GitHub 仓库**
   - 登录 GitHub：https://github.com
   - 点击 "New repository"
   - 仓库名：`study-bot`
   - 设为 Private
   - 点击 "Create repository"

2. **上传代码**
   ```bash
   # 在项目根目录执行
   cd /workspace/projects
   
   # 添加远程仓库（替换 YOUR_USERNAME 为你的GitHub用户名）
   git remote add origin https://github.com/YOUR_USERNAME/study-bot.git
   
   # 推送代码
   git branch -M main
   git push -u origin main
   ```

3. **Vercel 导入**
   - 登录 Vercel
   - 点击 "Add New" → "Project"
   - 选择刚创建的 GitHub 仓库
   - Framework Preset 选择 "Other"
   - 点击 "Deploy"

### 方式二：直接拖拽（快速体验）

1. 访问 https://vercel.com/new
2. 直接拖拽 `client/dist` 文件夹到页面
3. 自动部署完成

## 后端部署

后端需要单独部署，可以使用：

### Vercel Serverless Functions
1. 在 Vercel 中创建新项目
2. 导入 `server` 目录
3. 配置环境变量：
   - `DATABASE_URL`: PostgreSQL 数据库连接字符串
   - `AI_API_KEY`: AI 接口密钥
4. 部署

### 或者使用Railway/Render（免费后端托管）
1. 注册 Railway：https://railway.app
2. 连接 GitHub 仓库
3. 自动部署后端

## 环境变量配置

部署后需要在 Vercel Project Settings 中设置：

**前端环境变量：**
- `EXPO_PUBLIC_BACKEND_BASE_URL`: 后端 API 地址

**后端环境变量：**
- `DATABASE_URL`: 数据库连接字符串
- `AI_API_KEY`: AI 服务密钥

## 常见问题

Q: 部署后图片上传不工作？
A: 需要配置对象存储（如 AWS S3、Cloudflare R2），或使用 Supabase Storage

Q: 数据库在哪里？
A: 需要使用 Supabase/Railway 等服务创建 PostgreSQL 数据库

---

## 一键部署按钮

访问以下链接开始部署：
https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/study-bot
