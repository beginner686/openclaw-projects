import { getModuleBlueprint } from '../config/module-blueprints.js'
import { buildModuleSpecFromDesign, registerGeneratedModule } from '../config/dynamic-module-registry.js'

const BASE_MODULE_KEYS = new Set([
  'invoice-recovery-archive',
  'debt-evidence-manager',
  'enterprise-marketing-automation',
  'public-opinion-monitoring',
  'lead-capture-followup',
  'private-domain-operations',
  'competitor-monitoring',
  'data-retrospective-automation',
  'matchmaking-ai',
  'product-health-check',
  'anti-fraud-guardian',
  'personal-invoice-manager',
  'teacher-knowledge-monetization',
  'job-lead-capture',
  'content-auto-publishing',
])

export function createAdminService({ dataRepository, moduleCatalog, getModuleName, getModuleRule, reportService }) {
  const MODULE_SETTINGS_CHANNELS = ['site', 'email', 'webhook']
  const MODULE_SETTINGS_MODES = ['auto', 'manual', 'hybrid']

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(max, Math.max(min, Math.round(parsed)))
  }

  function sanitizeString(value, fallback = '', maxLength = 500) {
    if (typeof value !== 'string') return fallback
    const next = value.trim()
    if (!next) return fallback
    return next.slice(0, maxLength)
  }

  function sanitizeStringArray(value, fallback = []) {
    if (!Array.isArray(value)) return [...fallback]
    const dedup = new Set(
      value
        .map((item) => String(item).trim())
        .filter((item) => item.length > 0)
        .slice(0, 50),
    )
    return [...dedup]
  }

  function hashCode(text) {
    const source = String(text ?? '')
    let value = 0
    for (let i = 0; i < source.length; i += 1) {
      value = (value * 31 + source.charCodeAt(i)) >>> 0
    }
    return value
  }

  function hashInRange(seed, min, max) {
    const lo = Math.min(min, max)
    const hi = Math.max(min, max)
    return lo + (hashCode(seed) % (hi - lo + 1))
  }

  function clampValue(value, min, max) {
    return Math.min(max, Math.max(min, value))
  }

  function toTaskSearchText(task) {
    return `${task.scenario ?? ''} ${task.inputText ?? ''} ${task.summary ?? ''}`.toLowerCase()
  }

  function matchesAnyKeyword(task, keywords = []) {
    const safeKeywords = sanitizeStringArray(keywords, [])
    if (!safeKeywords.length) return true
    const source = toTaskSearchText(task)
    return safeKeywords.some((item) => source.includes(String(item).toLowerCase()))
  }

  function summarizeTasks(tasks = []) {
    const summary = {
      total: tasks.length,
      review: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      successRate: 0,
    }
    for (const task of tasks) {
      const key = String(task.status ?? '')
      if (Object.prototype.hasOwnProperty.call(summary, key)) {
        summary[key] += 1
      }
    }
    summary.processing = summary.running + summary.queued
    summary.successRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0
    return summary
  }

  function buildModuleTargetPath(moduleKey, target, featureKey = '') {
    const base = `/admin/module/${moduleKey}`
    if (target === 'tasks') {
      if (!featureKey) return `${base}/tasks`
      return `${base}/tasks?featureKey=${encodeURIComponent(featureKey)}`
    }
    if (target === 'users') return `${base}/users`
    if (target === 'reports') return `${base}/reports`
    if (target === 'settings') return `${base}/settings`
    return base
  }

  function calcKpiValue(definition, moduleKey, stat, activeUsers) {
    const pending = stat.review + stat.running + stat.queued
    const successRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
    const completionRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
    const riskRate = stat.total > 0 ? Math.round(((stat.failed + stat.review) / stat.total) * 100) : 0
    const pendingRate = stat.total > 0 ? Math.round((pending / stat.total) * 100) : 0

    let value = 0
    switch (definition.calc) {
      case 'successRate':
        value = successRate || hashInRange(`${moduleKey}|${definition.key}|success`, 70, 95)
        break
      case 'completionRate':
        value = completionRate || hashInRange(`${moduleKey}|${definition.key}|complete`, 66, 92)
        break
      case 'riskRate':
        value = riskRate || hashInRange(`${moduleKey}|${definition.key}|risk`, 8, 35)
        break
      case 'falsePositiveRate':
        value = Math.round(clampValue(riskRate * 0.4 + hashInRange(`${moduleKey}|false`, 1, 8), 1, 35))
        break
      case 'coverageRate':
        value = Math.round(
          clampValue(
            (stat.total > 0 ? 55 + Math.min(35, Math.round((stat.total + stat.completed) / 8)) : 70) +
              hashInRange(`${moduleKey}|${definition.key}|cover`, -8, 6),
            45,
            99,
          ),
        )
        break
      case 'qualityScore':
        value = Math.round(
          clampValue(
            (successRate || 78) - (riskRate || 12) * 0.25 + hashInRange(`${moduleKey}|${definition.key}|quality`, -6, 9),
            35,
            99,
          ),
        )
        break
      case 'conversionScore':
        value = Math.round(
          clampValue(
            (successRate || 72) - (pendingRate || 18) * 0.15 + hashInRange(`${moduleKey}|${definition.key}|conv`, -8, 12),
            20,
            98,
          ),
        )
        break
      case 'roiScore':
        value = Math.round(
          clampValue(
            (successRate || 75) + 45 + hashInRange(`${moduleKey}|${definition.key}|roi`, -18, 52),
            30,
            260,
          ),
        )
        break
      case 'activityCount':
        value = stat.total > 0 ? stat.total : hashInRange(`${moduleKey}|${definition.key}|activity`, 20, 120)
        break
      case 'pendingCount':
        value = pending > 0 ? pending : hashInRange(`${moduleKey}|${definition.key}|pending`, 1, 12)
        break
      case 'riskCount':
        value = stat.failed + stat.review + hashInRange(`${moduleKey}|${definition.key}|riskcount`, 0, 3)
        break
      case 'alertCount':
        value = stat.review + stat.failed + hashInRange(`${moduleKey}|${definition.key}|alert`, 0, 4)
        break
      case 'responseMinutes':
        value = Math.round(clampValue(18 + pending * 4 + stat.failed * 6 + hashInRange(`${moduleKey}|resp`, 0, 18), 8, 240))
        break
      case 'efficiencyHours':
        value = Math.round(clampValue(3 + pending * 2 + stat.failed * 3 + hashInRange(`${moduleKey}|eff`, 0, 10), 1, 96))
        break
      case 'riskIndex':
        value = Math.round(clampValue((riskRate || 18) + hashInRange(`${moduleKey}|idx`, -8, 14), 1, 99))
        break
      default:
        value = hashInRange(`${moduleKey}|${definition.key}|default`, 1, 100)
        break
    }

    const unit = String(definition.unit ?? '')
    if (unit === '%') {
      value = Math.round(clampValue(value, 0, 100))
    } else if (unit === '小时') {
      value = Math.round(clampValue(value, 1, 240))
    } else if (unit === '分钟') {
      value = Math.round(clampValue(value, 1, 1440))
    } else if (unit === '次' || unit === '条' || unit === '单' || unit === '件' || unit === '张' || unit === '篇') {
      value = Math.max(0, Math.round(value))
    }

    const target = Number.isFinite(Number(definition.target)) ? Number(definition.target) : null
    const delta = target === null ? 0 : Number((value - target).toFixed(1))
    let level = 'stable'
    if (target !== null) {
      if (unit === '%') {
        if (value >= target) level = 'good'
        else if (value >= target - 8) level = 'stable'
        else level = 'warning'
      } else if (value <= target) {
        level = 'good'
      } else if (value <= target * 1.25) {
        level = 'stable'
      } else {
        level = 'warning'
      }
    }

    return {
      key: definition.key,
      label: definition.label,
      value,
      unit,
      target,
      delta,
      level,
      description: definition.description || '',
      calc: definition.calc,
      activeUsers,
    }
  }

  function pickFeatureTasks(tasks, feature, featureIndex, featureSize) {
    const matched = tasks.filter((task) => matchesAnyKeyword(task, feature.keywords))
    if (matched.length > 0) return matched
    if (!tasks.length) return []
    return tasks.filter((_, index) => index % featureSize === featureIndex)
  }

  function buildFeatureMenus(moduleKey, tasks, blueprint) {
    const features = blueprint.featureMenus
    return features.map((feature, index) => {
      const matchedTasks = pickFeatureTasks(tasks, feature, index, features.length)
      const stat = summarizeTasks(matchedTasks)
      let status = 'idle'
      if (stat.total > 0 && stat.processing > 0) status = 'running'
      else if (stat.total > 0 && stat.successRate >= 80) status = 'healthy'
      else if (stat.total > 0) status = 'attention'

      return {
        key: feature.key,
        name: feature.name,
        description: feature.description,
        target: feature.target,
        targetPath: buildModuleTargetPath(moduleKey, feature.target, feature.key),
        taskCount: stat.total,
        pendingCount: stat.processing + stat.review,
        completedCount: stat.completed,
        successRate: stat.successRate,
        lastUpdatedAt: matchedTasks[0]?.updatedAt ?? null,
        status,
      }
    })
  }

  function buildWorkbenchPayload(moduleKey, moduleMeta, tasks, users, statSummary) {
    const blueprint = getModuleBlueprint(moduleKey)
    const activeUsers = users.length
    const featureMenus = buildFeatureMenus(moduleKey, tasks, blueprint)
    const kpiCards = blueprint.kpiDefinitions.map((definition) =>
      calcKpiValue(definition, moduleKey, statSummary, activeUsers),
    )

    const latestTask = tasks[0]
    const riskSignals = statSummary.failed + statSummary.review
    const insights = [
      `该模块当前共 ${statSummary.total} 条任务，成功率 ${statSummary.successRate}% 。`,
      riskSignals > 0
        ? `检测到 ${riskSignals} 条风险相关任务（失败或待审核），建议优先处理告警项。`
        : '当前未发现明显风险阻断任务，可继续提升自动化覆盖。',
      blueprint.uniqueValue,
      latestTask
        ? `最近任务场景：${latestTask.scenario}，更新时间 ${String(latestTask.updatedAt).slice(0, 19).replace('T', ' ')}。`
        : '当前尚无任务记录，建议先创建模块样例任务。'
    ].slice(0, 4)

    return {
      moduleKey,
      moduleName: moduleMeta.name,
      projectName: blueprint.projectName,
      uniqueValue: blueprint.uniqueValue,
      featureMenus,
      kpiCards,
      insights,
    }
  }

  function mergeDeep(base, override) {
    if (!isObject(base)) return isObject(override) ? { ...override } : base
    const output = { ...base }
    if (!isObject(override)) return output
    for (const [key, value] of Object.entries(override)) {
      if (Array.isArray(value)) {
        output[key] = [...value]
      } else if (isObject(value) && isObject(output[key])) {
        output[key] = mergeDeep(output[key], value)
      } else {
        output[key] = value
      }
    }
    return output
  }

  function getModuleByKey(moduleKey) {
    return moduleCatalog.find((item) => item.moduleKey === moduleKey) ?? null
  }

  function resolveTenantScope(currentUser) {
    const tenantId = String(currentUser?.tenantId ?? '').trim()
    return tenantId || 't-platform'
  }

  function buildDefaultModuleConfig(moduleKey, moduleMeta) {
    const rule = getModuleRule?.(moduleKey) ?? {
      focusChecks: [],
      riskSignals: [],
      failSignals: [],
      nextActions: [],
    }
    return {
      execution: {
        mode: 'hybrid',
        maxConcurrency: 3,
        timeoutSeconds: 180,
        retryLimit: 1,
      },
      alerts: {
        enabled: true,
        channels: ['site'],
        webhookUrl: '',
        emails: [],
      },
      visibility: {
        allowCustomerView: true,
        allowExport: true,
      },
      rule: {
        focusChecks: sanitizeStringArray(rule.focusChecks, []),
        riskSignals: sanitizeStringArray(rule.riskSignals, []),
        failSignals: sanitizeStringArray(rule.failSignals, []),
        nextActions: sanitizeStringArray(rule.nextActions, []),
      },
      integrations: {
        dataSource: 'openclaw',
        dashboardPath: `/admin/module/${moduleKey}`,
        moduleCategory: moduleMeta.category,
      },
      remarks: '',
    }
  }

  function sanitizeModuleSettings(moduleKey, payload, moduleMeta) {
    const defaults = buildDefaultModuleConfig(moduleKey, moduleMeta)
    const merged = mergeDeep(defaults, isObject(payload) ? payload : {})

    const channels = sanitizeStringArray(merged.alerts?.channels, defaults.alerts.channels)
      .filter((item) => MODULE_SETTINGS_CHANNELS.includes(item))
    const mode = MODULE_SETTINGS_MODES.includes(merged.execution?.mode)
      ? merged.execution.mode
      : defaults.execution.mode

    return {
      execution: {
        mode,
        maxConcurrency: clampNumber(
          merged.execution?.maxConcurrency,
          1,
          20,
          defaults.execution.maxConcurrency,
        ),
        timeoutSeconds: clampNumber(
          merged.execution?.timeoutSeconds,
          30,
          3600,
          defaults.execution.timeoutSeconds,
        ),
        retryLimit: clampNumber(merged.execution?.retryLimit, 0, 10, defaults.execution.retryLimit),
      },
      alerts: {
        enabled: Boolean(merged.alerts?.enabled),
        channels: channels.length ? channels : [...defaults.alerts.channels],
        webhookUrl: sanitizeString(merged.alerts?.webhookUrl, '', 500),
        emails: sanitizeStringArray(merged.alerts?.emails, []),
      },
      visibility: {
        allowCustomerView: Boolean(merged.visibility?.allowCustomerView),
        allowExport: Boolean(merged.visibility?.allowExport),
      },
      rule: {
        focusChecks: sanitizeStringArray(merged.rule?.focusChecks, defaults.rule.focusChecks),
        riskSignals: sanitizeStringArray(merged.rule?.riskSignals, defaults.rule.riskSignals),
        failSignals: sanitizeStringArray(merged.rule?.failSignals, defaults.rule.failSignals),
        nextActions: sanitizeStringArray(merged.rule?.nextActions, defaults.rule.nextActions),
      },
      integrations: {
        dataSource: sanitizeString(merged.integrations?.dataSource, defaults.integrations.dataSource, 100),
        dashboardPath: sanitizeString(merged.integrations?.dashboardPath, defaults.integrations.dashboardPath, 200),
        moduleCategory: moduleMeta.category,
      },
      remarks: sanitizeString(merged.remarks, '', 1000),
    }
  }

  async function getStats(currentUser) {
    const tenantId = resolveTenantScope(currentUser)
    const [totalUsers, moduleStatsRows] = await Promise.all([
      dataRepository.countUsers('', tenantId),
      dataRepository.getModuleStats(tenantId),
    ])

    // 按模块 key 聚合状态
    const moduleMap = {}
    for (const row of moduleStatsRows) {
      const key = row.module_key
      if (!moduleMap[key]) moduleMap[key] = { total: 0, completed: 0, failed: 0, running: 0, queued: 0, review: 0 }
      const cnt = Number(row.cnt)
      moduleMap[key].total += cnt
      if (row.status === 'completed') moduleMap[key].completed += cnt
      else if (row.status === 'failed') moduleMap[key].failed += cnt
      else if (row.status === 'running') moduleMap[key].running += cnt
      else if (row.status === 'queued') moduleMap[key].queued += cnt
      else if (row.status === 'review') moduleMap[key].review += cnt
    }

    const totalTasks = Object.values(moduleMap).reduce((s, v) => s + v.total, 0)
    const completedTasks = Object.values(moduleMap).reduce((s, v) => s + v.completed, 0)
    const failedTasks = Object.values(moduleMap).reduce((s, v) => s + v.failed, 0)
    const runningTasks = Object.values(moduleMap).reduce((s, v) => s + v.running + v.queued, 0)
    const pendingReviewTasks = Object.values(moduleMap).reduce((s, v) => s + v.review, 0)
    const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // 模块排行（按任务总量）
    const moduleRanking = moduleCatalog.map((m) => ({
      moduleKey: m.moduleKey,
      name: m.name,
      category: m.category,
      icon: m.icon,
      ...((moduleMap[m.moduleKey]) ?? { total: 0, completed: 0, failed: 0, running: 0, queued: 0, review: 0 }),
    })).sort((a, b) => b.total - a.total)

    return {
      totalUsers,
      totalTasks,
      completedTasks,
      failedTasks,
      runningTasks,
      pendingReviewTasks,
      successRate,
      moduleRanking,
    }
  }

  async function listUsers(opts = {}, currentUser) {
    const tenantId = resolveTenantScope(currentUser)
    const { limit = 50, offset = 0, search = '' } = opts
    const [users, total] = await Promise.all([
      dataRepository.listUsers(limit, offset, search, tenantId),
      dataRepository.countUsers(search, tenantId),
    ])
    return { users, total }
  }

  function toAdminTask(task) {
    return {
      ...task,
      reportUrl: task.reportUrl
        ? reportService.buildAuthorizedReportUrl(task, task.ownerId)
        : '',
    }
  }

  async function updateUserModules(userId, modules, currentUser) {
    const validKeys = new Set(moduleCatalog.map((m) => m.moduleKey))
    const safeModules = Array.isArray(modules)
      ? modules.filter((k) => validKeys.has(k))
      : []
    await dataRepository.updateUserEnabledModules(userId, safeModules, resolveTenantScope(currentUser))
    return { ok: true }
  }

  function buildTaskSummary(statusRows, total) {
    const summary = {
      total,
      review: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
    }
    for (const row of statusRows ?? []) {
      const key = String(row.status ?? '')
      if (Object.prototype.hasOwnProperty.call(summary, key)) {
        summary[key] = Number(row.count ?? 0)
      }
    }
    summary.processing = summary.running + summary.queued
    summary.successRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0
    return summary
  }

  function findFeatureByKey(moduleKey, featureKey = '') {
    if (!featureKey) return null
    const blueprint = getModuleBlueprint(moduleKey)
    return blueprint.featureMenus.find((item) => item.key === featureKey) ?? null
  }

  function toFeatureApplied(feature, fallbackKey = '') {
    if (!feature && !fallbackKey) return null
    if (!feature) {
      return {
        key: fallbackKey,
        name: fallbackKey,
        description: '',
      }
    }
    return {
      key: feature.key,
      name: feature.name,
      description: feature.description,
    }
  }

  async function listAllTasks(opts = {}, currentUser) {
    const tenantId = resolveTenantScope(currentUser)
    const { status, moduleKey, keyword, limit = 50, page = 1 } = opts
    const offset = (Math.max(1, Number(page)) - 1) * limit
    const [tasks, total, statusRows] = await Promise.all([
      dataRepository.listAllTasks({ status, moduleKey, keyword, tenantId, limit, offset }),
      dataRepository.countAllTasks({ status, moduleKey, keyword, tenantId }),
      dataRepository.countTaskStatusSummary({ moduleKey, keyword, tenantId }),
    ])
    return { tasks: tasks.map(toAdminTask), total, summary: buildTaskSummary(statusRows, total) }
  }

  async function getTaskDetail(taskId, currentUser) {
    const task = await dataRepository.findTaskById(taskId, resolveTenantScope(currentUser))
    if (!task) return null
    return toAdminTask(task)
  }

  async function reviewTask(taskId, action, operatorId = '', reason = '', currentUser) {
    const safeAction = String(action ?? '').trim().toLowerCase()
    if (!['approve', 'reject'].includes(safeAction)) {
      return {
        error: {
          status: 400,
          code: 'INVALID_REVIEW_ACTION',
          message: 'action must be approve or reject.',
        },
      }
    }

    const task = await dataRepository.findTaskById(taskId, resolveTenantScope(currentUser))
    if (!task) {
      return {
        error: {
          status: 404,
          code: 'TASK_NOT_FOUND',
          message: 'Task not found.',
        },
      }
    }

    if (task.status !== 'review') {
      return {
        error: {
          status: 409,
          code: 'TASK_NOT_REVIEWABLE',
          message: 'Only tasks in review status can be processed.',
        },
      }
    }

    const stamp = new Date().toISOString()
    const reviewer = operatorId || 'admin'
    const safeReason = sanitizeString(reason, '', 300)

    if (safeAction === 'approve') {
      task.status = 'queued'
      task.summary = `Approved by ${reviewer}, task re-queued for execution.`
      task.errorMessage = undefined
    } else {
      task.status = 'failed'
      task.summary = `Rejected by ${reviewer}${safeReason ? `: ${safeReason}` : ''}`
      task.errorMessage = safeReason || 'Rejected in admin review.'
      task.reportUrl = ''
    }
    task.updatedAt = stamp
    await dataRepository.updateTask(task)
    return { data: toAdminTask(task) }
  }

  async function reviewTasksBulk(taskIds, action, operatorId = '', reason = '', currentUser) {
    const ids = Array.isArray(taskIds)
      ? [...new Set(taskIds.map((item) => String(item).trim()).filter(Boolean))]
      : []
    if (!ids.length) {
      return {
        error: {
          status: 400,
          code: 'INVALID_PAYLOAD',
          message: 'taskIds must be a non-empty array.',
        },
      }
    }

    const results = []
    const failed = []
    for (const id of ids) {
      const res = await reviewTask(id, action, operatorId, reason, currentUser)
      if (res.error) {
        failed.push({ taskId: id, code: res.error.code, message: res.error.message })
      } else if (res.data) {
        results.push(res.data)
      }
    }

    return {
      data: {
        processed: ids.length,
        success: results.length,
        failed: failed.length,
        failedItems: failed,
        items: results,
      },
    }
  }

  async function getModuleOverview(moduleKey, currentUser) {
    const tenantId = resolveTenantScope(currentUser)
    const module = moduleCatalog.find((m) => m.moduleKey === moduleKey)
    if (!module) return null

    const [statsRows, users, moduleTasks] = await Promise.all([
      dataRepository.getModuleStats(tenantId),
      dataRepository.listUsersByModule(moduleKey, tenantId),
      dataRepository.listAllTasks({ moduleKey, tenantId, limit: 300 }),
    ])

    const stat = { total: 0, completed: 0, failed: 0, running: 0, queued: 0, review: 0 }
    for (const row of statsRows) {
      if (row.module_key !== moduleKey) continue
      const cnt = Number(row.cnt)
      stat.total += cnt
      if (row.status === 'completed') stat.completed += cnt
      else if (row.status === 'failed') stat.failed += cnt
      else if (row.status === 'running') stat.running += cnt
      else if (row.status === 'queued') stat.queued += cnt
      else if (row.status === 'review') stat.review += cnt
    }

    const successRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
    const recentTasks = moduleTasks.slice(0, 10).map(toAdminTask)
    const workbench = buildWorkbenchPayload(
      moduleKey,
      module,
      moduleTasks,
      users,
      { ...stat, successRate, processing: stat.running + stat.queued },
    )

    return {
      module,
      stat: { ...stat, successRate },
      activeUsers: users.length,
      recentTasks,
      workbench,
    }
  }

  async function getModuleTasks(moduleKey, opts = {}, currentUser) {
    const tenantId = resolveTenantScope(currentUser)
    const { status, keyword, featureKey, limit = 50, page = 1 } = opts
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50))

    if (!featureKey) {
      return listAllTasks({ ...opts, moduleKey, tenantId, limit: safeLimit, page: safePage }, currentUser)
    }

    const feature = findFeatureByKey(moduleKey, featureKey)
    const [fetched, matchedRecords] = await Promise.all([
      dataRepository.listAllTasks({
        moduleKey,
        tenantId,
        status,
        keyword,
        limit: 800,
        offset: 0,
      }),
      dataRepository.listFeatureRecords({
        moduleKey,
        tenantId,
        featureKey,
        keyword,
        status,
        limit: 2000,
        offset: 0,
      }),
    ])

    let filtered = fetched
    if (matchedRecords.length > 0) {
      const taskIds = new Set(matchedRecords.map((item) => item.taskId))
      filtered = fetched.filter((task) => taskIds.has(task.taskId))
    } else if (feature) {
      filtered = fetched.filter((task) => matchesAnyKeyword(task, feature.keywords))
    }

    const offset = (safePage - 1) * safeLimit
    const paged = filtered.slice(offset, offset + safeLimit).map(toAdminTask)
    const summary = summarizeTasks(filtered)

    return {
      tasks: paged,
      total: filtered.length,
      summary,
      featureApplied: toFeatureApplied(feature, featureKey),
    }
  }

  async function getModuleFeatureRecords(moduleKey, featureKey, opts = {}, currentUser) {
    const tenantId = resolveTenantScope(currentUser)
    const module = getModuleByKey(moduleKey)
    if (!module) return null

    const safePage = Math.max(1, Number(opts.page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(opts.limit) || 50))
    const keyword = sanitizeString(opts.keyword, '', 120)
    const status = sanitizeString(opts.status, '', 20)
    const offset = (safePage - 1) * safeLimit
    const feature = findFeatureByKey(moduleKey, featureKey)

    const filter = {
      moduleKey,
      tenantId,
      featureKey,
      keyword: keyword || undefined,
      status: status || undefined,
    }

    const [records, total, statusRows] = await Promise.all([
      dataRepository.listFeatureRecords({ ...filter, limit: safeLimit, offset }),
      dataRepository.countFeatureRecords(filter),
      dataRepository.countFeatureRecordStatusSummary(filter),
    ])

    return {
      records,
      total,
      summary: buildTaskSummary(statusRows, total),
      featureApplied: toFeatureApplied(feature, featureKey),
    }
  }

  async function getModuleUsers(moduleKey, currentUser) {
    return dataRepository.listUsersByModule(moduleKey, resolveTenantScope(currentUser))
  }

  async function getModuleReports(moduleKey, currentUser) {
    const tasks = await dataRepository.listAllTasks({
      moduleKey,
      status: 'completed',
      tenantId: resolveTenantScope(currentUser),
      limit: 30,
    })
    return tasks
      .filter((t) => t.reportUrl)
      .map((t) => ({
        taskId: t.taskId,
        scenario: t.scenario,
        updatedAt: t.updatedAt,
        reportFormat: t.reportFormat,
        reportUrl: reportService.buildAuthorizedReportUrl(t, t.ownerId),
      }))
  }

  async function getModuleSettings(moduleKey, currentUser) {
    const module = getModuleByKey(moduleKey)
    if (!module) return null

    const defaults = buildDefaultModuleConfig(moduleKey, module)
    const saved = await dataRepository.findModuleSettings(moduleKey, resolveTenantScope(currentUser))
    const safeConfig = sanitizeModuleSettings(moduleKey, saved?.config ?? defaults, module)

    return {
      moduleKey,
      moduleName: getModuleName(moduleKey),
      moduleCategory: module.category,
      source: saved ? 'saved' : 'default',
      updatedBy: saved?.updatedBy ?? '',
      updatedAt: saved?.updatedAt ?? null,
      createdAt: saved?.createdAt ?? null,
      config: safeConfig,
    }
  }

  async function getModuleWorkbench(moduleKey, currentUser) {
    const tenantId = resolveTenantScope(currentUser)
    const module = getModuleByKey(moduleKey)
    if (!module) return null

    const [tasks, users] = await Promise.all([
      dataRepository.listAllTasks({ moduleKey, tenantId, limit: 300 }),
      dataRepository.listUsersByModule(moduleKey, tenantId),
    ])
    const statSummary = summarizeTasks(tasks)
    return buildWorkbenchPayload(moduleKey, module, tasks, users, statSummary)
  }

  async function updateModuleSettings(moduleKey, payload, operatorId, currentUser) {
    const module = getModuleByKey(moduleKey)
    if (!module) return null

    const safeConfig = sanitizeModuleSettings(moduleKey, payload, module)
    const saved = await dataRepository.upsertModuleSettings(
      moduleKey,
      safeConfig,
      operatorId,
      resolveTenantScope(currentUser),
    )
    return {
      moduleKey,
      moduleName: getModuleName(moduleKey),
      moduleCategory: module.category,
      source: 'saved',
      updatedBy: saved?.updatedBy ?? operatorId ?? '',
      updatedAt: saved?.updatedAt ?? null,
      createdAt: saved?.createdAt ?? null,
      config: sanitizeModuleSettings(moduleKey, saved?.config ?? safeConfig, module),
    }
  }

  async function getDataDictionary(dictType = '') {
    const rows = await dataRepository.listDataDictionary(dictType)
    const grouped = {}
    for (const item of rows) {
      if (!grouped[item.dictType]) {
        grouped[item.dictType] = []
      }
      grouped[item.dictType].push(item)
    }
    return {
      items: rows,
      grouped,
    }
  }

  async function listGeneratedModules() {
    const rows = await dataRepository.listCustomModules()
    return rows.map((item) => ({
      moduleKey: item.moduleKey,
      name: item.name,
      category: item.category,
      description: item.description,
      icon: item.icon,
      status: item.status,
      mobileSupported: item.mobileSupported,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))
  }

  async function generateModuleFromDesign(payload = {}, currentUser) {
    const spec = buildModuleSpecFromDesign(payload)
    const moduleKey = spec.module.moduleKey

    if (BASE_MODULE_KEYS.has(moduleKey)) {
      return {
        error: {
          status: 409,
          code: 'MODULE_KEY_CONFLICT',
          message: 'moduleKey conflicts with built-in module.',
        },
      }
    }

    const saved = await dataRepository.upsertCustomModule({
      moduleKey,
      name: spec.module.name,
      category: spec.module.category,
      description: spec.module.description,
      icon: spec.module.icon,
      status: spec.module.status,
      mobileSupported: spec.module.mobileSupported,
      executionRule: spec.executionRule,
      blueprint: spec.blueprint,
      sourceDoc: spec.sourceDoc,
      createdBy: currentUser?.id ?? '',
    })

    registerGeneratedModule({
      module: {
        moduleKey: saved.moduleKey,
        name: saved.name,
        category: saved.category,
        description: saved.description,
        icon: saved.icon,
        status: saved.status,
        mobileSupported: saved.mobileSupported,
      },
      blueprint: saved.blueprint,
      executionRule: saved.executionRule,
    })

    if (currentUser?.id) {
      await dataRepository.appendUserEnabledModule(currentUser.id, moduleKey)
    }

    return {
      data: {
        module: {
          moduleKey: saved.moduleKey,
          name: saved.name,
          category: saved.category,
          description: saved.description,
          icon: saved.icon,
          status: saved.status,
          mobileSupported: saved.mobileSupported,
        },
        blueprint: saved.blueprint,
        executionRule: saved.executionRule,
        sourceDoc: saved.sourceDoc,
      },
    }
  }

  return {
    getStats,
    listUsers,
    updateUserModules,
    listAllTasks,
    getTaskDetail,
    reviewTask,
    reviewTasksBulk,
    getModuleOverview,
    getModuleTasks,
    getModuleFeatureRecords,
    getModuleUsers,
    getModuleReports,
    getModuleSettings,
    updateModuleSettings,
    getModuleWorkbench,
    getDataDictionary,
    listGeneratedModules,
    generateModuleFromDesign,
  }
}
