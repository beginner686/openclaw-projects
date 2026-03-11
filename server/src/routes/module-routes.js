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
