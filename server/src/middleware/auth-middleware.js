export function createAuthMiddleware({ dataRepository, securityService }) {
  return async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ code: 'AUTH_MISSING_TOKEN', message: '请先登录。' })
      return
    }

    try {
      const token = authHeader.slice(7)
      const payload = securityService.verifyAuthToken(token)
      const user = await dataRepository.findUserById(payload.sub)
      if (!user) {
        res.status(401).json({ code: 'AUTH_USER_NOT_FOUND', message: '登录状态无效，请重新登录。' })
        return
      }
      if (user.tokenState !== 'active') {
        res.status(401).json({ code: 'AUTH_SESSION_REVOKED', message: '账号已退出登录，请重新登录。' })
        return
      }
      if (Number(payload.tv ?? -1) !== Number(user.tokenVersion ?? 0)) {
        res.status(401).json({ code: 'AUTH_TOKEN_VERSION_MISMATCH', message: '登录状态已失效，请重新登录。' })
        return
      }
      req.authUser = user
      next()
    } catch {
      res.status(401).json({ code: 'AUTH_TOKEN_INVALID', message: '登录状态已过期，请重新登录。' })
    }
  }
}
