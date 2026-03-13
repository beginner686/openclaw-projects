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
  const inFlightTaskIds = new Set()

  function fail(status, code, message) {
    return { ok: false, status, code, message }
  }

  function assertModuleAccess(user, moduleKey) {
    const normalizedModuleKey = normalizeModuleKey(moduleKey)
    if (!moduleCatalog.some((item) => item.moduleKey === normalizedModuleKey)) {
      return fail(404, 'MODULE_NOT_FOUND', '业务模块不存在。')
    }
    if (!user.enabledModules.includes(normalizedModuleKey)) {
      return fail(403, 'MODULE_FORBIDDEN', '当前账号未开通该业务。')
    }
    return { ok: true, moduleKey: normalizedModuleKey }
  }

  function toClientTask(task, viewerId) {
    return {
      taskId: task.taskId,
      moduleKey: task.moduleKey,
      status: task.status,
      summary: task.summary,
      updatedAt: task.updatedAt,
      reportUrl: reportService.buildAuthorizedReportUrl(task, viewerId),
      errorMessage: task.errorMessage,
    }
  }

  function shouldFailTask(task) {
    const rule = getModuleRule(task.moduleKey)
    const failSignals = ['force-fail', '强制失败', '模拟失败', 'error', 'fatal', ...rule.failSignals]
    return failSignals.some((token) => task.inputText.toLowerCase().includes(token.toLowerCase()))
  }

  function estimateProcessMs(task) {
    const textFactor = Math.min(2200, Math.max(600, task.inputText.length * 18))
    const fileFactor = Math.min(1200, task.attachments.length * 250)
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

  async function finalizeTask(taskId) {
    try {
      const task = await dataRepository.findTaskById(taskId)
      if (!task || task.status !== 'running') {
        return
      }

      if (shouldFailTask(task)) {
        task.status = 'failed'
        task.summary = `${getModuleName(task.moduleKey)}任务执行失败：触发了异常关键词，请修正输入后重试。`
        task.errorMessage = '处理引擎检测到高风险异常信号，已中断执行。'
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
    } finally {
      inFlightTaskIds.delete(taskId)
    }
  }

  async function pickAndRunTask() {
    if (inFlightTaskIds.size >= env.maxConcurrency) {
      return
    }

    const queuedTask = await dataRepository.claimNextQueuedTask()
    if (!queuedTask) {
      return
    }

    inFlightTaskIds.add(queuedTask.taskId)
    setTimeout(() => {
      void finalizeTask(queuedTask.taskId)
    }, estimateProcessMs(queuedTask))
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

    const task = {
      taskId: `${normalizedModuleKey}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`,
      ownerId: user.id,
      moduleKey: normalizedModuleKey,
      scenario,
      inputText,
      attachments,
      status: 'queued',
      summary: `任务已入队，等待执行（场景：${scenario}）。`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reportUrl: '',
      reportFormat: 'html',
      errorMessage: undefined,
    }
    await dataRepository.createTask(task)

    return { data: toClientTask(task, user.id) }
  }

  async function getTask(user, moduleKey, taskId) {
    const access = assertModuleAccess(user, moduleKey)
    if (!access.ok) {
      return { error: access }
    }
    const normalizedModuleKey = access.moduleKey

    const task = await dataRepository.findTaskByIdForUser(user.id, normalizedModuleKey, taskId)
    if (!task) {
      return { error: fail(404, 'TASK_NOT_FOUND', '任务不存在。') }
    }
    return { data: toClientTask(task, user.id) }
  }

  async function getHistory(user, moduleKey) {
    const access = assertModuleAccess(user, moduleKey)
    if (!access.ok) {
      return { error: access }
    }
    const normalizedModuleKey = access.moduleKey

    const history = (await dataRepository.listTasksByUserAndModule(user.id, normalizedModuleKey, 12)).map((task) =>
      toClientTask(task, user.id),
    )
    return { data: history }
  }

  async function getEnabledModules(user) {
    const enabled = new Set(user.enabledModules)
    return moduleCatalog.filter((item) => enabled.has(item.moduleKey))
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
    getQueueState: () => ({
      inFlight: inFlightTaskIds.size,
      maxConcurrency: env.maxConcurrency,
    }),
  }
}
