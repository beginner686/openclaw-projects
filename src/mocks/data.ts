import { moduleCatalog } from '@/config/modules'
import type { AuthUser, CustomerDashboardData, ModuleTaskPayload, ModuleTaskResult } from '@/types/domain'

interface AccountEntry {
  password: string
  user: AuthUser
}

const seedAccounts = new Map<string, AccountEntry>([
  [
    'demo@openclaw.ai',
    {
      password: '123456',
      user: {
        id: 'u-demo-001',
        name: '演示客户',
        contact: 'demo@openclaw.ai',
        enabledModules: moduleCatalog.map((item) => item.moduleKey),
        role: 'customer',
        tokenState: 'active',
      },
    },
  ],
  [
    'lite@openclaw.ai',
    {
      password: '123456',
      user: {
        id: 'u-lite-002',
        name: '轻量客户',
        contact: 'lite@openclaw.ai',
        enabledModules: moduleCatalog.slice(0, 8).map((item) => item.moduleKey),
        role: 'customer',
        tokenState: 'active',
      },
    },
  ],
])

const tokenIndex = new Map<string, AuthUser>()
const historyIndex = new Map<string, ModuleTaskResult[]>()

function nowOffset(hoursBack = 0) {
  return new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
}

function buildSeedHistory(moduleKey: string): ModuleTaskResult[] {
  return [
    {
      taskId: `${moduleKey}-task-001`,
      moduleKey,
      status: 'completed',
      summary: '任务执行完成，报告已生成。',
      updatedAt: nowOffset(3),
      reportUrl: `/reports/${moduleKey}-001.pdf`,
    },
    {
      taskId: `${moduleKey}-task-002`,
      moduleKey,
      status: 'running',
      summary: '任务已进入执行队列，预计 2-5 分钟完成。',
      updatedAt: nowOffset(1),
    },
  ]
}

for (const moduleItem of moduleCatalog) {
  historyIndex.set(moduleItem.moduleKey, buildSeedHistory(moduleItem.moduleKey))
}

export function issueToken(user: AuthUser) {
  const token = `mock-token-${user.id}-${Date.now()}`
  tokenIndex.set(token, user)
  return token
}

export function revokeToken(token: string) {
  tokenIndex.delete(token)
}

export function resolveUserByToken(header: string | null) {
  if (!header || !header.startsWith('Bearer ')) {
    return null
  }

  const token = header.replace('Bearer ', '').trim()
  return tokenIndex.get(token) ?? null
}

export function authenticate(account: string, password: string) {
  const normalized = account.trim().toLowerCase()
  const matched = seedAccounts.get(normalized)
  if (!matched) return null
  if (matched.password !== password) return null
  return matched.user
}

export function registerAccount(name: string, contact: string, password: string) {
  const normalized = contact.trim().toLowerCase()
  if (seedAccounts.has(normalized)) {
    return null
  }

  const user: AuthUser = {
    id: `u-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || '新客户',
    contact: normalized,
    enabledModules: moduleCatalog.slice(0, 10).map((item) => item.moduleKey),
    role: 'customer',
    tokenState: 'active',
  }

  seedAccounts.set(normalized, {
    password,
    user,
  })

  return user
}

export function buildDashboard(user: AuthUser): CustomerDashboardData {
  const openedModules = user.enabledModules
  const recentTasks = openedModules
    .flatMap((moduleKey) => historyIndex.get(moduleKey) ?? [])
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 8)

  return {
    openedModules,
    recentTasks,
    reports: recentTasks
      .filter((item) => item.reportUrl)
      .slice(0, 6)
      .map((item, index) => ({
        id: `report-${index + 1}`,
        title: `${moduleCatalog.find((m) => m.moduleKey === item.moduleKey)?.name ?? '业务'}报告`,
        createdAt: item.updatedAt,
        format: 'pdf',
        url: item.reportUrl ?? '#',
      })),
    notifications: [
      {
        id: 'notice-1',
        title: '本周移动端体验更新已生效。',
        level: 'success',
        createdAt: nowOffset(2),
      },
      {
        id: 'notice-2',
        title: '建议为常用业务设置默认场景，提高自动化效率。',
        level: 'info',
        createdAt: nowOffset(6),
      },
      {
        id: 'notice-3',
        title: '检测到部分任务等待时间偏高，请关注执行队列。',
        level: 'warning',
        createdAt: nowOffset(12),
      },
    ],
  }
}

export function runTask(payload: ModuleTaskPayload) {
  const success = Math.random() > 0.12
  const result: ModuleTaskResult = {
    taskId: `${payload.moduleKey}-${Date.now()}`,
    moduleKey: payload.moduleKey,
    status: success ? 'completed' : 'failed',
    summary: success
      ? `场景“${payload.scenario}”执行完成，已输出结果摘要。`
      : '任务执行失败，请检查输入内容或稍后重试。',
    updatedAt: new Date().toISOString(),
    reportUrl: success ? `/reports/${payload.moduleKey}-${Date.now()}.pdf` : undefined,
    errorMessage: success ? undefined : '模拟异常：处理队列出现冲突。',
  }

  const history = historyIndex.get(payload.moduleKey) ?? []
  history.unshift(result)
  historyIndex.set(payload.moduleKey, history.slice(0, 12))
  return result
}

export function getModuleHistory(moduleKey: string) {
  return historyIndex.get(moduleKey) ?? []
}
