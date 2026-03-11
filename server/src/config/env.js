export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtIssuer: 'openclaw-project',
  jwtSecret: process.env.OPENCLAW_JWT_SECRET ?? 'openclaw-dev-secret-change-this',
  passwordPepper: process.env.OPENCLAW_PASSWORD_PEPPER ?? 'openclaw-password-pepper',
  reportSecret: process.env.OPENCLAW_REPORT_SECRET ?? `${process.env.OPENCLAW_JWT_SECRET ?? 'openclaw-dev-secret-change-this'}:report`,
  reportAccessTtlSec: 15 * 60,
  workerPollMs: 1200,
  maxConcurrency: 2,
   maxTaskRows: Number(process.env.OPENCLAW_MAX_TASK_ROWS ?? 3000),
   cleanupIntervalMs: Number(process.env.OPENCLAW_CLEANUP_INTERVAL_MS ?? 5 * 60 * 1000),
  mysqlHost: process.env.MYSQL_HOST ?? '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3306),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? '',
  mysqlDatabase: process.env.MYSQL_DATABASE ?? 'openclaw',
  mysqlPoolSize: Number(process.env.MYSQL_POOL_SIZE ?? 10),
}

export function validateEnvOrThrow(currentEnv = env) {
  const issues = []
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    if (!process.env.OPENCLAW_JWT_SECRET) {
      issues.push('OPENCLAW_JWT_SECRET 未配置，生产环境禁止使用默认 JWT 密钥。')
    }
    if (!process.env.OPENCLAW_PASSWORD_PEPPER) {
      issues.push('OPENCLAW_PASSWORD_PEPPER 未配置，生产环境禁止使用默认密码 pepper。')
    }
    if (!process.env.OPENCLAW_REPORT_SECRET) {
      issues.push('OPENCLAW_REPORT_SECRET 未配置，生产环境禁止使用默认报告访问密钥。')
    }
    if (!currentEnv.mysqlPassword) {
      issues.push('MYSQL_PASSWORD 为空，生产环境请配置数据库密码。')
    }
  }

  if (issues.length) {
    throw new Error(`[env] 配置校验失败：${issues.join(' ')}`)
  }
}
