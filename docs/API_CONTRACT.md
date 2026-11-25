# CrystalOS API 契约（v0.1）

本文档定义 Demo 前端与后续真实后端之间的接口。当前 Demo 默认使用 `assets/js/api/mock.js`，把 `assets/js/config.js` 中的 `useMock` 改为 `false` 并设置 `baseUrl` 即可切换真实接口。

## 1. 通用约定

- 协议：HTTPS
- 编码：UTF-8
- 内容类型：`application/json`
- 认证：`Authorization: Bearer <token>`
- 请求追踪：`X-Request-Id`
- 版本：路径中保留 `/api`，破坏性变更时升级为 `/api/v2`

统一响应：

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "request_id": "req_01J...",
  "elapsed_ms": 128
}
```

错误响应：

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "INVALID_INPUT",
    "message": "composition is required",
    "details": {}
  },
  "request_id": "req_01J...",
  "elapsed_ms": 12
}
```

长任务响应：

```json
{
  "ok": true,
  "data": {
    "job_id": "job_01J...",
    "status": "queued",
    "poll_url": "/api/jobs/job_01J..."
  }
}
```

## 2. 健康检查

`GET /api/health`

响应：

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "version": "0.1.0",
    "modules": {
      "database": "ready",
      "csp": "ready",
      "characterization": "beta",
      "refinement": "ready",
      "synthesis": "planned",
      "agent": "beta"
    }
  }
}
```

## 3. 数据库

### 3.1 检索结构

`POST /api/structures/search`

请求：

```json
{
  "query": "Li6PS5Cl",
  "filter": "all",
  "limit": 20,
  "offset": 0,
  "sort": "relevance"
}
```

`filter` 可选：`all`、`formula`、`space_group`、`elements`、`source`、`property`。

响应：

```json
{
  "ok": true,
  "data": {
    "total": 2,
    "items": [
      {
        "id": "st_li6ps5cl",
        "formula": "Li6PS5Cl",
        "name": "Argyrodite Li6PS5Cl",
        "space_group": "F-43m",
        "space_group_number": 216,
        "lattice": {
          "a": 9.859,
          "b": 9.859,
          "c": 9.859,
          "alpha": 90,
          "beta": 90,
          "gamma": 90
        },
        "source": "CrystalDB demo",
        "license": "CC-BY-4.0",
        "stability": "metastable",
        "band_gap_ev": 2.4,
        "density_g_cm3": 1.87,
        "tags": ["solid electrolyte", "argyrodite"],
        "peaks": [
          { "x": 15.6, "intensity": 32, "hkl": "111" },
          { "x": 18.1, "intensity": 100, "hkl": "200" },
          { "x": 25.7, "intensity": 64, "hkl": "220" },
          { "x": 31.7, "intensity": 22, "hkl": "311" },
          { "x": 36.6, "intensity": 28, "hkl": "222" }
        ]
      }
    ]
  }
}
```

### 3.2 结构详情

`GET /api/structures/{id}`

响应中的 `data` 为单个结构对象，字段同上，并可增加：

```json
{
  "atoms": [
    { "element": "Li", "x": 0.25, "y": 0.25, "z": 0.25, "occupancy": 1.0 }
  ],
  "provenance": {
    "source": "CrystalDB demo",
    "license": "CC-BY-4.0",
    "contributed_by": "demo",
    "created_at": "2026-11-25T00:00:00Z"
  }
}
```

### 3.3 结构入库

`POST /api/structures`

请求：

```json
{
  "cif": "data_...",
  "project_id": "prj_demo",
  "source": "user_upload",
  "license": "user_owned",
  "tags": ["experimental", "pxrd"]
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "st_new_001",
    "status": "validated",
    "duplicate_of": null
  }
}
```

## 4. CSP / DNG

`POST /api/csp/generate`

请求：

```json
{
  "composition": "Li6PS5Cl",
  "method": "csp",
  "space_group": "F-43m",
  "constraints": {
    "pressure_gpa": 0,
    "temperature_k": 300,
    "max_candidates": 8,
    "elements": ["Li", "P", "S", "Cl"]
  }
}
```

`method` 可选：`csp`、`dng`、`hybrid`。

响应：

```json
{
  "ok": true,
  "data": {
    "job_id": "job_csp_001",
    "candidates": [
      {
        "id": "csp_001",
        "formula": "Li6PS5Cl",
        "method": "csp",
        "space_group": "F-43m",
        "score": 0.92,
        "energy_ev_atom": -4.18,
        "volume_a3": 958.2,
        "synthesizability": 0.81,
        "uncertainty": 0.06,
        "peaks": [
          { "x": 18.1, "intensity": 100, "hkl": "200" }
        ]
      }
    ]
  }
}
```

## 5. XRD 模拟

`POST /api/xrd/simulate`

请求：

```json
{
  "structure_id": "st_li6ps5cl",
  "wavelength": "CuKa",
  "two_theta": { "start": 5, "end": 75, "step": 0.05 },
  "profile": "pseudo-voigt",
  "preferred_orientation": null
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "pattern_id": "pat_sim_001",
    "two_theta": [5.0, 5.05, 5.1],
    "intensity": [0.0, 0.1, 0.2],
    "peaks": [
      { "x": 18.1, "intensity": 100, "hkl": "200" }
    ],
    "phases": [
      { "structure_id": "st_li6ps5cl", "formula": "Li6PS5Cl", "weight": 1.0 }
    ]
  }
}
```

## 6. 物相识别 / 多相分解

`POST /api/characterization/identify`

请求：

```json
{
  "pattern_id": "pat_exp_001",
  "two_theta": [5.0, 5.05, 5.1],
  "intensity": [0.0, 0.1, 0.2],
  "options": {
    "allow_multiphase": true,
    "max_phases": 5,
    "use_composition": false,
    "candidate_structure_ids": []
  }
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "phases": [
      {
        "structure_id": "st_li6ps5cl",
        "formula": "Li6PS5Cl",
        "confidence": 0.94,
        "weight_fraction": 0.78,
        "matched_peaks": 12,
        "residual": 0.08
      }
    ],
    "diagnosis": {
      "is_multiphase": true,
      "is_amorphous": false,
      "unknown_peaks": 2,
      "notes": "Two weak reflections remain unexplained."
    },
    "alternatives": []
  }
}
```

## 7. XRD 精修

`POST /api/refinement/run`

请求：

```json
{
  "pattern_id": "pat_exp_001",
  "structure_ids": ["st_li6ps5cl"],
  "method": "rietveld",
  "engine": "auto",
  "options": {
    "background": "chebyshev",
    "profile": "tchz",
    "refine_lattice": true,
    "refine_occupancy": false,
    "refine_preferred_orientation": false
  }
}
```

`engine` 可选：`auto`、`pywpem`、`gsas2`、`fullprof`、`topas`。

响应：

```json
{
  "ok": true,
  "data": {
    "refinement_id": "ref_001",
    "method": "rietveld",
    "engine": "gsas2",
    "metrics": {
      "rwp": 0.081,
      "rp": 0.064,
      "rexp": 0.052,
      "gof": 1.24,
      "chi2": 1.54
    },
    "parameters": [
      { "name": "a", "value": 9.8612, "esd": 0.0011, "unit": "A" }
    ],
    "phases": [
      {
        "structure_id": "st_li6ps5cl",
        "weight_fraction": 0.96,
        "rwp_contribution": 0.081
      }
    ],
    "pattern": {
      "two_theta": [5.0, 5.05, 5.1],
      "observed": [0.0, 0.1, 0.2],
      "calculated": [0.0, 0.09, 0.19],
      "difference": [0.0, 0.01, 0.01]
    },
    "warnings": []
  }
}
```

## 8. 合成推荐

`POST /api/synthesis/recommend`

请求：

```json
{
  "target": "Li6PS5Cl",
  "route": "solid_state",
  "constraints": {
    "max_temperature_c": 550,
    "atmosphere": "Ar",
    "precursors_allowed": ["Li2S", "P2S5", "LiCl"],
    "avoid": ["LiI"]
  }
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "recipe": {
      "route": "solid_state",
      "precursors": [
        { "formula": "Li2S", "molar_ratio": 2.0, "mass_g": 0.459 },
        { "formula": "P2S5", "molar_ratio": 0.5, "mass_g": 0.556 },
        { "formula": "LiCl", "molar_ratio": 1.0, "mass_g": 0.212 }
      ],
      "conditions": {
        "temperature_c": 550,
        "hold_h": 12,
        "atmosphere": "Ar",
        "heating_rate_c_min": 3
      }
    },
    "insights": [
      {
        "statement": "LiCl 过量 5% 可补偿高温挥发",
        "confidence": 0.78,
        "evidence": ["exp_2024_017", "lit_10.1021/xxx"]
      }
    ],
    "recommended_reactions": [
      {
        "reaction": "2 Li2S + 0.5 P2S5 + LiCl -> Li6PS5Cl",
        "score": 0.86,
        "novelty": 0.31,
        "risk": "low"
      }
    ]
  }
}
```

## 9. Agent

`POST /api/agent/chat`

请求：

```json
{
  "message": "检索 Li6PS5Cl，生成 XRD 并推荐合成路线",
  "project_id": "prj_demo",
  "context": {
    "selected_structure_id": "st_li6ps5cl",
    "selected_pattern_id": "pat_exp_001"
  },
  "stream": false
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "message": "已完成检索、XRD 模拟和合成路线推荐。",
    "tool_calls": [
      {
        "tool": "search_structures",
        "status": "ok",
        "input": { "query": "Li6PS5Cl" },
        "output_ref": "st_li6ps5cl"
      },
      {
        "tool": "simulate_xrd",
        "status": "ok",
        "input": { "structure_id": "st_li6ps5cl" },
        "output_ref": "pat_sim_001"
      }
    ],
    "citations": [
      { "type": "structure", "id": "st_li6ps5cl" },
      { "type": "pattern", "id": "pat_sim_001" }
    ],
    "confidence": 0.88,
    "next_actions": [
      "提交精修",
      "查看合成方案"
    ]
  }
}
```

## 10. 任务状态

`GET /api/jobs/{id}`

响应：

```json
{
  "ok": true,
  "data": {
    "job_id": "job_csp_001",
    "status": "running",
    "progress": 0.62,
    "message": "Generating candidate structures",
    "result_url": null
  }
}
```

`status` 可选：`queued`、`running`、`succeeded`、`failed`、`cancelled`。

## 11. 接入顺序建议

1. `GET /api/health`
2. `POST /api/structures/search`
3. `POST /api/xrd/simulate`
4. `POST /api/characterization/identify`
5. `POST /api/refinement/run`
6. `POST /api/csp/generate`
7. `POST /api/synthesis/recommend`
8. `POST /api/agent/chat`

前端切换真实 API 只需修改 `assets/js/config.js` 中的 `useMock` 与 `baseUrl`，页面交互逻辑不变。

---

## 12. CrystalSeek 数据库接入

数据库模块已增加 CrystalSeek 适配层，真实上游接口：

| 方法 | 上游路径 | 用途 |
|---|---|---|
| POST | `/api/File/search` | 结构检索 |
| POST | `/api/File/search_single` | 按 GUID 获取结构详情、原子和文件路径 |
| POST | `/api/File/get_file` | 读取 CIF / XRD 文件，返回 base64 |
| POST | `/api/File/get_cif_file` | CIF 文件备用端点 |

上游地址：`https://crystalseek.cn`

