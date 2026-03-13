export class AppError extends Error {
  constructor({ status = 500, code = 50000, message = 'internal error', details = null } = {}) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function assertOrThrow(condition, error) {
  if (!condition) {
    throw new AppError(error)
  }
}

