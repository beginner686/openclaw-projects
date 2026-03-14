# OpenClaw 后台接口文档

更新时间：2026-03-13
适用版本：`openclaw-projects` 当前 `main` 分支

## 1. 接口总览

- 服务基地址：`http://<host>:4000`
- 健康检查：`GET /api/health`
- 认证方式：`Authorization: Bearer <JWT>`
- 请求体格式：`application/json`
- 时间格式：ISO8601 字符串（例如 `2026-03-12T07:56:43.054Z`）
- 分页参数：
  - `page`：页码，从 `1` 开始
  - `limit`：每页条数，默认 `50`，最大 `100`

## 2. 认证与权限模型

### 2.1 角色

- `admin`：可访问 `/api/admin/*`
- `customer`：仅可访问客户与模块侧接口（需开通模块）

### 2.2 鉴权规则

- 需要登录的接口必须携带 `Authorization: Bearer <token>`
- `/api/admin/*` 额外要求角色为 `admin`
- `/api/modules/:moduleKey/*` 需要该用户已开通对应模块
- 管理端查询接口默认按当前登录账号 `tenantId` 做数据隔离过滤

### 2.3 常见鉴权错误

- `401 AUTH_MISSING_TOKEN`
- `401 AUTH_USER_NOT_FOUND`
- `401 AUTH_SESSION_REVOKED`
- `401 AUTH_TOKEN_VERSION_MISMATCH`
- `401 AUTH_TOKEN_INVALID`
- `403 FORBIDDEN`
- `403 MODULE_FORBIDDEN`

## 3. 通用响应约定

当前后端为“业务直出风格”，成功响应不统一包裹 `code/data`，错误响应统一为：

```json
{
  "code": "ERROR_CODE",
  "message": "error message"
}
```

## 4. 健康检查

### `GET /api/health`

用途：检查后端存活与任务队列状态。

响应示例：

```json
{
  "status": "ok",
  "queue": {
    "inFlight": 0,
    "maxConcurrency": 2
  },
  "time": "2026-03-12T07:56:43.054Z"
}
```

---

## 5. 认证接口 `/api/auth`

### 5.1 登录

### `POST /api/auth/login`

请求体：

```json
{
  "account": "demo@openclaw.ai",
  "password": "123456",
  "remember": true
}
```

响应：

```json
{
  "token": "<JWT>",
  "user": {
    "id": "u-demo-001",
    "tenantId": "t-demo-001",
    "name": "演示客户",
    "contact": "demo@openclaw.ai",
    "enabledModules": ["invoice-recovery-archive"],
    "role": "customer",
    "tokenState": "active"
  }
}
```

错误码：

- `400 AUTH_MISSING_CREDENTIALS`
- `401 AUTH_INVALID_CREDENTIALS`

### 5.2 注册

### `POST /api/auth/register`

请求体：

```json
{
  "name": "AdminTest",
  "contact": "admin_test@openclaw.ai",
  "password": "123456",
  "role": "admin"
}
```

说明：

- `role` 可选：`admin | customer`
- `admin` 默认开通全部模块
- `customer` 默认开通前 10 个模块

成功响应：`201`

```json
{
  "token": "<JWT>",
  "user": {
    "id": "u-xxxx",
    "tenantId": "t-u-xxxx",
    "name": "AdminTest",
    "contact": "admin_test@openclaw.ai",
    "enabledModules": ["..."],
    "role": "admin",
    "tokenState": "active"
  }
}
```

错误码：

- `400 AUTH_REGISTER_INVALID_PAYLOAD`
- `400 AUTH_PASSWORD_TOO_SHORT`
- `409 AUTH_CONTACT_ALREADY_EXISTS`

### 5.3 退出登录

### `POST /api/auth/logout`

请求头：`Authorization: Bearer <JWT>`

响应：

```json
{ "message": "已退出登录。" }
```

### 5.4 当前登录用户

### `GET /api/auth/profile`

