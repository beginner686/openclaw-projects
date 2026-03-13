import { sendFailure } from '../utils/http-response.js'

export function createV1AuthMiddleware({ platformRepository, securityService }) {
  return async function v1AuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      sendFailure(res, { status: 401, code: 40110, message: 'missing bearer token' })
      return
    }

    try {
      const token = authHeader.slice(7)
      const payload = securityService.verifyAuthToken(token)
      const user = await platformRepository.findUserById(payload.sub)
      if (!user) {
        sendFailure(res, { status: 401, code: 40111, message: 'user not found' })
        return
      }
      if (user.status !== 'active') {
        sendFailure(res, { status: 403, code: 40314, message: 'user is disabled' })
        return
      }
      if (user.tokenState !== 'active') {
        sendFailure(res, { status: 401, code: 40112, message: 'session expired' })
        return
      }
      if (Number(payload.tv ?? -1) !== Number(user.tokenVersion ?? 0)) {
        sendFailure(res, { status: 401, code: 40113, message: 'token version mismatch' })
        return
      }
      const roleCodes = await platformRepository.getUserRoleCodes(user.id, user.tenantId)
      req.authUser = {
        ...user,
        roleCodes,
      }
      next()
    } catch {
      sendFailure(res, { status: 401, code: 40114, message: 'invalid token' })
    }
  }
}

