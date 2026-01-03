### 部署到 Tencent EdgeOne Pages

腾讯云 EdgeOne Pages (EO Pages) 也是一个优秀的 Serverless 托管平台，完全兼容本项目的架构。

### 1. 准备工作

确保你的代码仓库中包含以下文件（已自动生成）：
- `edge-functions/data/analytics.json.js`: 适配 EdgeOne Pages 的 Serverless 函数目录。
- `functions/data/analytics.json.js`: 适配 Cloudflare Pages 的 Serverless 函数目录。
- `web/public/_redirects`: 用于处理 SPA 路由重写规则（将所有路径指向 index.html）。

### 2. 部署步骤

1. 登录 [腾讯云 EdgeOne 控制台](https://console.cloud.tencent.com/edgeone/pages)。
2. 点击 **新建项目** -> **连接 Git 仓库**。
3. 选择 `cloudflare-monitor` 仓库。
4. **构建配置**:
   - **框架预设**: Create React App
   - **构建命令**: `npm run build`
   - **输出目录**: `web/build`
5. **环境变量**:
   在部署设置或项目设置中添加环境变量：
   - `CF_TOKENS`: 你的 Cloudflare API Token
   - `CF_ZONES`: 你的 Zone ID
   - 其他可选变量 (`CF_ACCOUNT_NAME` 等)

### 3. 路由规则 (重要)

本项目使用 `web/public/_redirects` 文件来定义路由规则，EdgeOne Pages 会自动识别：

```text
# SPA Fallback: 将所有未匹配的请求重写到 index.html
/* /index.html 200
```

### 4. 本地开发与调试

你可以使用 EdgeOne CLI 在本地模拟 Serverless 环境：

1. 安装 CLI:
   ```bash
   npm install -g edgeone
   ```

2. 运行开发服务器:
   ```bash
   # 在项目根目录运行
   edgeone pages dev
   ```

---

## 部署到 Cloudflare Pages / Serverless
本项目已支持部署到 Cloudflare Pages 或其他支持 Serverless Functions 的平台。
这种部署方式不需要运行独立的 Node.js 后端服务器，而是利用 Edge Functions (边缘函数) 来实时获取数据。

## 部署步骤 (Cloudflare Pages)

1. **Fork 本仓库** 到你的 GitHub 账号。
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) 并进入 **Workers & Pages**。
3. 点击 **Create application** -> **Pages** -> **Connect to Git**。
4. 选择你 Fork 的仓库 `cloudflare-monitor`。
5. 配置构建设置：
   - **Framework preset**: Create React App (或者 None)
   - **Build command**: `npm run build` (这会触发根目录的 build 脚本，构建 web 目录)
   - **Build output directory**: `web/build`
6. **环境变量 (Environment Variables)**:
   在设置页面添加以下环境变量（与原 server 配置相同）：
   - `CF_TOKENS`: 你的 Cloudflare API Token
   - `CF_ZONES`: 你的 Zone ID (多个用逗号分隔)
   - `CF_ACCOUNT_NAME`: (可选) 账户显示名称
   - `CF_DOMAINS`: (可选) 域名显示名称
   
   *支持多账户配置 (CF_TOKENS_1, CF_ZONES_1 等)，详情参考 README.md*

7. 点击 **Save and Deploy**。

## 本地开发 (Pages 模式)

如果你想在本地测试 Pages Functions 功能，可以使用 `wrangler` (Cloudflare 的 CLI 工具)：

1. 安装依赖:
   ```bash
   npm install -g wrangler
   cd web && npm install
   ```

2. 运行开发服务器:
   ```bash
   # 在项目根目录运行
   npx wrangler pages dev web/build -- npm --prefix web start
   ```
   *注意：这需要先构建前端或配置代理，较复杂。简单测试建议直接使用原来的 `npm run dev` (使用 Node.js server)*

## 原理说明

- `functions/data/analytics.json.js`: 这是一个 Serverless Function。当访问 `/data/analytics.json` 时，它会：
  1. 读取环境变量配置。
  2. 直接请求 Cloudflare GraphQL API 获取最新数据。
  3. 返回 JSON 数据给前端。
  4. 数据会缓存 5 分钟 (`Cache-Control: max-age=300`)，避免频繁请求 API。

- 这种方式不需要 `node-cron` 定时任务，也不需要文件系统写入权限，非常适合 Serverless 环境。