请求头：`Authorization: Bearer <JWT>`

响应：

```json
{
  "id": "u-demo-001",
  "tenantId": "t-demo-001",
  "name": "演示客户",
  "contact": "demo@openclaw.ai",
  "enabledModules": ["invoice-recovery-archive"],
  "role": "customer",
  "tokenState": "active"
}
```

---

## 6. 客户侧接口 `/api/customer`

### 6.1 客户中心仪表盘

### `GET /api/customer/dashboard`

请求头：`Authorization: Bearer <JWT>`

响应：

```json
{
  "openedModules": ["invoice-recovery-archive"],
  "recentTasks": [
    {
      "taskId": "invoice-recovery-archive-mabcd-1a2b",
      "moduleKey": "invoice-recovery-archive",
      "status": "completed",
      "summary": "...",
      "updatedAt": "2026-03-12T07:20:00.000Z",
      "reportUrl": "/reports/xxx.html?access=...",
      "errorMessage": null
    }
  ],
  "reports": [
    {
      "id": "report-1",
      "title": "发票追索与归档整理报告",
      "createdAt": "2026-03-12T07:20:00.000Z",
      "format": "html",
      "url": "/reports/xxx.html?access=..."
    }
  ],
  "notifications": [
    {
      "id": "notice-1",
      "title": "...",
      "level": "success",
      "createdAt": "2026-03-12T05:20:00.000Z"
    }
  ]
}
```

错误码：

- `500 CUSTOMER_DASHBOARD_FAILED`

---

## 7. 模块接口 `/api/modules`

### 7.1 获取当前用户开通模块

### `GET /api/modules`

请求头：`Authorization: Bearer <JWT>`

响应：模块数组（`moduleKey/name/category/description/icon/status/mobileSupported`）

### 7.2 获取模块任务历史

### `GET /api/modules/:moduleKey/history`

响应：任务数组（最多 12 条）

```json
[
  {
    "taskId": "invoice-recovery-archive-abc-12ef",
    "moduleKey": "invoice-recovery-archive",
    "status": "completed",
    "summary": "...",
    "updatedAt": "2026-03-12T07:20:00.000Z",
    "reportUrl": "/reports/xxx.html?access=...",
    "errorMessage": null
  }
]
```

### 7.3 获取模块 schema（场景/提示/指标）

### `GET /api/modules/:moduleKey/schema`

响应：

```json
{
  "scenarios": ["archive-cleanup", "recovery-reminder", "audit-check"],
  "inputHints": ["Provide invoice volume, overdue amount, and filing period."],
  "samplePrompt": "Summarize invoice filing quality and overdue recovery priorities.",
  "metrics": [
    { "key": "archiveRate", "label": "Archive Rate", "unit": "%" },
    { "key": "overdueInvoices", "label": "Overdue Invoices", "unit": "" }
  ]
}
```

### 7.4 创建模块任务

### `POST /api/modules/:moduleKey/tasks`

请求体：

```json
{
  "scenario": "archive-cleanup",
  "inputText": "请根据本周发票上传记录输出归档缺失清单并排序",
  "attachments": ["invoice-1.png", "invoice-2.pdf"]
}
```

校验规则：

- `inputText` 必填
- 最少 8 字符
- `attachments` 最多 10 条

成功响应：`201`

```json
{
  "taskId": "invoice-recovery-archive-mabcd-1a2b",
  "moduleKey": "invoice-recovery-archive",
  "status": "queued",
  "summary": "Task queued and waiting for execution (scenario: archive-cleanup).",
  "updatedAt": "2026-03-12T07:20:00.000Z",
  "reportUrl": "",
  "errorMessage": null
}
```

状态说明：

- `queued`：排队中
- `running`：执行中
- `review`：待审核（manual/hybrid 命中风险）
- `completed`：完成
- `failed`：失败

### 7.5 获取单个任务

### `GET /api/modules/:moduleKey/tasks/:taskId`

响应同 7.4。

---