上游认证：

CrystalSeek 前端源码直接发送 token，默认格式为：

```http
Authorization: <CRYSTALSEEK_TOKEN>
```

代理默认也使用 raw token；如果上游返回 401，会自动用 `Bearer <token>` 重试一次。也可以通过 `CRYSTALSEEK_AUTH_PREFIX=Bearer` 强制使用 Bearer。

前端不直接持有 token。通过 `proxy/worker.js` 或 `proxy/server.py` 代理，把 token 放在代理端。

### 12.1 检索请求

```json
{
  "searchType": "Materials",
  "searchKeyword": "Li6PS5Cl",
  "logic": "only",
  "pagenum": 1,
  "pagesize": 10
}
```

元素组合检索示例：

```json
{
  "searchType": "atom",
  "searchKeyword": "[Li]-[Fe]-[O]",
  "logic": "only",
  "pagenum": 1,
  "pagesize": 10
}
```

### 12.2 检索响应字段映射

CrystalSeek 常见字段：

- `guid` / `id`
- `real_name`
- `chem_formula_sum` / `formula`
- `cell_setting` / `crystal_system`
- `space_group_name` / `space_group`
- `int_Tables_number`
- `a`、`b`、`c`、`alpha`、`beta`、`gamma`
- `journal_full`
- `doi`

