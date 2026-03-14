import { Router } from 'express'

export function createModuleRoutes({ authMiddleware, taskService }) {
  const router = Router()

  router.get('/', authMiddleware, async (req, res) => {
    const modules = await taskService.getEnabledModules(req.authUser)
    res.json(modules)
  })

  router.get('/:moduleKey/history', authMiddleware, async (req, res) => {
    const result = await taskService.getHistory(req.authUser, String(req.params.moduleKey))
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/:moduleKey/schema', authMiddleware, async (req, res) => {
    const moduleKey = String(req.params.moduleKey)
    const modules = await taskService.getEnabledModules(req.authUser)
    const hasAccess = modules.some((item) => item.moduleKey === moduleKey)
    if (!hasAccess) {
      res.status(403).json({ code: 'MODULE_FORBIDDEN', message: 'Current account has no access to this module.' })
      return
    }
    const schema = taskService.getModuleSchema(moduleKey)
    if (!schema) {
      res.status(404).json({ code: 'MODULE_NOT_FOUND', message: 'Module not found.' })
      return
    }
    res.json(schema)
  })

  router.get('/:moduleKey/tasks/:taskId', authMiddleware, async (req, res) => {
    const result = await taskService.getTask(req.authUser, String(req.params.moduleKey), String(req.params.taskId))
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/:moduleKey/tasks', authMiddleware, async (req, res) => {
    const result = await taskService.createTask(req.authUser, String(req.params.moduleKey), req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  return router
}