## 8. 管理端接口 `/api/admin`（需 admin）

说明：本章所有查询类接口（统计、用户、任务、模块概览、报表、设置）默认仅返回当前登录管理员所属租户的数据。

### 8.1 管理统计

### `GET /api/admin/stats`

响应：

```json
{
  "totalUsers": 3,
  "totalTasks": 34,
  "completedTasks": 30,
  "failedTasks": 0,
  "runningTasks": 4,
  "pendingReviewTasks": 0,
  "successRate": 88,
  "moduleRanking": [
    {
      "moduleKey": "invoice-recovery-archive",
      "name": "发票追索与归档整理",
      "category": "enterprise",
      "icon": "Tickets",
      "total": 8,
      "completed": 8,
      "failed": 0,
      "running": 0,
      "queued": 0,
      "review": 0
    }
  ]
}
```

### 8.2 用户列表

### `GET /api/admin/users?page=1&limit=50&search=`

响应：

```json
{
  "users": [
    {
      "id": "u-demo-001",
      "tenantId": "t-demo-001",
      "name": "演示客户",
      "contact": "demo@openclaw.ai",
      "enabledModules": ["..."],
      "role": "customer",
      "tokenState": "active",
      "taskCount": 12,
      "lastTaskAt": "2026-03-12T07:20:00.000Z"
    }
  ],
  "total": 3
}
```

备注：当前实现可能包含内部字段（如密码相关字段），生产环境建议服务端脱敏后再对外。

### 8.3 更新用户模块权限

### `PUT /api/admin/users/:id/modules`

请求体：

```json
{
  "modules": ["invoice-recovery-archive", "product-health-check"]
}
```

响应：

```json
{ "ok": true }
```

### 8.4 全局任务列表（含汇总）

### `GET /api/admin/tasks`

查询参数：

- `page`
- `limit`
- `status`（可选：`review|queued|running|completed|failed`）
- `moduleKey`
- `keyword`（任务ID/用户ID/场景/输入/摘要模糊查询）

响应：

```json
{
  "tasks": [
    {
      "taskId": "invoice-recovery-archive-abc-12ef",
      "tenantId": "t-demo-001",
      "ownerId": "u-demo-001",
      "moduleKey": "invoice-recovery-archive",
      "scenario": "archive-cleanup",
      "inputText": "...",
      "attachments": ["invoice-1.png"],
      "status": "completed",
      "summary": "...",
      "reportUrl": "/reports/xxx.html?access=...",
      "reportFormat": "html",
      "errorMessage": null,
      "createdAt": "2026-03-12T06:20:00.000Z",
      "updatedAt": "2026-03-12T07:20:00.000Z"
    }
  ],
  "total": 34,
  "summary": {
    "total": 34,
    "review": 0,
    "queued": 4,
    "running": 0,
    "completed": 30,
    "failed": 0,
    "processing": 4,
    "successRate": 88
  }
}
```

### 8.5 任务详情

### `GET /api/admin/tasks/:taskId`

响应：单条任务对象（结构同 `tasks[]`）。

### 8.6 单任务审核

### `POST /api/admin/tasks/:taskId/review`

请求体：

```json
{
  "action": "approve",
  "reason": "可选，驳回时建议填写"
}
```

`action`：`approve | reject`

响应：审核后的任务对象。

错误码：

- `400 INVALID_REVIEW_ACTION`
- `404 TASK_NOT_FOUND`
- `409 TASK_NOT_REVIEWABLE`

### 8.7 批量审核

### `POST /api/admin/tasks/review-bulk`

请求体：

```json
{
  "taskIds": ["task-1", "task-2"],
  "action": "reject",
  "reason": "批量驳回原因"
}
```

响应：

```json
{
  "processed": 2,
  "success": 1,
  "failed": 1,
  "failedItems": [
    {
      "taskId": "task-2",
      "code": "TASK_NOT_REVIEWABLE",
      "message": "Only tasks in review status can be processed."
    }
  ],
  "items": [
    {
      "taskId": "task-1",
      "status": "failed"
    }
  ]
}
```

