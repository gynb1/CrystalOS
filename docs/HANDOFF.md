# CrystalOS 项目交接文档

版本：v0.1  
日期：2026-11-25  
用途：把前期讨论、竞品判断、产品定位、模块边界、Demo 范围与后续接口约定集中到一份文档，便于继续开发、交接或对外沟通。

---

## 1. 项目背景

目标是做一个面向晶体学与材料发现的“全生态链”网站/平台，不是单点工具，而是把以下能力串成闭环：

- 自建晶体学数据库
- 晶体结构生成：CSP（晶体结构预测）与 DNG（de novo generation，从头生成）
- 合成设计：无机固相反应配方、AI 学习经验、推荐新型反应
- 晶体学表征：优先 PXRD，后续扩展 Raman/IR、TGA/DSC、SEM/EDS、PDF、3DED 等
- XRD 精修：Rietveld / Le Bail / Pawley
- 物相识别与多相分解
- 可通过 API 接入的小型科研 Agent
- 数据回流、评测、版本与证据链

当前进度：

- 晶体学数据库：已完成，尚未正式上线
- CSP / DNG：已完成
- 晶体学 XRD 精修：已完成
- 晶体学表征：进行中
- 网站/平台：尚未开始，本目录为第一版 Demo

---

## 2. 参考资料与竞品

### 2.1 知乎文章与干将（Gan Jiang）

参考文章介绍的是通用决策智能研究所发布的科研智能体平台“干将”，面向粉末 X 射线衍射（PXRD）。

其核心主张：

- 不是“上传图谱输出标签”的黑箱
- 不是传统软件里加一个聊天窗口
- 而是把 AI 模型、晶体结构数据库、衍射分析算法、专业精修软件连接起来
- 用户上传 XRD 数据并描述目标，Agent 自主选择模型、数据库和工具，逐步完成物相识别、结构匹配、精修验证

官网与论文补充信息：

- 官网：https://ganjiang.asia
- 论文：https://arxiv.org/abs/2610.07862
- 引擎矩阵：XMatcher、XQueryer、XDecomposer、WPEM
- 精修引擎：PyWPEM、GSAS-II、FullProf 多引擎动态选择
- 自学习：诊断失败、修改技能指令/代码、验证后再复用；不重训 LLM，不改物理模型
- 评测：DeltaXRDbench；MP500、RRUFF、opXRD
- 仅输入 XRD、不提供组成时，单相 Top-1：
  - MP500 96.30%
  - RRUFF 81.78%
  - opXRD 40.83%
- 最强对比方法：58.00%、58.47%、26.45%
- 真实案例：古埃及化妆粉五相分析、电池原位晶格演化、无序氧化物催化剂
- 产品形态：桌面客户端、积分制、社区、国际发布
- 公开页面未见明确的开放 API/SDK、云协作、私有化部署说明

### 2.2 网站风格参考

参考网站：https://zhuyizhou.github.io

这是一个高校计算材料实验室主页，特点是：

- 学术可信感强
- 大图 Hero、简洁导航、研究方向和团队成员
- 白底、克制配色、论文与新闻模块
- 适合建立“实验室/研究所”气质

本项目 Demo 采用“学术实验室气质 + 科研产品工作台”的混合路线：

- 首屏保留学术网站的克制与可信感
- 中段用产品化模块卡、工作流和能力矩阵表达平台
- 后段直接嵌入可交互的联调工作台，避免只做静态介绍页

---

## 3. 竞品判断与产品定位

### 3.1 干将的强项

- 不是 prompt 套壳，有自己的衍射分析引擎矩阵
- 多引擎精修与交叉验证
- 技能层自学习：可诊断、可修改、可验证、可回滚
- 公开 benchmark 与论文，科学信用强
- 真实案例有传播力
- 桌面客户端 + 积分 + 社区，产品化完整
- 机构、论文、合作伙伴背书强

### 3.2 干将留下的空位

