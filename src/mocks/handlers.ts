import { delay, http, HttpResponse } from 'msw'
import { moduleCatalog } from '@/config/modules'
import { authenticate, buildDashboard, getModuleHistory, issueToken, registerAccount, resolveUserByToken, revokeToken, runTask } from './data'

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { account: string; password: string; remember: boolean }
    const user = authenticate(body.account, body.password)

    await delay(450)

    if (!user) {
      return HttpResponse.json({ message: '账号或密码错误。' }, { status: 401 })
    }

    const token = issueToken(user)
    return HttpResponse.json({ token, user })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { name: string; contact: string; password: string }
    await delay(450)

    const user = registerAccount(body.name, body.contact, body.password)
    if (!user) {
      return HttpResponse.json({ message: '该账号已注册。' }, { status: 409 })
    }

    const token = issueToken(user)
    return HttpResponse.json({ token, user })
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (token) {
      revokeToken(token)
    }
    await delay(200)
    return HttpResponse.json({ message: '已退出登录。' })
  }),

  http.get('/api/auth/profile', async ({ request }) => {
    const user = resolveUserByToken(request.headers.get('authorization'))
    await delay(300)

    if (!user) {
      return HttpResponse.json({ message: '未授权访问。' }, { status: 401 })
    }

    return HttpResponse.json(user)
  }),

  http.get('/api/customer/dashboard', async ({ request }) => {
    const user = resolveUserByToken(request.headers.get('authorization'))
    await delay(360)

    if (!user) {
      return HttpResponse.json({ message: '请先登录。' }, { status: 401 })
    }

    return HttpResponse.json(buildDashboard(user))
  }),

  http.get('/api/modules', async ({ request }) => {
    const user = resolveUserByToken(request.headers.get('authorization'))
    await delay(200)

    if (!user) {
      return HttpResponse.json({ message: '请先登录。' }, { status: 401 })
    }

    const enabled = new Set(user.enabledModules)
    return HttpResponse.json(moduleCatalog.filter((item) => enabled.has(item.moduleKey)))
  }),

  http.get('/api/modules/:moduleKey/history', async ({ params, request }) => {
    const user = resolveUserByToken(request.headers.get('authorization'))
    await delay(280)

    if (!user) {
      return HttpResponse.json({ message: '请先登录。' }, { status: 401 })
    }

    const moduleKey = String(params.moduleKey)
    if (!user.enabledModules.includes(moduleKey)) {
      return HttpResponse.json({ message: '当前账号未开通该业务。' }, { status: 403 })
    }

    return HttpResponse.json(getModuleHistory(moduleKey))
  }),

  http.post('/api/modules/:moduleKey/tasks', async ({ params, request }) => {
    const user = resolveUserByToken(request.headers.get('authorization'))
    await delay(600)

    if (!user) {
      return HttpResponse.json({ message: '请先登录。' }, { status: 401 })
    }

    const moduleKey = String(params.moduleKey)
    if (!user.enabledModules.includes(moduleKey)) {
      return HttpResponse.json({ message: '当前账号未开通该业务。' }, { status: 403 })
    }

    const payload = (await request.json()) as {
      moduleKey: string
      scenario: string
      inputText: string
      attachments: string[]
    }

    if (!payload.scenario || !payload.inputText) {
      return HttpResponse.json({ message: '请填写完整任务信息。' }, { status: 400 })
    }

    return HttpResponse.json(runTask({ ...payload, moduleKey }))
  }),
]