### 8.8 模块概览

### `GET /api/admin/module/:moduleKey/overview`

响应：

```json
{
  "module": {
    "moduleKey": "invoice-recovery-archive",
    "name": "发票追索与归档整理",
    "description": "...",
    "category": "enterprise",
    "icon": "Tickets"
  },
  "stat": {
    "total": 8,
    "completed": 8,
    "failed": 0,
    "running": 0,
    "queued": 0,
    "review": 0,
    "successRate": 100
  },
  "activeUsers": 2,
  "recentTasks": []
}
```

### 8.9 模块任务列表

### `GET /api/admin/module/:moduleKey/tasks?page=1&limit=50&status=&keyword=&featureKey=`

新增查询参数：

- `keyword`：按场景、输入、摘要模糊搜索
- `featureKey`：按子功能过滤（用于模块概览页“查看数据”跳转）

响应示例：

```json
{
  "tasks": [],
  "total": 12,
  "summary": {
    "total": 12,
    "review": 2,
    "queued": 1,
    "running": 1,
    "completed": 7,
    "failed": 1,
    "processing": 2,
    "successRate": 58
  },
  "featureApplied": {
    "key": "invoice-tasks",
    "name": "发票任务",
    "description": "发票识别、校验与归档执行队列。"
  }
}
```

### 8.9.1 模块子功能记录列表

### `GET /api/admin/module/:moduleKey/features/:featureKey/records?page=1&limit=20&status=&keyword=`

用于查询某个模块子功能下的专属记录（由任务完成后自动沉淀）。

查询参数：

- `status`：按记录状态过滤（`review/queued/running/completed/failed`）
- `keyword`：按记录 ID、任务 ID、场景、子功能名称模糊搜索

响应示例：

```json
{
  "records": [
    {
      "recordId": "invoice-recovery-archive-abc123:invoice-tasks",
      "tenantId": "t-demo-001",
      "taskId": "invoice-recovery-archive-abc123",
      "ownerId": "u-demo-001",
      "moduleKey": "invoice-recovery-archive",
      "featureKey": "invoice-tasks",
      "featureName": "发票任务",
      "scenario": "archive-cleanup",
      "status": "completed",
      "payload": {
        "headline": "发票任务 · archive-cleanup",
        "highlights": ["生成 3 个关键指标", "未发现阻断风险"],
        "finding": "归档任务已完成，建议复核超期票据。",
        "recommendation": "建议继续跟踪该子功能核心指标并定期复盘规则。",
        "details": {
          "score": 91,
          "riskLevel": "low"
        }
      },
      "createdAt": "2026-03-13T03:10:00.000Z",
      "updatedAt": "2026-03-13T03:10:00.000Z"
    }
  ],
  "total": 1,
  "summary": {
    "total": 1,
    "review": 0,
    "queued": 0,
    "running": 0,
    "completed": 1,
    "failed": 0,
    "processing": 0,
    "successRate": 100
  },
  "featureApplied": {
    "key": "invoice-tasks",
    "name": "发票任务",
    "description": "发票识别、校验与归档执行队列。"
  }
}
```

### 8.10 模块用户列表

### `GET /api/admin/module/:moduleKey/users`

响应：用户数组（含模块维度 `taskCount/lastTaskAt`）。

### 8.11 模块报告列表

### `GET /api/admin/module/:moduleKey/reports`

响应：

```json
[
  {
    "taskId": "task-1",
    "scenario": "archive-cleanup",
    "updatedAt": "2026-03-12T07:20:00.000Z",
    "reportFormat": "html",
    "reportUrl": "/reports/task-1.html?access=..."
  }
]
```

### 8.12 模块专属工作台

### `GET /api/admin/module/:moduleKey/workbench`

用于获取模块独有能力看板数据（子功能导航、专属 KPI、洞察文案）。

响应示例：