- 主要做“实验图谱 → 结构”的反向链，公开信息未见 CSP/DNG 正向生成
- 公开信息未明确自建实验谱图/精修/失败案例数据库
- 桌面端为主，开放 API/SDK、云协作、LIMS/ELN 集成不明确
- 只做 PXRD，多技术表征是空白
- 通用材料场景为主，药物 GxP、电池原位、半导体等垂直合规场景不明显
- 真实实验数据仍有明显短板，opXRD 仅 40.83%
- 自学习技能的企业级审计、责任边界、版本回滚仍需产品化

### 3.3 本项目定位

不建议做“另一个干将”，建议定位为：

> 以自建晶体学数据库为底座，连接 CSP/DNG 正向生成与 XRD 表征/精修反向验证的晶体学决策平台。

概括为“一底座、两条链、一个入口”：

- 一底座：CrystalDB
- 两条链：
  - 正向链：组成/空间群 → CSP/DNG → 候选结构 → XRD/PDF 模拟 → 合成与实验设计
  - 反向链：实验 PXRD → 物相识别/多相分解 → 精修 → 验证结构 → 数据回流
- 一个入口：Agent + API

差异化优先级：

1. CSP/DNG 正向链
2. 自建实验数据库：真实谱图、精修结果、合成条件、失败案例、负样本
3. 合成设计：固相反应配方、AI 经验、推荐新反应
4. 多技术表征扩展
5. API-first、私有化部署、企业集成
6. 可审计、可复现、带不确定度的科学结论

---

## 4. 手绘草图解读

用户提供的手绘草图表达的是“材料发现”的主流程：

- 结构：CSP、DNG，以及有序/无序结构问题
- 合成：
  - 无机固相反应配方
  - AI 学习经验
  - 推荐新型反应
- 表征：XRD
- CSP 与 XRD 之间存在双向箭头，表示计算与实验互相校正
- 整体从结构 → 合成 → 表征，再回到结构与数据库

Demo 已把这条链路表达为：

```text
结构 / CSP·DNG
      ↓
合成 / 固相配方·AI 经验·新反应
      ↓
表征 / PXRD·物相识别
      ↓
精修 / Rietveld·多引擎
      ↓
CrystalDB / 数据回流与评测
```

---

## 5. Demo 范围

本 Demo 的目标是“可演示、可联调、可扩展”，不是完整生产系统。

### 5.1 已完成

- 学术实验室风格首页
- 平台能力矩阵
- 正向链/反向链工作流展示
- 6 个联调面板：
  - 数据库检索
  - CSP/DNG 生成
  - 表征 / PXRD 物相识别
  - XRD 精修
  - 合成设计
  - Agent / API
- 全流程 Mock 数据与交互
- 跨面板状态联动：
  - 检索结构 → 模拟 XRD
  - CSP 候选 → 送入表征
  - 物相识别 → 提交精修
  - 精修 → 写回数据库
  - 合成 → 推荐方案
  - Agent → 调用工具并更新流程
- API 客户端层与 Mock 适配器
- OpenAPI 契约草案
- 本地静态服务器脚本
- 交接文档与接口文档

### 5.2 不在本 Demo 内

- 真实数据库连接
- 真实 CSP/DNG 计算
- 真实 XRD 文件解析
- 真实 Rietveld 精修
- 真实物相识别模型
- 用户登录、权限、计费
- 生产级任务队列与 HPC 调度
- 私有化部署与安全合规
- 多技术表征（Raman/IR/TGA/SEM 等）

---

## 6. 技术方案

### 6.1 Demo 形态

- 纯静态 HTML/CSS/JavaScript
- 无构建步骤，双击 `index.html` 即可打开
- 也可通过 `serve.ps1` 启动本地 HTTP 服务
- 图表使用原生 SVG 绘制，不依赖外部 CDN
- 所有数据保存在 E 盘

### 6.2 目录结构

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
   └─ js\
      ├─ config.js
      ├─ data.js
      ├─ charts.js
      ├─ app.js
      └─ api\
         ├─ client.js
         └─ mock.js
