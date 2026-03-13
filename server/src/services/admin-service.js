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

  async function getStats() {
    const [totalUsers, moduleStatsRows] = await Promise.all([
      dataRepository.countUsers(),
      dataRepository.getModuleStats(),
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

  async function listUsers(opts = {}) {
    const { limit = 50, offset = 0, search = '' } = opts
    const [users, total] = await Promise.all([
      dataRepository.listUsers(limit, offset, search),
      dataRepository.countUsers(search),
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

  async function updateUserModules(userId, modules) {
    const validKeys = new Set(moduleCatalog.map((m) => m.moduleKey))
    const safeModules = Array.isArray(modules)
      ? modules.filter((k) => validKeys.has(k))
      : []
    await dataRepository.updateUserEnabledModules(userId, safeModules)
    return { ok: true }
  }

  async function listAllTasks(opts = {}) {
    const { status, moduleKey, limit = 50, page = 1 } = opts
    const offset = (Math.max(1, Number(page)) - 1) * limit
    const [tasks, total] = await Promise.all([
      dataRepository.listAllTasks({ status, moduleKey, limit, offset }),
      dataRepository.countAllTasks({ status, moduleKey }),
    ])
    return { tasks: tasks.map(toAdminTask), total }
  }

  async function reviewTask(taskId, action, operatorId = '', reason = '') {
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

    const task = await dataRepository.findTaskById(taskId)
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

  async function getModuleOverview(moduleKey) {
    const module = moduleCatalog.find((m) => m.moduleKey === moduleKey)
    if (!module) return null

    const [statsRows, users] = await Promise.all([
      dataRepository.getModuleStats(),
      dataRepository.listUsersByModule(moduleKey),
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
    const recentTasks = (await dataRepository.listAllTasks({ moduleKey, limit: 10 })).map(toAdminTask)

    return {
      module,
      stat: { ...stat, successRate },
      activeUsers: users.length,
      recentTasks,
    }
  }

  async function getModuleTasks(moduleKey, opts = {}) {
    return listAllTasks({ ...opts, moduleKey })
  }

  async function getModuleUsers(moduleKey) {
    return dataRepository.listUsersByModule(moduleKey)
  }

  async function getModuleReports(moduleKey) {
    const tasks = await dataRepository.listAllTasks({ moduleKey, status: 'completed', limit: 30 })
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

  async function getModuleSettings(moduleKey) {
    const module = getModuleByKey(moduleKey)
    if (!module) return null

    const defaults = buildDefaultModuleConfig(moduleKey, module)
    const saved = await dataRepository.findModuleSettings(moduleKey)
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

  async function updateModuleSettings(moduleKey, payload, operatorId) {
    const module = getModuleByKey(moduleKey)
    if (!module) return null

    const safeConfig = sanitizeModuleSettings(moduleKey, payload, module)
    const saved = await dataRepository.upsertModuleSettings(moduleKey, safeConfig, operatorId)
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

  return {
    getStats,
    listUsers,
    updateUserModules,
    listAllTasks,
    reviewTask,
    getModuleOverview,
    getModuleTasks,
    getModuleUsers,
    getModuleReports,
    getModuleSettings,
    updateModuleSettings,
  }
}
