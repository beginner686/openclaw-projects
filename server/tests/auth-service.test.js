import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthService } from '../src/services/auth-service.js'

const moduleCatalog = Array.from({ length: 12 }, (_, index) => ({
  moduleKey: `module-${index + 1}`,
}))

function createAuthContext(overrides = {}) {
  const calls = {
    findUserByContact: [],
    setUserTokenState: [],
    signAuthToken: [],
    createStoredUser: [],
    insertUser: [],
    insertTasks: [],
  }

  const dataRepository = {
    findUserByContact: async (contact) => {
      calls.findUserByContact.push(contact)
      return null
    },
    setUserTokenState: async (userId, state) => {
      calls.setUserTokenState.push({ userId, state })
    },
    contactExists: async () => false,
    insertUser: async (user) => {
      calls.insertUser.push(user)
    },
    createSeedTasks: () => [],
    insertTasks: async (tasks) => {
      calls.insertTasks.push(tasks)
    },
    incrementUserTokenVersion: async () => 1,
    ...overrides.dataRepository,
  }

  const securityService = {
    verifyPassword: () => false,
    signAuthToken: (payload) => {
      calls.signAuthToken.push(payload)
      return 'signed-token'
    },
    createStoredUser: (payload) => {
      calls.createStoredUser.push(payload)
      return {
        id: payload.id,
        name: payload.name,
        contact: payload.contact,
        enabledModules: payload.enabledModules,
        role: 'customer',
        tokenState: 'active',
        tokenVersion: 0,
      }
    },
    createUserId: () => 'u-test-001',
    ...overrides.securityService,
  }

  const authService = createAuthService({
    dataRepository,
    securityService,
    moduleCatalog,
  })

  return { authService, calls }
}

test('login should reject missing credentials', async () => {
  const { authService } = createAuthContext()
  const result = await authService.login({ account: '', password: '' })

  assert.equal(result.error.code, 'AUTH_MISSING_CREDENTIALS')
  assert.equal(result.error.status, 400)
})

test('login should normalize account and reactivate expired session', async () => {
  const user = {
    id: 'u-1',
    name: 'Demo',
    contact: 'demo@openclaw.ai',
    enabledModules: ['module-1'],
    role: 'customer',
    tokenState: 'expired',
    tokenVersion: 2,
  }

  const { authService, calls } = createAuthContext({
    dataRepository: {
      findUserByContact: async (contact) => {
        calls.findUserByContact.push(contact)
        return { ...user }
      },
    },
    securityService: {
      verifyPassword: () => true,
    },
  })

  const result = await authService.login({
    account: ' Demo@OpenClaw.AI ',
    password: '123456',
    remember: true,
  })

  assert.equal(calls.findUserByContact[0], 'demo@openclaw.ai')
  assert.deepEqual(calls.setUserTokenState[0], { userId: 'u-1', state: 'active' })
  assert.equal(calls.signAuthToken[0].tokenVersion, 2)
  assert.equal(result.token, 'signed-token')
  assert.equal(result.user.tokenState, 'active')
})

test('register should reject duplicated contact', async () => {
  const { authService } = createAuthContext({
    dataRepository: {
      contactExists: async () => true,
    },
  })

  const result = await authService.register({
    name: 'New User',
    contact: 'demo@openclaw.ai',
    password: '123456',
  })

  assert.equal(result.error.code, 'AUTH_CONTACT_ALREADY_EXISTS')
  assert.equal(result.error.status, 409)
})

test('register should include anti-fraud and grocery modules', async () => {
  const { authService, calls } = createAuthContext()
  const result = await authService.register({
    name: 'New User',
    contact: 'new@openclaw.ai',
    password: '123456',
  })

  assert.equal(result.token, 'signed-token')
  assert.equal(calls.insertUser.length, 1)
  const enabledModules = calls.createStoredUser[0].enabledModules

  assert.ok(enabledModules.includes('anti-fraud-guardian'))
  assert.ok(enabledModules.includes('smart-grocery-supermarket'))
  assert.equal(calls.insertTasks.length, 1)
})