```

### 6.3 前端分层

- `config.js`：Mock/真实 API 开关、BASE_URL、端点表、模块开关
- `data.js`：Demo 结构、谱图、合成方案等数据与生成函数
- `api/client.js`：统一 API 客户端，真实后端接入点
- `api/mock.js`：Mock 适配器，模拟异步返回
- `charts.js`：PXRD 图、晶体结构图、精修图
- `app.js`：页面交互、Tab、流程状态、Agent 演示

### 6.4 后续真实接入方式

修改 `assets/js/config.js`：

```js
window.CrystalConfig = {
  useMock: false,
  baseUrl: "https://api.your-domain.com",
  endpoints: { ... }
};
```

后端只需实现 `docs/API_CONTRACT.md` 与 `api/openapi.yaml` 中的端点，前端无需重写。

---

## 7. 核心接口约定

详细定义见 `docs/API_CONTRACT.md`，核心端点：

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/health` | 服务健康检查 |
| POST | `/api/structures/search` | 数据库检索 |
| GET | `/api/structures/{id}` | 结构详情 |
| POST | `/api/structures` | 结构入库 |
| POST | `/api/csp/generate` | CSP/DNG 生成候选 |
| POST | `/api/xrd/simulate` | 从结构模拟 PXRD |
| POST | `/api/characterization/identify` | 物相识别/多相分解 |
| POST | `/api/refinement/run` | Rietveld/Le Bail/Pawley 精修 |
| POST | `/api/synthesis/recommend` | 固相配方、AI 经验、新反应推荐 |
| POST | `/api/agent/chat` | Agent 对话与工具编排 |
| GET | `/api/jobs/{id}` | 长任务状态查询 |

统一返回格式建议：

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "request_id": "req_xxx",
  "elapsed_ms": 123
}
```

长任务建议：

```json
{
  "ok": true,
  "data": {
    "job_id": "job_xxx",
    "status": "queued"
  }
}
```

---

## 8. 数据模型草案

核心实体：

- Organization
- User
- Project
- Sample
- Structure
- Pattern
- Experiment
- Job
- Refinement
- SynthesisPlan
- Report
- Dataset
- License
- Provenance

建议以 CIF + JSON 作为结构主格式，同时支持：

- CIF
- PDB
- POSCAR
- XYZ
- SDF/MOL2
- XRDML
- Bruker RAW
- CSV/TXT
- PNG/TIFF

每条数据至少记录：

- 来源
- 许可证
- 仪器与测试参数
- 软件与版本
- 操作者
- 时间
- 输入文件哈希
- 任务 ID
- 不确定度

数据库护城河不在“结构数量”，而在：

- 真实实验谱图
- 精修结果与参数
- 合成条件
- 失败案例与负样本
- 专家修正记录
- 可追溯的许可证与证据链

---

## 9. Agent 设计原则

不要做通用聊天机器人，做“晶体学工作流代理”。

首批工具：

- 数据库检索
- CSP/DNG 生成
- XRD 模拟
- 物相识别
- XRD 精修
- 合成方案推荐
- 报告生成
- 项目历史查询

原则：

- 所有事实必须来自工具返回
- 每个结论附来源：结构 ID、任务 ID、文件、参数
- 高算力任务先估算成本并请求确认
- 关键步骤保留人工复核
- 技能版本化、可回滚、可评测
- 记录失败案例与人工修正，形成技能库
- 不让 LLM 直接编造晶体数据或精修结果

---

## 10. 路线图

| 阶段 | 重点 |
|---|---|
| 0–3 月 | 数据库上线准备；CSP/DNG、XRD 模拟、精修 API 化；建立 benchmark；确定首发垂直场景 |
| 3–6 月 | XRD 表征 MVP；CSP/DNG 候选约束的物相识别；正向—反向闭环 alpha；3 家试点 |
| 6–9 月 | Agent + SDK + API 控制台；私有化版本；一项互补表征技术 |
| 9–12 月 | 多用户协作、企业版、真实案例与论文/白皮书；生态伙伴接入 |

不建议优先做：

- 桌面客户端
- 通用聊天机器人
- 一开始覆盖所有表征技术
- 只靠结构数量宣称数据库优势
- 在通用物相识别准确率上单独硬拼干将

---

## 11. 关键风险

| 风险 | 应对 |
|---|---|
| 与干将正面竞争 | 避开通用 XRD Agent，主打 CSP/DNG 正向链、数据库、API、私有化 |
| 数据授权 | CSD/ICSD/ICDD 不随意再分发；公开数据 + 授权接入 + 用户贡献 |
| 范围失控 | 表征先做 XRD，其他技术插件化 |
| Agent 幻觉 | 工具优先、证据链、置信度、人工复核 |
| 真实数据泛化 | 建立真实实验测试集与专家盲评 |
| 企业销售周期 | 先做试点与私有化模板 |
| 科学信用 | benchmark、公开评测、可复现容器与参数文件 |

---

## 12. 待确认问题

1. 自建数据库目前覆盖分子晶体还是无机晶体？数据来源与授权状态如何？
2. CSP/DNG 主要面向药物多晶型、无机材料，还是两者都有？
3. 首发垂直场景选哪个？
4. “晶体学表征”具体包括哪些技术？是否只先做 XRD？
5. 是否有真实 PXRD 实验数据、精修案例和专家标注？
6. 目标客户是高校、研究所、药企、电池厂还是第三方测试平台？
7. 优先 SaaS、私有化还是混合部署？
8. 团队规模、预算、期望发布时间？
9. 是否希望公开 benchmark、发论文或白皮书？
10. Agent 需要执行代码/调用本地软件，还是只做工具编排？

---

## 13. 下一步

1. 确认首发垂直场景与真实数据边界。
2. 把 Demo 的 Mock 适配器替换为真实 API。
3. 先接入数据库检索与 XRD 模拟，再接 CSP/DNG 与精修。
4. 建立 benchmark 与 2–3 个真实案例。
5. 做 3 家试点用户的完整闭环测试。
6. 根据试点反馈决定是否进入公测与私有化版本。

---

## 14. CrystalSeek 数据库接入（2026-11-25）

已将 `http://crystalseek.cn` 的数据库接入网页数据库模块。

