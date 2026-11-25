# CrystalOS Demo

晶体学全生态平台 Demo，包含数据库检索、CSP/DNG、PXRD 表征、Rietveld 精修、合成设计与 Agent/API 六个联调面板。

## 打开方式

直接双击 `index.html`。

或启动本地 HTTP 服务：

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

然后访问：

```text
http://localhost:8080
```

## 当前模式

数据库模块已接入 CrystalSeek 适配器，默认为自动模式：

```js
window.CrystalConfig = {
  dataSource: "auto",
  crystalseek: {
    localBaseUrl: "http://127.0.0.1:8787",
    publicBaseUrl: "https://crystalseek-proxy.gynb1.workers.dev"
  }
};
```

`dataSource: "auto"` 的行为：

- 本地 `localhost/127.0.0.1`：优先连接 CrystalSeek 本地代理。
- 公网且 `publicBaseUrl` 已配置：连接 Cloudflare Worker 代理。
- 公网且 `publicBaseUrl` 为空：自动回退 Mock，避免公开页面报错。

本地使用 CrystalSeek 时，需要启动 `proxy` 并配置 token，详见 `proxy/README.md`。

CSP/DNG、表征、精修、合成和 Agent 目前仍是 Mock 行为；数据库检索、结构详情和实验 XRD 读取已接入 CrystalSeek 适配层。

前端交互不变，后端按 `docs/API_CONTRACT.md` 和 `api/openapi.yaml` 实现即可。

## 目录

```text
E:\CrystalOS\
├─ index.html
├─ README.md
├─ serve.ps1
├─ docs\
│  ├─ HANDOFF.md
│  └─ API_CONTRACT.md
├─ api\
│  └─ openapi.yaml
├─ proxy\
│  ├─ worker.js
│  ├─ server.py
│  ├─ run-proxy.ps1
│  └─ README.md
└─ assets\
   ├─ css\
   │  └─ app.css
   ├─ img\
   │  └─ favicon.svg
   └─ js\
      ├─ config.js
      ├─ data.js
      ├─ charts.js
      ├─ app.js
      └─ api\
         ├─ client.js
         ├─ crystalseek.js
         └─ mock.js
```

## 已预留接口

- `GET /api/health`
- `POST /api/structures/search`
- `GET /api/structures/{id}`
- `POST /api/structures`
- `POST /api/csp/generate`
- `POST /api/xrd/simulate`
- `POST /api/characterization/identify`
- `POST /api/refinement/run`
- `POST /api/synthesis/recommend`
- `POST /api/agent/chat`
- `GET /api/jobs/{id}`

## 说明

- 数据库模块可连接 CrystalSeek；未连接时自动回退 Demo 数据。
- CSP/DNG、表征、精修、合成与 Agent 仍为 Mock 行为。
- 真实接入时优先替换 `assets/js/api/client.js` 的后端调用，不需要重写 UI。
- 详细交接内容见 `docs/HANDOFF.md`。
