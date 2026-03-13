import { Router } from 'express'

export function createGroceryRoutes({ authMiddleware, groceryService }) {
  const router = Router()

  router.get('/dashboard', authMiddleware, async (req, res) => {
    const result = await groceryService.getDashboard(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/preference', authMiddleware, async (req, res) => {
    const data = await groceryService.getPreference(req.authUser.id)
    res.json(data)
  })

  router.post('/preference', authMiddleware, async (req, res) => {
    const result = await groceryService.savePreference(req.authUser.id, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/price-compare', authMiddleware, async (req, res) => {
    const result = await groceryService.comparePrices(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/recommend-today', authMiddleware, async (req, res) => {
    const result = await groceryService.recommendToday(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/weekly-menu', authMiddleware, async (req, res) => {
    const result = await groceryService.buildWeeklyMenu(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/deals', authMiddleware, async (_req, res) => {
    const result = await groceryService.listDeals()
    res.json(result.data)
  })

  router.post('/freshness-check', authMiddleware, async (req, res) => {
    const result = await groceryService.checkFreshness(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.get('/freshness-checks', authMiddleware, async (req, res) => {
    const result = await groceryService.listFreshnessChecks(req.authUser)
    res.json(result.data)
  })

  router.post('/budget-plan', authMiddleware, async (req, res) => {
    const result = await groceryService.buildBudgetPlan(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  return router
}
