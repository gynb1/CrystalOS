# CrystalSeek Proxy

CrystalSeek 的数据库 API 需要 token，并且 API 在 `https://crystalseek.cn` 下。GitHub Pages 是 HTTPS，因此不能直接从前端携带 token 调用，需要一个 HTTPS 代理。

当前提供两种代理：

- `worker.js`：Cloudflare Worker，适合部署到公网，供 `https://gynb1.github.io/CrystalOS/` 使用。
- `server.py`：本地 Python 代理，适合本机联调和测试。

## 1. 获取 token

1. 打开 `http://crystalseek.cn` 并登录。
2. 打开浏览器开发者工具 Console。
3. 执行：

```js
copy(localStorage.getItem("xsg_token"))
```

4. 把复制到的 token 保存到：

```text
E:\CrystalOS\proxy\.token
```

这个文件已经在 `.gitignore` 中，不会被提交。

不要把 token 写进前端 JS，也不要提交到 GitHub。

## 2. 本地启动代理

```powershell
powershell -ExecutionPolicy Bypass -File E:\CrystalOS\proxy\run-proxy.ps1
```

代理地址：

```text
http://127.0.0.1:8787
```

前端配置在 `assets/js/config.js`：

```js
crystalseek: {
  localBaseUrl: "http://127.0.0.1:8787",
  publicBaseUrl: ""
}
```

本地打开页面后，数据源选择 `CrystalSeek`。

## 3. 部署 Cloudflare Worker

安装并登录 Wrangler：

```powershell
npm install -g wrangler
wrangler login
```

进入 `proxy` 目录：

```powershell
cd E:\CrystalOS\proxy
wrangler deploy
```

设置 token secret：

```powershell
wrangler secret put CRYSTALSEEK_TOKEN
```

部署完成后，把 Worker 地址填入 `assets/js/config.js`：

```js
crystalseek: {
  localBaseUrl: "http://127.0.0.1:8787",
  publicBaseUrl: "https://crystalseek-proxy.<your-subdomain>.workers.dev"
}
```

然后提交并推送：

```powershell
cd E:\CrystalOS
git add .
git commit -m "connect CrystalSeek database"
git push
```

## 4. 已代理的端点

- `/api/File/search`
- `/api/File/search_single`
- `/api/File/get_file`
- `/api/File/get_cif_file`

其他端点默认拒绝，避免代理被滥用。

## 5. 安全建议

- `ALLOW_ORIGINS` 只允许 `https://gynb1.github.io` 和本地调试地址。
- token 只放在代理环境变量或 `.token` 文件，不进入前端。
- 如果 token 过期，重新登录 CrystalSeek 获取新的 token，并更新 secret。
- 如果要公开给大量用户使用，建议与数据库方确认 API 使用条款、限流和缓存策略。

## 6. 认证头

CrystalSeek 前端源码里 Authorization 直接使用 token，没有加 `Bearer` 前缀。代理默认也使用：

```http
Authorization: <token>
```

如果上游返回 401，代理会自动再用：

```http
Authorization: Bearer <token>
```

重试一次。也可以手动指定：

```powershell
$env:CRYSTALSEEK_AUTH_PREFIX = "Bearer"
```

Cloudflare Worker 对应变量：

```text
CRYSTALSEEK_AUTH_PREFIX = Bearer
```
