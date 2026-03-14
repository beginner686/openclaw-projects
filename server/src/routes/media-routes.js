import { Router } from 'express'

export function createMediaRoutes({ authMiddleware, mediaService }) {
  const router = Router()

  router.get('/dashboard', authMiddleware, async (req, res) => {
    const result = await mediaService.getDashboard(req.authUser, req.query ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/projects', authMiddleware, async (req, res) => {
    const result = await mediaService.listProjects(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/projects', authMiddleware, async (req, res) => {
    const result = await mediaService.createProject(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.get('/topics', authMiddleware, async (req, res) => {
    const result = await mediaService.listTopics(req.authUser, req.query ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/topics/generate', authMiddleware, async (req, res) => {
    const result = await mediaService.generateTopics(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.get('/contents', authMiddleware, async (req, res) => {
    const result = await mediaService.listContents(req.authUser, req.query ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/contents/generate', authMiddleware, async (req, res) => {
    const result = await mediaService.generateContent(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.post('/contents/rewrite', authMiddleware, async (req, res) => {
    const result = await mediaService.rewriteContent(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.get('/products', authMiddleware, async (req, res) => {
    const result = await mediaService.listProducts(req.authUser, req.query ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/products', authMiddleware, async (req, res) => {
    const result = await mediaService.createProduct(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.put('/products/:productId', authMiddleware, async (req, res) => {
    const result = await mediaService.updateProduct(req.authUser, req.params.productId, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.delete('/products/:productId', authMiddleware, async (req, res) => {
    const result = await mediaService.removeProduct(req.authUser, req.params.productId)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/products/score', authMiddleware, async (req, res) => {
    const result = await mediaService.scoreProducts(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/schedules', authMiddleware, async (req, res) => {
    const result = await mediaService.listSchedules(req.authUser, req.query ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/schedules/generate', authMiddleware, async (req, res) => {
    const result = await mediaService.generateSchedules(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.put('/schedules/:scheduleId', authMiddleware, async (req, res) => {
    const result = await mediaService.updateSchedule(req.authUser, req.params.scheduleId, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  return router
}
