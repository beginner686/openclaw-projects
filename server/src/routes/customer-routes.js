import { Router } from 'express'

export function createCustomerRoutes({ authMiddleware, dashboardService }) {
  const router = Router()

  router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
      const data = await dashboardService.buildForUser(req.authUser)
      res.json(data)
    } catch {
      res.status(500).json({ code: 'CUSTOMER_DASHBOARD_FAILED', message: '客户中心数据加载失败。' })
    }
  })

  return router
}