前端统一映射为：

```json
{
  "id": "guid",
  "formula": "chem_formula_sum",
  "name": "real_name",
  "space_group": "space_group_name",
  "space_group_number": 216,
  "lattice": {
    "a": 9.859,
    "b": 9.859,
    "c": 9.859,
    "alpha": 90,
    "beta": 90,
    "gamma": 90
  },
  "source": "journal_full",
  "license": "doi"
}
```

### 12.3 详情响应字段映射

详情响应中的：

- `atoms` → 结构可视化
- `xrd_path` → 通过 `/api/File/get_file` 读取实验 XRD
- `cif_path` → 通过 `/api/File/get_file` 读取 CIF

`atoms` 字段兼容：

- `type_symbol` / `element` / `symbol` / `atom_type`
- `fract_x` / `x`
- `fract_y` / `y`
- `fract_z` / `z`
- `occupancy`

### 12.4 前端配置

```js
window.CrystalConfig = {
  dataSource: "auto",
  crystalseek: {
    localBaseUrl: "http://127.0.0.1:8787",
    publicBaseUrl: "https://你的-worker.workers.dev",
    searchPath: "/api/File/search",
    detailPath: "/api/File/search_single",
    filePath: "/api/File/get_file",
    fallbackToMock: true
  }
};
```

`publicBaseUrl` 为空或请求失败时，数据库模块会回退到 Mock 数据，避免公开页面直接报错。
