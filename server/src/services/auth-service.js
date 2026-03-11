export function createAuthService({ dataRepository, securityService, moduleCatalog }) {
  function fail(status, code, message) {
    return { error: { status, code, message } }
  }

  function toAuthUser(storedUser) {
    return {
      id: storedUser.id,
      name: storedUser.name,
      contact: storedUser.contact,
      enabledModules: storedUser.enabledModules,
      role: storedUser.role,
      tokenState: storedUser.tokenState,
    }
  }

  async function login({ account, password, remember }) {
    const normalized = String(account ?? '').trim().toLowerCase()
    const safePassword = String(password ?? '')
    if (!normalized || !safePassword) {
      return fail(400, 'AUTH_MISSING_CREDENTIALS', '账号和密码不能为空。')
    }

    const user = await dataRepository.findUserByContact(normalized)
    if (!user) {
      return fail(401, 'AUTH_INVALID_CREDENTIALS', '账号或密码错误。')
    }

    const verified = securityService.verifyPassword(safePassword, user)
    if (!verified) {
      return fail(401, 'AUTH_INVALID_CREDENTIALS', '账号或密码错误。')
    }

    if (user.tokenState !== 'active') {
      await dataRepository.setUserTokenState(user.id, 'active')
      user.tokenState = 'active'
    }

    const token = securityService.signAuthToken({
      userId: user.id,
      role: user.role,
      remember: Boolean(remember),
      tokenVersion: Number(user.tokenVersion ?? 0),
    })
    return { token, user: toAuthUser(user) }
  }

  async function register({ name, contact, password }) {
    const safeName = String(name ?? '').trim()
    const safeContact = String(contact ?? '').trim().toLowerCase()
    const safePassword = String(password ?? '')
    if (!safeName || !safeContact || !safePassword) {
      return fail(400, 'AUTH_REGISTER_INVALID_PAYLOAD', '注册信息不完整。')
    }
    if (safePassword.length < 6) {
      return fail(400, 'AUTH_PASSWORD_TOO_SHORT', '密码至少需要 6 位。')
    }

    if (await dataRepository.contactExists(safeContact)) {
      return fail(409, 'AUTH_CONTACT_ALREADY_EXISTS', '该账号已存在。')
    }

    const enabledModules = moduleCatalog.slice(0, 10).map((item) => item.moduleKey)
    const user = securityService.createStoredUser({
      id: securityService.createUserId(),
      name: safeName,
      contact: safeContact,
      password: safePassword,
      enabledModules,
    })
    await dataRepository.insertUser(user)
    await dataRepository.insertTasks(dataRepository.createSeedTasks(user.id, user.enabledModules))

    const token = securityService.signAuthToken({
      userId: user.id,
      role: user.role,
      remember: true,
      tokenVersion: Number(user.tokenVersion ?? 0),
    })
    return { token, user: toAuthUser(user) }
  }

  async function logout(userId) {
    await dataRepository.incrementUserTokenVersion(userId)
    await dataRepository.setUserTokenState(userId, 'expired')
  }

  return {
    toAuthUser,
    login,
    register,
    logout,
  }
}
