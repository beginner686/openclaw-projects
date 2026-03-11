import { Router } from 'express'

export function createAuthRoutes({ authService, authMiddleware }) {
  const router = Router()

  router.post('/login', async (req, res) => {
    const result = await authService.login(req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.json({ token: result.token, user: result.user })
  })

  router.post('/register', async (req, res) => {
    const result = await authService.register(req.body ?? {})
    if (result.error) {
      res.status(result.error.status).json({ code: result.error.code, message: result.error.message })
      return
    }
    res.status(201).json({ token: result.token, user: result.user })
  })

  router.post('/logout', authMiddleware, async (req, res) => {
    await authService.logout(req.authUser.id)
    res.json({ message: '已退出登录。' })
  })

  router.get('/profile', authMiddleware, (req, res) => {
    res.json(authService.toAuthUser(req.authUser))
  })

  return router
}