```json
{
  "moduleKey": "invoice-recovery-archive",
  "moduleName": "发票追索与归档整理",
  "projectName": "发票追索与归档子后台",
  "uniqueValue": "围绕票据归档、追索提醒与目录治理形成闭环。",
  "featureMenus": [
    {
      "key": "invoice-tasks",
      "name": "发票任务",
      "description": "发票识别、校验与归档执行队列。",
      "target": "tasks",
      "targetPath": "/admin/module/invoice-recovery-archive/tasks?featureKey=invoice-tasks",
      "taskCount": 8,
      "pendingCount": 1,
      "completedCount": 6,
      "successRate": 75,
      "lastUpdatedAt": "2026-03-13T03:12:10.000Z",
      "status": "running"
    }
  ],
  "kpiCards": [
    {
      "key": "archiveSuccessRate",
      "label": "归档成功率",
      "value": 92,
      "unit": "%",
      "target": 92,
      "delta": 0,
      "level": "good",
      "description": "发票归档流程一次完成比例。",
      "calc": "successRate",
      "activeUsers": 2
    }
  ],
  "insights": ["该模块当前共 12 条任务，成功率 58% 。"]
}
```

### 8.13 模块设置查询

### `GET /api/admin/module/:moduleKey/settings`

响应：

```json
{
  "moduleKey": "invoice-recovery-archive",
  "moduleName": "发票追索与归档整理",
  "moduleCategory": "enterprise",
  "source": "saved",
  "updatedBy": "u-admin-001",
  "updatedAt": "2026-03-12T07:20:00.000Z",
  "createdAt": "2026-03-12T06:00:00.000Z",
  "config": {
    "execution": {
      "mode": "hybrid",
      "maxConcurrency": 3,
      "timeoutSeconds": 180,
      "retryLimit": 1
    },
    "alerts": {
      "enabled": true,
      "channels": ["site"],
      "webhookUrl": "",
      "emails": []
    },
    "visibility": {
      "allowCustomerView": true,
      "allowExport": true
    },
    "rule": {
      "focusChecks": ["..."],
      "riskSignals": ["..."],
      "failSignals": ["..."],
      "nextActions": ["..."]
    },
    "integrations": {
      "dataSource": "openclaw",
      "dashboardPath": "/admin/module/invoice-recovery-archive",
      "moduleCategory": "enterprise"
    },
    "remarks": ""
  }
}
```

### 8.14 更新模块设置

### `PUT /api/admin/module/:moduleKey/settings`

请求体可传：

- 直接传配置对象
- 或 `{ "config": { ... } }`

关键约束：

- `execution.mode`: `auto|manual|hybrid`
- `execution.maxConcurrency`: `1..20`
- `execution.timeoutSeconds`: `30..3600`
- `execution.retryLimit`: `0..10`
- `alerts.channels`: 仅允许 `site|email|webhook`

响应：更新后的设置对象（同 8.13）。

### 8.15 数据字典

### `GET /api/admin/dictionary?type=`

查询参数：

- `type`（可选）：按字典类型过滤，如 `role`、`task_status`、`tenant_type`、`tenant_status`、`module_category`、`setting_mode`

响应：

```json
{
  "items": [
    {
      "id": 1,
      "dictType": "role",
      "dictKey": "admin",
      "dictValue": "admin",
      "dictLabel": "管理员",
      "description": "系统管理员账号",
      "sortOrder": 10,
      "isSystem": true,
      "status": "active",
      "createdAt": "2026-03-13T06:00:00.000Z",
      "updatedAt": "2026-03-13T06:00:00.000Z"
    }
  ],
  "grouped": {
    "role": [
      {
        "id": 1,
        "dictType": "role",
        "dictKey": "admin",
        "dictValue": "admin",
        "dictLabel": "管理员",
        "description": "系统管理员账号",
        "sortOrder": 10,
        "isSystem": true,
        "status": "active",
        "createdAt": "2026-03-13T06:00:00.000Z",
        "updatedAt": "2026-03-13T06:00:00.000Z"
      }
    ]
  }
}
```

