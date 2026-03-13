import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { env, validateEnvOrThrow } from './config/env.js'
import { paths } from './config/paths.js'
import { getModuleKeyVariants, getModuleName, getModuleRule, moduleCatalog, normalizeModuleKey } from './config/catalog.js'
import { createDataRepository } from './repositories/data-repository.js'
import { createSecurityService } from './services/security-service.js'
import { createReportService } from './services/report-service.js'
import { createTaskService } from './services/task-service.js'
import { createAuthService } from './services/auth-service.js'
import { createDashboardService } from './services/dashboard-service.js'
import { createAntiFraudService } from './services/anti-fraud-service.js'
import { createGroceryService } from './services/grocery-service.js'
import { createAuthMiddleware } from './middleware/auth-middleware.js'
import { createAuthRoutes } from './routes/auth-routes.js'
import { createCustomerRoutes } from './routes/customer-routes.js'
import { createModuleRoutes } from './routes/module-routes.js'
import { createReportRoutes } from './routes/report-routes.js'
import { createAntiFraudRoutes } from './routes/anti-fraud-routes.js'
import { createGroceryRoutes } from './routes/grocery-routes.js'

export async function createBackendApp() {
  validateEnvOrThrow(env)

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
  const reportService = createReportService({
    paths,
    getModuleName,
    getModuleRule,
    securityService,
  })
  const taskService = createTaskService({
    env,
    moduleCatalog,
    getModuleName,
    getModuleRule,
    normalizeModuleKey,
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
  const antiFraudService = createAntiFraudService({
    dataRepository,
  })
  const groceryService = createGroceryService({
    dataRepository,
  })
  const authMiddleware = createAuthMiddleware({
    dataRepository,
    securityService,
  })

  await dataRepository.ensureInitialized()
  await taskService.reconcileDatabase()
  taskService.startWorker()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.use(morgan('dev'))

  app.use('/reports', createReportRoutes({ reportService, taskService, securityService }))
  app.use('/api/auth', createAuthRoutes({ authService, authMiddleware }))
  app.use('/api/customer', createCustomerRoutes({ authMiddleware, dashboardService }))
  app.use('/api/modules', createModuleRoutes({ authMiddleware, taskService }))
  app.use('/api/anti-fraud', createAntiFraudRoutes({ authMiddleware, antiFraudService }))
  app.use('/api/grocery', createGroceryRoutes({ authMiddleware, groceryService }))

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      queue: taskService.getQueueState(),
      time: new Date().toISOString(),
    })
  })

  app.use((err, _req, res, _next) => {
    console.error('[backend-error]', err)
    res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: '服务器内部错误。' })
  })

  app.use((_req, res) => {
    res.status(404).json({ code: 'ROUTE_NOT_FOUND', message: '接口不存在。' })
  })

  return {
    app,
    env,
    stop: async () => {
      taskService.stopWorker()
      await dataRepository.close()
    },
  }
}
