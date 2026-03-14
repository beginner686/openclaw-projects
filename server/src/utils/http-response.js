export function sendSuccess(res, data = {}, message = 'success') {
  res.json({
    code: 0,
    message,
    data,
  })
}

export function sendFailure(res, { status = 500, code = 50000, message = 'internal error', details = null } = {}) {
  res.status(status).json({
    code,
    message,
    data: details,
  })
}

export function asyncRoute(handler) {
  return async function wrappedHandler(req, res, next) {
    try {
      await handler(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}

