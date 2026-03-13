import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export function createSecurityService({ env }) {
  function toPepperedPassword(rawPassword) {
    return `${rawPassword}:${env.passwordPepper}`
  }

  function hashPassword(rawPassword, salt) {
    return createHash('sha256').update(`${rawPassword}:${salt}:${env.passwordPepper}`).digest('hex')
  }

  function hashPasswordBcrypt(rawPassword) {
    return bcrypt.hashSync(toPepperedPassword(rawPassword), 12)
  }

  function verifyPassword(rawPassword, storedUser) {
    if ((storedUser.passwordAlgo ?? 'sha256') === 'sha256') {
      return hashPassword(rawPassword, storedUser.passwordSalt) === storedUser.passwordHash
    }
    return bcrypt.compareSync(toPepperedPassword(rawPassword), storedUser.passwordHash)
  }

  function createStoredUser({ id, name, contact, password, enabledModules, role = 'customer', tenantId = '' }) {
    const salt = randomBytes(16).toString('hex')
    return {
      id,
      tenantId: String(tenantId || `t-${id}`).slice(0, 64),
      name,
      contact: contact.toLowerCase(),
      passwordSalt: salt,
      passwordHash: hashPasswordBcrypt(password),
      passwordAlgo: 'bcrypt',
      enabledModules,
      role,
      tokenState: 'active',
      tokenVersion: 0,
    }
  }

  function signAuthToken({ userId, role, remember, tokenVersion }) {
    return jwt.sign({ sub: userId, role, tv: tokenVersion }, env.jwtSecret, {
      issuer: env.jwtIssuer,
      expiresIn: remember ? '30d' : '12h',
    })
  }

  function verifyAuthToken(token) {
    return jwt.verify(token, env.jwtSecret, { issuer: env.jwtIssuer })
  }

  function signReportAccessToken({ ownerId, taskId }) {
    return jwt.sign({ sub: ownerId, taskId, scope: 'report' }, env.reportSecret, {
      issuer: env.jwtIssuer,
      expiresIn: env.reportAccessTtlSec,
    })
  }

  function verifyReportAccessToken(token) {
    return jwt.verify(token, env.reportSecret, { issuer: env.jwtIssuer })
  }

  function createUserId() {
    return `u-${randomBytes(4).toString('hex')}`
  }

  return {
    hashPassword,
    verifyPassword,
    createStoredUser,
    createUserId,
    signAuthToken,
    verifyAuthToken,
    signReportAccessToken,
    verifyReportAccessToken,
  }
}
