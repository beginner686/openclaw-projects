import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { mkdirSync } from 'node:fs'
import { env, validateEnvOrThrow } from './config/env.js'
import { paths } from './config/paths.js'
import { getModuleKeyVariants, getModuleName, getModuleRule, moduleCatalog, normalizeModuleKey } from './config/catalog.js'
import {
  platformMenuCatalog,
  platformModuleCatalog,
  platformPermissionCatalog,
  platformRoleCatalog,
} from './config/platform-catalog.js'
import { createDataRepository } from './repositories/data-repository.js'
import { createPlatformRepository } from './repositories/platform-repository.js'
import { createSecurityService } from './services/security-service.js'
import { createReportService } from './services/report-service.js'
import { createTaskService } from './services/task-service.js'
import { createModuleLogicService } from './services/module-logic-service.js'
import { createAuthService } from './services/auth-service.js'
import { createDashboardService } from './services/dashboard-service.js'
import { createAdminService } from './services/admin-service.js'
import { createAntiFraudService } from './services/anti-fraud-service.js'
import { createGroceryService } from './services/grocery-service.js'
import { createMediaService } from './services/media-service.js'
import { createPlatformService } from './services/platform-service.js'
import { createAuthMiddleware } from './middleware/auth-middleware.js'
import { createV1AuthMiddleware } from './middleware/v1-auth-middleware.js'
import { createAuthRoutes } from './routes/auth-routes.js'
import { createAdminRoutes } from './routes/admin-routes.js'
import { createAntiFraudRoutes } from './routes/anti-fraud-routes.js'
import { createCustomerRoutes } from './routes/customer-routes.js'
import { createGroceryRoutes } from './routes/grocery-routes.js'
import { createMediaRoutes } from './routes/media-routes.js'
import { createModuleRoutes } from './routes/module-routes.js'
import { createReportRoutes } from './routes/report-routes.js'
import { createV1Routes } from './routes/v1-routes.js'
import { AppError } from './utils/app-error.js'
import { sendFailure } from './utils/http-response.js'

export async function createBackendApp() {
  validateEnvOrThrow(env)
  mkdirSync(paths.dataDir, { recursive: true })
  mkdirSync(paths.reportsDir, { recursive: true })

  const securityService = createSecurityService({ env })

  const dataRepository = createDataRepository({
    env,
    paths,
    moduleCatalog,
    getModuleName,
    normalizeModuleKey,
    getModuleKeyVariants,
    securityService,
  })

  const platformRepository = createPlatformRepository({
    env,
    securityService,
    platformModuleCatalog,
    platformRoleCatalog,
    platformPermissionCatalog,
    platformMenuCatalog,
  })

  const moduleLogicService = createModuleLogicService()

  const reportService = createReportService({
    paths,
    getModuleName,
    getModuleRule,
    moduleLogicService,
    securityService,
    dataRepository,
  })

  const taskService = createTaskService({
    env,
    moduleCatalog,
    getModuleName,
    getModuleRule,
    normalizeModuleKey,
    moduleLogicService,
    dataRepository,
    reportService,
  })

  const authService = createAuthService({
    dataRepository,
    securityService,
    moduleCatalog,
  })

  const dashboardService = createDashboardService({
    getModuleName,
    reportService,
    dataRepository,
    taskService,
  })

  const platformService = createPlatformService({
    platformRepository,
    securityService,
  })

  const adminService = createAdminService({
    dataRepository,
    moduleCatalog,
    getModuleName,
    getModuleRule,
    reportService,
  })

  const antiFraudService = createAntiFraudService({
    env,
    dataRepository,
  })

  const groceryService = createGroceryService({
    dataRepository,
  })

  const mediaService = createMediaService({
    dataRepository,
  })

  const { authMiddleware, requireAdmin } = createAuthMiddleware({
    dataRepository,
    securityService,
  })

  const v1AuthMiddleware = createV1AuthMiddleware({
    platformRepository,
    securityService,
  })

  await dataRepository.ensureInitialized()
  await platformRepository.ensureInitialized()
  await taskService.reconcileDatabase()
  taskService.startWorker()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.use(morgan('dev'))

  app.use('/reports', createReportRoutes({ reportService, taskService, securityService }))

  // Legacy APIs retained for current frontend compatibility.
  app.use('/api/auth', createAuthRoutes({ authService, authMiddleware }))
  app.use('/api/customer', createCustomerRoutes({ authMiddleware, dashboardService }))
  app.use('/api/modules', createModuleRoutes({ authMiddleware, taskService }))
  app.use('/api/anti-fraud', createAntiFraudRoutes({ authMiddleware, antiFraudService }))
  app.use('/api/grocery', createGroceryRoutes({ authMiddleware, groceryService }))
  app.use('/api/media', createMediaRoutes({ authMiddleware, mediaService }))
  app.use('/api/admin', createAdminRoutes({ authMiddleware, requireAdmin, adminService }))

  // New unified backend APIs.
  app.use('/api/v1', createV1Routes({ v1AuthMiddleware, platformService }))

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      queue: taskService.getQueueState(),
      time: new Date().toISOString(),
    })
  })

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      code: 0,
      message: 'success',
      data: {
        status: 'ok',
        time: new Date().toISOString(),
      },
    })
  })

  app.use((err, _req, res, _next) => {
    console.error('[backend-error]', err)
    if (err instanceof AppError) {
      sendFailure(res, { status: err.status, code: err.code, message: err.message, details: err.details })
      return
    }
    const normalized = platformService.toHttpError(err)
    sendFailure(res, {
      status: normalized.status,
      code: normalized.code,
      message: normalized.message,
      details: null,
    })
  })

  app.use((_req, res) => {
    sendFailure(res, { status: 404, code: 40400, message: 'route not found' })
  })

  return {
    app,
    env,
    stop: async () => {
      taskService.stopWorker()
      await dataRepository.close()
      await platformRepository.close()
    },
  }
}
