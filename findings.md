# Findings

## 当前完成度判断
- 当前状态是“可用 MVP”，未达到“生产完善版”。
- 核心业务链路可跑通：监测对象、风险识别、证据、报告、投诉材料、套餐配额。

## 关键缺口（按优先级）
- P0: 前后端 `moduleKey` 存在 3 组不一致，存在路由/权限不匹配风险。
  - 前端：`matchmaking-assistant` / `job-lead-automation` / `content-generation-publisher`
  - 后端：`matchmaking-ai` / `job-lead-capture` / `content-auto-publishing`
- P0: 前端权限归一化逻辑会把模块“全开”，权限边界被弱化。
- P1: 存在演示态功能（如附件上传仅前端展示，不入库不存储）。
- P1: 自动化测试覆盖不足，回归保障弱。
- P1: 无平台 API 接入（当前为设计内预期，不算缺陷，但限制了自动化采集能力）。

## 已确认边界
- 当前版本明确不做抖音/快手等外部真实抓取，以手工/半手工输入为主。
- 当前版本不做支付对接，套餐走人工开通流程。

## 本轮冲刺目标（1周）
- 先完成一致性与权限修复（P0），确保“可稳定内测”。
- 再补测试与上线文档（P1），确保“可重复发布”。

## 2026-03-13 Phase 1 完成情况
- 后端 catalog 已切换为前端同一组模块 key（3 组差异已统一）。
- 增加 key 兼容层：
  - 路由/服务入参支持旧 key 并归一为新 key。
  - 任务查询支持新旧 key 变体匹配。
- 增加数据迁移：
  - 启动时自动归一 `users.enabled_modules_json`。
  - 启动时自动迁移 `tasks.module_key` 旧值到新值。

## 2026-03-13 Phase 2 完成情况
- 前端权限归一逻辑已由“全开”改为“仅后端返回开通模块”。
- 增加前端旧 key 兼容映射，避免历史本地会话导致权限显示异常。
- 路由守卫与模块菜单逻辑可复用归一后的 `enabledModules`，权限边界收紧。

## 2026-03-13 Phase 3（后端）完成情况
- 反诈服务新增关键输入校验：
  - 订阅月数范围校验
  - 目标类型/状态校验
  - 报告周期与投诉场景校验
  - 证据 ID 完整性校验
- 买菜服务新增数值边界校验：
  - 预算/人数/餐次非法值拦截
  - 比价条目数量上限
- 通用任务服务新增约束：
  - 场景长度、输入长度、附件数量限制

## 2026-03-13 Phase 3（前端联调）完成情况
- 反诈页面新增前置校验：
  - 目标名称/账号长度
  - 扫描标题与文本长度
  - 投诉证据数量上限
- 买菜页面新增前置校验：
  - 预算/人数/餐次范围
  - 比价条目数量上限
  - 新鲜度图片名长度
- 通用任务页新增前置校验：
  - 场景、输入、附件数量边界

## 2026-03-13 Phase 4（后端回归测试）阶段结果
- 新增 Node 内置测试回归集（`node:test`）：
  - `server/tests/auth-service.test.js`
  - `server/tests/task-service.test.js`
  - `server/tests/anti-fraud-service.test.js`
- 测试执行命令标准化为：
  - `npm run test:server` -> `node --test "server/tests/**/*.test.js"`
- 回归测试识别并促成修复的缺陷：
  - `task-service` 模块 key 归一化丢失，触发 `normalizedModuleKey` 未定义与兼容失败。
  - `task-service` 场景/输入/附件边界校验在合并后丢失。
  - `auth-service` 客户注册默认模块在合并后缺少 `anti-fraud-guardian` 与 `smart-grocery-supermarket`。
- 当前结果：
  - 后端回归测试 15/15 通过。
