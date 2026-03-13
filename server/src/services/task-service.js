import { randomBytes } from 'node:crypto'

export function createTaskService({
  env,
  moduleCatalog,
  getModuleName,
  getModuleRule,
  normalizeModuleKey,
  dataRepository,
  reportService,
}) {
  const MAX_SCENARIO_LENGTH = 60
  const MAX_INPUT_LENGTH = 6000
  const MAX_ATTACHMENTS = 10
  const MAX_ATTACHMENT_NAME_LENGTH = 200

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

  function fail(status, code, message) {
    return { ok: false, status, code, message }
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
    const normalizedModuleKey = normalizeModuleKey(moduleKey)
    if (!getModuleExists(normalizedModuleKey)) {
      return fail(404, 'MODULE_NOT_FOUND', '业务模块不存在。')
    }
    if (!user.enabledModules.includes(normalizedModuleKey)) {
      return fail(403, 'MODULE_FORBIDDEN', '当前账号未开通该业务。')
    }
    return { ok: true, moduleKey: normalizedModuleKey }
  }

  async function getModuleRuntime(moduleKey) {
    const now = Date.now()
    const cached = moduleRuntimeCache.get(moduleKey)
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
      const settings = await dataRepository.findModuleSettings(moduleKey)
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
    moduleRuntimeCache.set(moduleKey, { value: runtime, expiresAt: now + 5000 })
    return runtime
  }

  async function toClientTask(task, viewerId) {
    const runtime = await getModuleRuntime(task.moduleKey)
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

  async function reconcileDatabase() {
    await dataRepository.requeueRunningTasks()
    const completedTasks = await dataRepository.listTasksByStatus('completed', 2000)
    for (const task of completedTasks) {
      const changed = await reportService.ensureTaskReport(task)
      if (changed) {
        await dataRepository.updateTask(task)
      }
    }
  }

  async function finalizeTask(taskId, context = {}) {
    try {
      const task = await dataRepository.findTaskById(taskId)
      if (!task || task.status !== 'running') {
        return
      }

      const runtime = context.runtime ?? (await getModuleRuntime(task.moduleKey))

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

      task.status = 'completed'
      task.updatedAt = new Date().toISOString()
      task.errorMessage = undefined
      await reportService.ensureTaskReport(task)
      await dataRepository.updateTask(task)
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

    const runtime = await getModuleRuntime(queuedTask.moduleKey)
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
    const access = assertModuleAccess(user, moduleKey)
    if (!access.ok) {
      return { error: access }
    }
    const normalizedModuleKey = access.moduleKey

    const scenario = String(payload?.scenario ?? '').trim()
    const inputText = String(payload?.inputText ?? '').trim()
    const attachments = Array.isArray(payload?.attachments)
      ? payload.attachments.map((item) => String(item).trim().slice(0, MAX_ATTACHMENT_NAME_LENGTH)).filter(Boolean)
      : []

    if (!scenario || !inputText) {
      return { error: fail(400, 'TASK_INVALID_PAYLOAD', '请填写任务场景和输入内容。') }
    }
    if (scenario.length > MAX_SCENARIO_LENGTH) {
      return { error: fail(400, 'TASK_SCENARIO_TOO_LONG', `任务场景长度不能超过 ${MAX_SCENARIO_LENGTH} 字符。`) }
    }
    if (inputText.length > MAX_INPUT_LENGTH) {
      return { error: fail(400, 'TASK_INPUT_TOO_LONG', `任务输入内容不能超过 ${MAX_INPUT_LENGTH} 字符。`) }
    }
    if (attachments.length > MAX_ATTACHMENTS) {
      return { error: fail(400, 'TASK_ATTACHMENTS_TOO_MANY', `附件数量不能超过 ${MAX_ATTACHMENTS} 个。`) }
    }

    const runtime = await getModuleRuntime(normalizedModuleKey)
    const mode = runtime.execution.mode
    const hasRiskSignal = includesToken(inputText, runtime.rule.riskSignals)

    let status = 'queued'
    let summary = `Task queued and waiting for execution (scenario: ${scenario}).`

    if (mode === 'manual') {
      status = 'review'
      summary = `Task created in manual mode and waiting for admin review (scenario: ${scenario}).`
    } else if (mode === 'hybrid' && hasRiskSignal) {
      status = 'review'
      summary = `Task paused for review because risk signals were detected in hybrid mode (scenario: ${scenario}).`
    }

    const task = {
      taskId: `${normalizedModuleKey}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
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
    const access = assertModuleAccess(user, moduleKey)
    if (!access.ok) {
      return { error: access }
    }
    const normalizedModuleKey = access.moduleKey

    const task = await dataRepository.findTaskByIdForUser(user.id, normalizedModuleKey, taskId)
    if (!task) {
      return { error: fail(404, 'TASK_NOT_FOUND', 'Task not found.') }
    }
    return { data: await toClientTask(task, user.id) }
  }

  async function getHistory(user, moduleKey) {
    const access = assertModuleAccess(user, moduleKey)
    if (!access.ok) {
      return { error: access }
    }
    const normalizedModuleKey = access.moduleKey

    const rows = await dataRepository.listTasksByUserAndModule(user.id, normalizedModuleKey, 12)
    const history = await Promise.all(rows.map((task) => toClientTask(task, user.id)))
    return { data: history }
  }

  async function getEnabledModules(user) {
    const enabled = new Set(user.enabledModules)
    return moduleCatalog.filter((item) => enabled.has(item.moduleKey))
  }

  async function canUserAccessTaskReport(task, requesterUserId) {
    if (!task || task.ownerId !== requesterUserId) {
      return fail(403, 'REPORT_FORBIDDEN', 'No permission to access this report.')
    }
    const runtime = await getModuleRuntime(task.moduleKey)
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
    findTaskByReportFile,
    toClientTask,
    canUserAccessTaskReport,
    getQueueState: () => ({
      inFlight: inFlightTaskMeta.size,
      maxConcurrency: env.maxConcurrency,
    }),
  }
}
