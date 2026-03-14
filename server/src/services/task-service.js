import { randomBytes } from 'node:crypto'
import { getMatchedFeatureMenus } from '../config/module-blueprints.js'

export function createTaskService({
  env,
  moduleCatalog,
  getModuleName,
  getModuleRule,
  normalizeModuleKey = (value) => String(value ?? '').trim(),
  moduleLogicService,
  dataRepository,
  reportService,
}) {
  let workerTimer = null
  let cleanupTimer = null

  const inFlightTaskMeta = new Map()
  const retryCounter = new Map()
  const moduleRuntimeCache = new Map()

  const DEFAULT_RUNTIME = {
    execution: {
      mode: 'hybrid',
      maxConcurrency: 3,
      timeoutSeconds: 180,
      retryLimit: 1,
    },
    visibility: {
      allowCustomerView: true,
      allowExport: true,
    },
    rule: {
      focusChecks: [],
      riskSignals: [],
      failSignals: [],
      nextActions: [],
    },
  }
  const MAX_SCENARIO_LENGTH = 60
  const MAX_ATTACHMENTS = 10
  const MAX_INPUT_LENGTH = 6000

  function fail(status, code, message) {
    return { ok: false, status, code, message }
  }

  function hashCode(text) {
    const source = String(text ?? '')
    let value = 0
    for (let i = 0; i < source.length; i += 1) value = (value * 31 + source.charCodeAt(i)) >>> 0
    return value
  }

  function hashInRange(seed, min, max) {
    const lo = Math.min(min, max)
    const hi = Math.max(min, max)
    return lo + (hashCode(seed) % (hi - lo + 1))
  }

  function clampNumber(value, min, max, fallback) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(max, Math.max(min, Math.round(parsed)))
  }

  function normalizeArray(value, fallback = []) {
    if (!Array.isArray(value)) return [...fallback]
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean).slice(0, 100))]
  }

  function includesToken(inputText, tokens) {
    const content = String(inputText ?? '').toLowerCase()
    return tokens.some((token) => content.includes(String(token).toLowerCase()))
  }

  function getModuleExists(moduleKey) {
    return moduleCatalog.some((item) => item.moduleKey === moduleKey)
  }

  function assertModuleAccess(user, moduleKey) {
    if (!getModuleExists(moduleKey)) {
      return fail(404, 'MODULE_NOT_FOUND', 'Module not found.')
    }
    if (!user.enabledModules.includes(moduleKey)) {
      return fail(403, 'MODULE_FORBIDDEN', 'Current account has no access to this module.')
    }
    return { ok: true }
  }

  function buildRuntimeCacheKey(moduleKey, tenantId = 't-platform') {
    return `${tenantId}:${moduleKey}`
  }

  async function getModuleRuntime(moduleKey, tenantId = 't-platform') {
    const now = Date.now()
    const cacheKey = buildRuntimeCacheKey(moduleKey, tenantId)
    const cached = moduleRuntimeCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      return cached.value
    }

    const baseRule = getModuleRule(moduleKey) ?? DEFAULT_RUNTIME.rule
    const defaults = {
      execution: { ...DEFAULT_RUNTIME.execution },
      visibility: { ...DEFAULT_RUNTIME.visibility },
      rule: {
        focusChecks: normalizeArray(baseRule.focusChecks),
        riskSignals: normalizeArray(baseRule.riskSignals),
        failSignals: normalizeArray(baseRule.failSignals),
        nextActions: normalizeArray(baseRule.nextActions),
      },
    }

    let settingsConfig = null
    try {
      const settings = await dataRepository.findModuleSettings(moduleKey, tenantId)
      settingsConfig = settings?.config ?? null
    } catch (error) {
      console.warn('[task-service] failed to load module settings:', moduleKey, error?.message ?? error)
    }

    const execution = {
      mode: ['auto', 'manual', 'hybrid'].includes(settingsConfig?.execution?.mode)
        ? settingsConfig.execution.mode
        : defaults.execution.mode,
      maxConcurrency: clampNumber(
        settingsConfig?.execution?.maxConcurrency,
        1,
        20,
        defaults.execution.maxConcurrency,
      ),
      timeoutSeconds: clampNumber(
        settingsConfig?.execution?.timeoutSeconds,
        30,
        3600,
        defaults.execution.timeoutSeconds,
      ),
      retryLimit: clampNumber(settingsConfig?.execution?.retryLimit, 0, 10, defaults.execution.retryLimit),
    }

    const visibility = {
      allowCustomerView:
        typeof settingsConfig?.visibility?.allowCustomerView === 'boolean'
          ? settingsConfig.visibility.allowCustomerView
          : defaults.visibility.allowCustomerView,
      allowExport:
        typeof settingsConfig?.visibility?.allowExport === 'boolean'
          ? settingsConfig.visibility.allowExport
          : defaults.visibility.allowExport,
    }

    const rule = {
      focusChecks: normalizeArray(settingsConfig?.rule?.focusChecks, defaults.rule.focusChecks),
      riskSignals: normalizeArray(settingsConfig?.rule?.riskSignals, defaults.rule.riskSignals),
      failSignals: normalizeArray(settingsConfig?.rule?.failSignals, defaults.rule.failSignals),
      nextActions: normalizeArray(settingsConfig?.rule?.nextActions, defaults.rule.nextActions),
    }

    const runtime = { execution, visibility, rule }
    moduleRuntimeCache.set(cacheKey, { value: runtime, expiresAt: now + 5000 })
    return runtime
  }

  async function toClientTask(task, viewerId) {
    const runtime = await getModuleRuntime(task.moduleKey, task.tenantId)
    const reportUrl =
      task.reportUrl && runtime.visibility.allowCustomerView && runtime.visibility.allowExport
        ? reportService.buildAuthorizedReportUrl(task, viewerId)
        : ''

    return {
      taskId: task.taskId,
      moduleKey: task.moduleKey,
      status: task.status,
      summary: task.summary,
      updatedAt: task.updatedAt,
      reportUrl,
      errorMessage: task.errorMessage,
    }
  }

  async function shouldFailTask(task, runtimeRule) {
    const dynamicFailSignals = normalizeArray(runtimeRule?.failSignals)
    const failSignals = ['force-fail', 'simulate-fail', 'error', 'fatal', ...dynamicFailSignals]
    return includesToken(task.inputText, failSignals)
  }

  function estimateProcessMs(task) {
    const textFactor = Math.min(2200, Math.max(600, String(task.inputText ?? '').length * 18))
    const fileFactor = Math.min(1200, (Array.isArray(task.attachments) ? task.attachments.length : 0) * 250)
    return 1600 + textFactor + fileFactor
  }

  function buildFeatureDetail(task, feature, moduleResult, featureIndex) {
    const metricCards = Array.isArray(moduleResult?.metricCards)
      ? moduleResult.metricCards.slice(0, 4).map((item) => ({
        key: String(item?.key ?? ''),
        label: String(item?.label ?? ''),
        unit: String(item?.unit ?? ''),
        value: Number.isFinite(Number(item?.value)) ? Number(item.value) : 0,
      }))
      : []

    const findings = normalizeArray(moduleResult?.findings)
    const recommendations = normalizeArray(moduleResult?.recommendations)
    const highlights = findings.slice(0, 3)
    if (!highlights.length && task.summary) highlights.push(String(task.summary))
    if (!highlights.length) highlights.push(`已完成 ${feature.name} 数据处理。`)

    const score = Number.isFinite(Number(moduleResult?.score))
      ? Math.max(0, Math.min(100, Math.round(Number(moduleResult.score))))
      : hashInRange(`${task.taskId}|${feature.key}|score`, 58, 96)

    return {
      headline: `${feature.name} · ${task.scenario}`,
      highlights,
      finding: findings[0] ?? String(task.summary ?? `${feature.name}已完成执行。`),
      recommendation: recommendations[0] ?? '建议继续跟踪该子功能核心指标并定期复盘规则。',
      details: {
        taskId: task.taskId,
        moduleKey: task.moduleKey,
        featureKey: feature.key,
        featureIndex,
        scenario: task.scenario,
        status: task.status,
        score,
        riskLevel: String(moduleResult?.riskLevel ?? 'low'),
        priority: String(moduleResult?.priority ?? 'medium'),
        confidence: hashInRange(`${task.taskId}|${feature.key}|confidence`, 72, 98),
        tags: normalizeArray(moduleResult?.tags).slice(0, 8),
        metricCards,
        reportUrl: task.reportUrl ?? '',
        updatedAt: task.updatedAt,
      },
    }
  }

  function buildFeatureRecords(task, moduleResult) {
    const matchedFeatures = getMatchedFeatureMenus(task.moduleKey, task)
    return matchedFeatures.map((feature, index) => ({
      recordId: `${task.taskId}:${feature.key}`,
      taskId: task.taskId,
      tenantId: task.tenantId,
      ownerId: task.ownerId,
      moduleKey: task.moduleKey,
      featureKey: feature.key,
      featureName: feature.name,
      scenario: task.scenario,
      status: task.status,
      payload: buildFeatureDetail(task, feature, moduleResult, index),
    }))
  }

  async function persistFeatureRecords(task, moduleResult = null) {
    if (!task || task.status !== 'completed') return
    if (typeof dataRepository.upsertFeatureRecord !== 'function') return

    const records = buildFeatureRecords(task, moduleResult)
    if (!records.length) return

    await Promise.all(
      records.map((record) =>
        dataRepository.upsertFeatureRecord(record).catch((error) => {
          console.warn(
            '[task-service] failed to upsert feature record:',
            record.recordId,
            error?.message ?? error,
          )
        }),
      ),
    )
  }

  async function reconcileDatabase() {
    await dataRepository.requeueRunningTasks()
    const completedTasks = await dataRepository.listTasksByStatus('completed', 2000)
    for (const task of completedTasks) {
      const moduleResult = moduleLogicService?.analyzeTask?.(task) ?? null
      const changed = await reportService.ensureTaskReport(task)
      if (changed) {
        await dataRepository.updateTask(task)
      }
      await persistFeatureRecords(task, moduleResult)
    }
  }

  async function finalizeTask(taskId, context = {}) {
    try {
      const task = await dataRepository.findTaskById(taskId)
      if (!task || task.status !== 'running') {
        return
      }

      const runtime = context.runtime ?? (await getModuleRuntime(task.moduleKey, task.tenantId))

      if (context.timedOut) {
        const retries = retryCounter.get(taskId) ?? 0
        if (retries < runtime.execution.retryLimit) {
          retryCounter.set(taskId, retries + 1)
          task.status = 'queued'
          task.summary = `${getModuleName(task.moduleKey)} task timed out, auto retry ${retries + 1}/${runtime.execution.retryLimit}.`
          task.errorMessage = undefined
          task.updatedAt = new Date().toISOString()
          await dataRepository.updateTask(task)
          return
        }

        task.status = 'failed'
        task.summary = `${getModuleName(task.moduleKey)} task failed because processing exceeded timeout.`
        task.errorMessage = `Timeout exceeded: ${runtime.execution.timeoutSeconds}s`
        task.reportUrl = ''
        task.updatedAt = new Date().toISOString()
        await dataRepository.updateTask(task)
        return
      }

      if (await shouldFailTask(task, runtime.rule)) {
        const retries = retryCounter.get(taskId) ?? 0
        if (retries < runtime.execution.retryLimit) {
          retryCounter.set(taskId, retries + 1)
          task.status = 'queued'
          task.summary = `${getModuleName(task.moduleKey)} task failed signal detected, auto retry ${retries + 1}/${runtime.execution.retryLimit}.`
          task.errorMessage = undefined
          task.updatedAt = new Date().toISOString()
          await dataRepository.updateTask(task)
          return
        }

        task.status = 'failed'
        task.summary = `${getModuleName(task.moduleKey)} task failed because fail-signal rule was triggered.`
        task.errorMessage = 'Execution engine detected fail signals from module rules.'
        task.reportUrl = ''
        task.updatedAt = new Date().toISOString()
        await dataRepository.updateTask(task)
        return
      }

      const moduleResult = moduleLogicService?.analyzeTask?.(task) ?? null
      task.status = 'completed'
      task.updatedAt = new Date().toISOString()
      task.errorMessage = undefined
      if (moduleResult?.summary) {
        task.summary = moduleResult.summary
      }
      await reportService.ensureTaskReport(task)
      await dataRepository.updateTask(task)
      await persistFeatureRecords(task, moduleResult)
      retryCounter.delete(taskId)
    } finally {
      inFlightTaskMeta.delete(taskId)
    }
  }

  async function getExcludedModulesByConcurrency() {
    if (inFlightTaskMeta.size === 0) return []

    const countMap = new Map()
    for (const meta of inFlightTaskMeta.values()) {
      countMap.set(meta.moduleKey, (countMap.get(meta.moduleKey) ?? 0) + 1)
    }

    const moduleKeys = [...countMap.keys()]
    const runtimes = await Promise.all(moduleKeys.map((key) => getModuleRuntime(key)))
    const excluded = []

    moduleKeys.forEach((key, idx) => {
      const running = countMap.get(key) ?? 0
      const max = runtimes[idx]?.execution?.maxConcurrency ?? DEFAULT_RUNTIME.execution.maxConcurrency
      if (running >= max) excluded.push(key)
    })

    return excluded
  }

  async function pickAndRunTask() {
    if (inFlightTaskMeta.size >= env.maxConcurrency) {
      return
    }

    const excludedModules = await getExcludedModulesByConcurrency()
    const queuedTask = await dataRepository.claimNextQueuedTask(excludedModules)
    if (!queuedTask) {
      return
    }

    const runtime = await getModuleRuntime(queuedTask.moduleKey, queuedTask.tenantId)
    const estimateMs = estimateProcessMs(queuedTask)
    const timeoutMs = runtime.execution.timeoutSeconds * 1000
    const timedOut = estimateMs > timeoutMs
    const delay = timedOut ? timeoutMs : estimateMs

    inFlightTaskMeta.set(queuedTask.taskId, {
      moduleKey: queuedTask.moduleKey,
      startedAt: Date.now(),
    })

    setTimeout(() => {
      void finalizeTask(queuedTask.taskId, { runtime, timedOut })
    }, delay)
  }

  async function cleanupOldTasks() {
    try {
      await dataRepository.trimTasks(env.maxTaskRows)
    } catch (error) {
      console.error('[task-cleanup-error]', error)
    }
  }

  function startWorker() {
    if (workerTimer) {
      return
    }
    workerTimer = setInterval(() => {
      void pickAndRunTask()
    }, env.workerPollMs)

    if (!cleanupTimer) {
      cleanupTimer = setInterval(() => {
        void cleanupOldTasks()
      }, env.cleanupIntervalMs)
    }
  }

  function stopWorker() {
    if (workerTimer) {
      clearInterval(workerTimer)
      workerTimer = null
    }
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
  }

  async function createTask(user, moduleKey, payload) {
    const normalizedModuleKey = normalizeModuleKey(moduleKey)
    const access = assertModuleAccess(user, normalizedModuleKey)
    if (!access.ok) {
      return { error: access }
    }

    const validation = moduleLogicService?.validateTaskInput?.(normalizedModuleKey, payload) ?? {
      ok: true,
      errors: [],
      warnings: [],
      data: {
        scenario: String(payload?.scenario ?? '').trim(),
        inputText: String(payload?.inputText ?? '').trim(),
        attachments: Array.isArray(payload?.attachments)
          ? payload.attachments.map((item) => String(item))
          : [],
      },
    }

    if (!validation.ok) {
      return {
        error: fail(
          400,
          'TASK_INVALID_PAYLOAD',
          validation.errors?.join(' ') || 'Task payload is invalid.',
        ),
      }
    }

    const scenario = validation.data.scenario
    const inputText = validation.data.inputText
    const attachments = validation.data.attachments
    if (scenario.length > MAX_SCENARIO_LENGTH) {
      return { error: fail(400, 'TASK_SCENARIO_TOO_LONG', `Scenario must be ${MAX_SCENARIO_LENGTH} chars or fewer.`) }
    }
    if (attachments.length > MAX_ATTACHMENTS) {
      return { error: fail(400, 'TASK_ATTACHMENTS_TOO_MANY', `Attachments cannot exceed ${MAX_ATTACHMENTS} files.`) }
    }
    if (inputText.length > MAX_INPUT_LENGTH) {
      return { error: fail(400, 'TASK_INPUT_TOO_LONG', `Input text must be ${MAX_INPUT_LENGTH} chars or fewer.`) }
    }

    const runtime = await getModuleRuntime(normalizedModuleKey, user.tenantId)
    const mode = runtime.execution.mode
    const hasRiskSignal = includesToken(inputText, runtime.rule.riskSignals)

    let status = 'queued'
    let summary = `Task queued and waiting for execution (scenario: ${scenario}).`
    if (validation.warnings?.length) {
      summary += ` Validation warnings: ${validation.warnings.join(' ')}`
    }

    if (mode === 'manual') {
      status = 'review'
      summary = `Task created in manual mode and waiting for admin review (scenario: ${scenario}).`
    } else if (mode === 'hybrid' && hasRiskSignal) {
      status = 'review'
      summary = `Task paused for review because risk signals were detected in hybrid mode (scenario: ${scenario}).`
    }

    const task = {
      taskId: `${moduleKey}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
      tenantId: user.tenantId ?? 't-platform',
      ownerId: user.id,
      moduleKey: normalizedModuleKey,
      scenario,
      inputText,
      attachments,
      status,
      summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reportUrl: '',
      reportFormat: 'html',
      errorMessage: undefined,
    }
    await dataRepository.createTask(task)

    return { data: await toClientTask(task, user.id) }
  }

  async function getTask(user, moduleKey, taskId) {
    const normalizedModuleKey = normalizeModuleKey(moduleKey)
    const access = assertModuleAccess(user, normalizedModuleKey)
    if (!access.ok) {
      return { error: access }
    }

    const task = await dataRepository.findTaskByIdForUser(user.id, normalizedModuleKey, taskId, user.tenantId)
    if (!task) {
      return { error: fail(404, 'TASK_NOT_FOUND', 'Task not found.') }
    }
    return { data: await toClientTask(task, user.id) }
  }

  async function getHistory(user, moduleKey) {
    const normalizedModuleKey = normalizeModuleKey(moduleKey)
    const access = assertModuleAccess(user, normalizedModuleKey)
    if (!access.ok) {
      return { error: access }
    }

    const rows = await dataRepository.listTasksByUserAndModule(user.id, normalizedModuleKey, 12, user.tenantId)
    const history = await Promise.all(rows.map((task) => toClientTask(task, user.id)))
    return { data: history }
  }

  async function getEnabledModules(user) {
    const enabled = new Set(user.enabledModules)
    return moduleCatalog.filter((item) => enabled.has(item.moduleKey))
  }

  function getModuleSchema(moduleKey) {
    const normalizedModuleKey = normalizeModuleKey(moduleKey)
    if (!getModuleExists(normalizedModuleKey)) {
      return null
    }
    return moduleLogicService?.getSchema?.(normalizedModuleKey) ?? null
  }

  async function canUserAccessTaskReport(task, requesterUserId) {
    if (!task || task.ownerId !== requesterUserId) {
      return fail(403, 'REPORT_FORBIDDEN', 'No permission to access this report.')
    }
    const runtime = await getModuleRuntime(task.moduleKey, task.tenantId)
    if (!runtime.visibility.allowExport || !runtime.visibility.allowCustomerView) {
      return fail(403, 'REPORT_FORBIDDEN', 'Report export for this module is disabled.')
    }
    return { ok: true }
  }

  async function findTaskByReportFile(fileName) {
    return dataRepository.findTaskByReportFile(fileName)
  }

  return {
    startWorker,
    stopWorker,
    reconcileDatabase,
    createTask,
    getTask,
    getHistory,
    getEnabledModules,
    getModuleSchema,
    findTaskByReportFile,
    toClientTask,
    canUserAccessTaskReport,
    getQueueState: () => ({
      inFlight: inFlightTaskMeta.size,
      maxConcurrency: env.maxConcurrency,
    }),
  }
}

