import { Router } from 'express'

export function createAntiFraudRoutes({ authMiddleware, antiFraudService }) {
  const router = Router()

  router.get('/plans', authMiddleware, async (_req, res) => {
    const result = await antiFraudService.listPlans()
    res.json(result.data)
  })

  router.get('/subscription', authMiddleware, async (req, res) => {
    const result = await antiFraudService.getMySubscription(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/subscription/activate', authMiddleware, async (req, res) => {
    const result = await antiFraudService.activateSubscription(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/dashboard', authMiddleware, async (req, res) => {
    const result = await antiFraudService.getDashboard(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/targets', authMiddleware, async (req, res) => {
    const result = await antiFraudService.listTargets(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/targets', authMiddleware, async (req, res) => {
    const result = await antiFraudService.createTarget(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.put('/targets/:targetId', authMiddleware, async (req, res) => {
    const result = await antiFraudService.updateTarget(req.authUser, String(req.params.targetId), req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.delete('/targets/:targetId', authMiddleware, async (req, res) => {
    const result = await antiFraudService.removeTarget(req.authUser, String(req.params.targetId))
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/scans', authMiddleware, async (req, res) => {
    const result = await antiFraudService.listScans(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/scans', authMiddleware, async (req, res) => {
    const result = await antiFraudService.runScan(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.get('/evidences', authMiddleware, async (req, res) => {
    const result = await antiFraudService.listEvidences(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/evidences/:evidenceId', authMiddleware, async (req, res) => {
    const result = await antiFraudService.getEvidence(req.authUser, String(req.params.evidenceId))
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/reports', authMiddleware, async (req, res) => {
    const result = await antiFraudService.listReports(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/reports/generate', authMiddleware, async (req, res) => {
    const result = await antiFraudService.generateReport(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  router.get('/complaints', authMiddleware, async (req, res) => {
    const result = await antiFraudService.listComplaints(req.authUser)
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.get('/complaints/:complaintId', authMiddleware, async (req, res) => {
    const result = await antiFraudService.getComplaint(req.authUser, String(req.params.complaintId))
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json(result.data)
  })

  router.post('/complaints', authMiddleware, async (req, res) => {
    const result = await antiFraudService.createComplaint(req.authUser, req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json(result.data)
  })

  return router
}
