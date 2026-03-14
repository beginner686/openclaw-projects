import { Router } from 'express'
import { asyncRoute, sendSuccess } from '../utils/http-response.js'

export function createV1Routes({ v1AuthMiddleware, platformService }) {
  const router = Router()

  router.post(
    '/auth/login',
    asyncRoute(async (req, res) => {
      const data = await platformService.login(req.body ?? {})
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/auth/logout',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      await platformService.logout(req.authUser.id)
      sendSuccess(res, { loggedOut: true })
    }),
  )

  router.get(
    '/auth/profile',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.buildProfile(req.authUser)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/dashboard',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getDashboard(req.authUser)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/menus',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listMenus(req.authUser)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/roles',
    v1AuthMiddleware,
    asyncRoute(async (_req, res) => {
      const data = await platformService.listRoles()
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/permissions',
    v1AuthMiddleware,
    asyncRoute(async (_req, res) => {
      const data = await platformService.listPermissions()
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/modules',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listModules(req.authUser)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/modules/:code',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getModule(req.authUser, String(req.params.code))
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/modules/:code/open',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const mode = typeof req.body?.accessMode === 'string' ? req.body.accessMode : 'tenant'
      const data = await platformService.openModule(req.authUser, String(req.params.code), mode)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/tenants',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listTenants(req.authUser, req.query)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/tenants/:id',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getTenant(req.authUser, String(req.params.id))
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/tenants',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.createTenant(req.authUser, req.body ?? {})
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/tenants/:id/package',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.assignTenantPackage(req.authUser, String(req.params.id), req.body ?? {})
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/tasks',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listTasks(req.authUser, req.query)
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/tasks',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.createTask(req.authUser, req.body ?? {})
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/tasks/:id',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getTask(req.authUser, Number(req.params.id))
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/tasks/:id/logs',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listTaskLogs(req.authUser, Number(req.params.id))
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/users',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listUsers(req.authUser, req.query)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/users/:id',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getUser(req.authUser, String(req.params.id))
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/users',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.createUser(req.authUser, req.body ?? {})
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/messages',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listMessages(req.authUser, req.query)
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/messages/read',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
      const data = await platformService.markMessagesRead(req.authUser, ids)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/packages',
    v1AuthMiddleware,
    asyncRoute(async (_req, res) => {
      const data = await platformService.listPackages()
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/packages/:id',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getPackage(req.authUser, Number(req.params.id))
      sendSuccess(res, data)
    }),
  )

  router.post(
    '/packages',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.createPackage(req.authUser, req.body ?? {})
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/reports',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.listReports(req.authUser, req.query)
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/reports/:id',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getReport(req.authUser, Number(req.params.id))
      sendSuccess(res, data)
    }),
  )

  router.get(
    '/reports/:id/export',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const report = await platformService.getReport(req.authUser, Number(req.params.id))
      const fileName = `report-${report.id}.json`
      const payload = {
        exportedAt: new Date().toISOString(),
        report,
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
      res.send(JSON.stringify(payload, null, 2))
    }),
  )

  router.get(
    '/settings',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.getSettings(req.authUser)
      sendSuccess(res, data)
    }),
  )

  router.put(
    '/settings',
    v1AuthMiddleware,
    asyncRoute(async (req, res) => {
      const data = await platformService.updateSettings(req.authUser, req.body ?? {})
      sendSuccess(res, data)
    }),
  )

  return router
}
