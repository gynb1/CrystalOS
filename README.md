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

默认使用 Mock API：

```js
window.CrystalConfig = {
  useMock: true,
  baseUrl: "http://localhost:8000"
};
```

切换真实后端时修改 `assets/js/config.js`：

```js
window.CrystalConfig = {
  useMock: false,
  baseUrl: "https://api.your-domain.com"
};
```

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

- 所有数据为 Demo 数据，不代表真实科学结论。
- CSP/DNG、表征、精修、合成与 Agent 均为 Mock 行为。
- 真实接入时优先替换 `assets/js/api/client.js` 的后端调用，不需要重写 UI。
- 详细交接内容见 `docs/HANDOFF.md`。