### 8.16 子模块后台生成器

### `GET /api/admin/module-factory/modules`

返回已生成的自定义子模块列表（持久化）。

### `POST /api/admin/module-factory/generate`

请求体：

```json
{
  "moduleName": "企业合同履约监控",
  "moduleKey": "contract-fulfillment-monitor",
  "category": "enterprise",
  "icon": "Monitor",
  "status": "beta",
  "description": "可选",
  "designDoc": "粘贴完整设计文档..."
}
```

说明：

- `moduleKey` 可选，不传时系统自动生成。
- 系统会根据 `designDoc` 自动生成：
  - 模块定义（名称/分类/状态等）
  - 子功能菜单（featureMenus）
  - 模块 KPI 定义（kpiDefinitions）
  - 模块执行规则（executionRule）
- 生成后会自动为当前管理员开通该模块，并可直接进入 `/admin/module/{moduleKey}`。

---

## 9. 报告下载接口 `/reports`

### 9.1 下载报告

### `GET /reports/:fileName`

支持两种鉴权方式：

- 方式 A：Header 携带 `Authorization: Bearer <JWT>`
- 方式 B：URL 查询参数 `?access=<report_access_token>`

返回：报告文件（通常 `html`）

典型错误码：

- `404 REPORT_FILE_NOT_FOUND`
- `401 REPORT_AUTH_REQUIRED`
- `401 REPORT_AUTH_INVALID`
- `401 REPORT_AUTH_EXPIRED`
- `404 REPORT_RECORD_NOT_FOUND`
- `403 REPORT_FORBIDDEN`
- `403 REPORT_SCOPE_MISMATCH`

---

## 10. 模块键值映射（15个）

| moduleKey | 中文名称 | 分类 |
|---|---|---|
| `invoice-recovery-archive` | 发票追索与归档整理 | enterprise |
| `debt-evidence-manager` | 欠款证据管家 | enterprise |
| `enterprise-marketing-automation` | 企业营销全自动 | enterprise |
| `public-opinion-monitoring` | 企业舆情监控 | enterprise |
| `lead-capture-followup` | 企业线索抓取与跟进 | enterprise |
| `private-domain-operations` | 企业私域自动运营 | enterprise |
| `competitor-monitoring` | 企业竞品监控 | enterprise |
| `data-retrospective-automation` | 企业数据复盘自动化 | enterprise |
| `matchmaking-ai` | 高学历相亲 AI 自动匹配 | personal |
| `product-health-check` | AI 商品体检 | personal |
| `anti-fraud-guardian` | 个人反诈守护 | personal |
| `personal-invoice-manager` | 个人发票管理 | personal |
| `teacher-knowledge-monetization` | 教师知识库 + 投稿变现 | personal |
| `job-lead-capture` | 个人求职线索自动抓取 | personal |
| `content-auto-publishing` | 个人内容自动生成与发布 | personal |

---

## 11. 快速调用示例

### 11.1 登录并获取 token

```bash
curl -X POST http://127.0.0.1:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"demo@openclaw.ai","password":"123456","remember":true}'
```

### 11.2 拉取管理端任务列表

```bash
curl "http://127.0.0.1:4000/api/admin/tasks?page=1&limit=20&status=review" \
  -H "Authorization: Bearer <JWT>"
```

### 11.3 创建模块任务

```bash
curl -X POST http://127.0.0.1:4000/api/modules/invoice-recovery-archive/tasks \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"scenario":"archive-cleanup","inputText":"请输出归档缺失清单","attachments":[]}'
```

---

## 12. 后续建议

- 建议保持 `docs/openapi.yaml` 与本文档同步更新，避免联调字段漂移。
- 建议在 `/api/admin/users` 与 `/api/admin/module/:moduleKey/users` 响应中做字段脱敏，避免泄露内部密码相关字段。