### 14.1 上游接口

- 检索：`POST https://crystalseek.cn/api/File/search`
- 详情：`POST /api/File/search_single`
- 文件：`POST /api/File/get_file`
- 认证：默认使用 `Authorization: <xsg_token>`，401 时自动尝试 `Bearer <token>`

### 14.2 前端改动

- 新增 `assets/js/api/crystalseek.js`
- `assets/js/api/client.js` 增加数据源路由与 Mock fallback
- 数据库面板增加分页、加载状态、数据源切换和来源提示
- 选择真实结构后自动请求详情，映射原子坐标到 SVG 晶体视图
- 如果详情包含 `xrd_path`，可读取真实实验 XRD 并显示
- CSP/DNG、表征、精修、合成、Agent 仍为 Mock

### 14.3 代理

因为 GitHub Pages 是 HTTPS，而上游 API 是 HTTP，所以必须通过代理：

- 本地：`proxy/server.py` + `proxy/run-proxy.ps1`
- 公网：`proxy/worker.js` + Cloudflare Worker

token 只放在代理端，不能写进前端：

- 本地文件：`proxy/.token`（已加入 `.gitignore`）
- Cloudflare：`wrangler secret put CRYSTALSEEK_TOKEN`

### 14.4 配置

`assets/js/config.js`：

```js
dataSource: "auto",
crystalseek: {
  localBaseUrl: "http://127.0.0.1:8787",
  publicBaseUrl: "https://crystalseek-proxy.gynb1.workers.dev",
  fallbackToMock: true
}
```

`publicBaseUrl` 已填入 Worker 地址，GitHub Pages 上的数据库模块会连接真实 CrystalSeek。

### 14.5 待验证

- 用真实 token 验证 `/api/File/search`、`/api/File/search_single` 的实际字段。
- 确认真实 XRD 文件格式与列顺序。
- 确认真实 `atoms` 字段名是否与当前兼容映射一致。
- 确认数据库 API 的使用条款、限流与缓存策略。
