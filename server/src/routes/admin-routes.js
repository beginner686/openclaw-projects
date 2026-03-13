import { Router } from 'express'

export function createAdminRoutes({ authMiddleware, requireAdmin, adminService }) {
  const router = Router()

  router.use(authMiddleware, requireAdmin)

  router.get('/stats', async (_req, res) => {
    const data = await adminService.getStats()
    res.json(data)
  })

  router.get('/users', async (req, res) => {
    const limit = Math.min(100, Number(req.query.limit ?? 50))
    const page = Math.max(1, Number(req.query.page ?? 1))
    const offset = (page - 1) * limit
    const search = String(req.query.search ?? '')
    const data = await adminService.listUsers({ limit, offset, search })
    res.json(data)
  })

  router.put('/users/:id/modules', async (req, res) => {
    const { id } = req.params
    const { modules } = req.body ?? {}
    if (!Array.isArray(modules)) {
      res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'modules must be an array.' })
      return
    }
    const result = await adminService.updateUserModules(id, modules)
    res.json(result)
  })

  router.get('/tasks', async (req, res) => {
    const limit = Math.min(100, Number(req.query.limit ?? 50))
    const page = Math.max(1, Number(req.query.page ?? 1))
    const status = req.query.status ? String(req.query.status) : undefined
    const moduleKey = req.query.moduleKey ? String(req.query.moduleKey) : undefined
    const data = await adminService.listAllTasks({ status, moduleKey, limit, page })
    res.json(data)
  })

  router.post('/tasks/:taskId/review', async (req, res) => {
    const { action, reason } = req.body ?? {}
    const result = await adminService.reviewTask(
      String(req.params.taskId ?? ''),
      action,
      req.authUser?.id ?? '',
      reason,
    )
    if (result.error) {
      res.status(result.error.status).json({
        code: result.error.code,
        message: result.error.message,
      })
      return
    }
    res.json(result.data)
  })

  router.get('/module/:moduleKey/overview', async (req, res) => {
    const data = await adminService.getModuleOverview(req.params.moduleKey)
    if (!data) {
      res.status(404).json({ code: 'MODULE_NOT_FOUND', message: 'Module not found.' })
      return
    }
    res.json(data)
  })

  router.get('/module/:moduleKey/tasks', async (req, res) => {
    const limit = Math.min(100, Number(req.query.limit ?? 50))
    const page = Math.max(1, Number(req.query.page ?? 1))
    const status = req.query.status ? String(req.query.status) : undefined
    const data = await adminService.getModuleTasks(req.params.moduleKey, { status, limit, page })
    res.json(data)
  })

  router.get('/module/:moduleKey/users', async (req, res) => {
    const data = await adminService.getModuleUsers(req.params.moduleKey)
    res.json(data)
  })

  router.get('/module/:moduleKey/reports', async (req, res) => {
    const data = await adminService.getModuleReports(req.params.moduleKey)
    res.json(data)
  })

  router.get('/module/:moduleKey/settings', async (req, res) => {
    const data = await adminService.getModuleSettings(req.params.moduleKey)
    if (!data) {
      res.status(404).json({ code: 'MODULE_NOT_FOUND', message: 'Module not found.' })
      return
    }
    res.json(data)
  })

  router.put('/module/:moduleKey/settings', async (req, res) => {
    const body = req.body ?? {}
    const configPayload = body.config ?? body
    if (!configPayload || typeof configPayload !== 'object' || Array.isArray(configPayload)) {
      res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'config must be an object.' })
      return
    }

    const data = await adminService.updateModuleSettings(
      req.params.moduleKey,
      configPayload,
      req.authUser?.id ?? '',
    )
    if (!data) {
      res.status(404).json({ code: 'MODULE_NOT_FOUND', message: 'Module not found.' })
      return
    }
    res.json(data)
  })

  return router
}
