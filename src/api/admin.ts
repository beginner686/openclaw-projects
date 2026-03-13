import { apiClient } from './client'

export interface AdminStats {
  totalUsers: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  runningTasks: number
  pendingReviewTasks: number
  successRate: number
  moduleRanking: ModuleRankItem[]
}

export interface ModuleRankItem {
  moduleKey: string
  name: string
  category: string
  icon: string
  total: number
  completed: number
  failed: number
  running: number
  queued: number
  review: number
}

export interface AdminUser {
  id: string
  name: string
  contact: string
  role: string
  enabledModules: string[]
  tokenState: string
  taskCount?: number
  lastTaskAt?: string | null
}

export interface AdminTask {
  taskId: string
  ownerId: string
  moduleKey: string
  scenario: string
  status: string
  summary: string
  reportUrl: string
  updatedAt: string
  createdAt: string
  errorMessage?: string
}

export interface AdminModuleOverview {
  module: { moduleKey: string; name: string; description: string; category: string; icon: string }
  stat: { total: number; completed: number; failed: number; running: number; queued: number; review: number; successRate: number }
  activeUsers: number
  recentTasks: AdminTask[]
}

export interface AdminListResult<T> {
  items?: T[]
  users?: AdminUser[]
  tasks?: AdminTask[]
  total: number
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>('/admin/stats')
  return data
}

export async function fetchAdminUsers(params: { page?: number; limit?: number; search?: string } = {}): Promise<{ users: AdminUser[]; total: number }> {
  const { data } = await apiClient.get<{ users: AdminUser[]; total: number }>('/admin/users', { params })
  return data
}

export async function updateUserModules(userId: string, modules: string[]): Promise<void> {
  await apiClient.put(`/admin/users/${userId}/modules`, { modules })
}

export async function fetchAdminTasks(params: { page?: number; limit?: number; status?: string; moduleKey?: string } = {}): Promise<{ tasks: AdminTask[]; total: number }> {
  const { data } = await apiClient.get<{ tasks: AdminTask[]; total: number }>('/admin/tasks', { params })
  return data
}

export type ReviewAction = 'approve' | 'reject'

export async function reviewAdminTask(taskId: string, action: ReviewAction, reason = ''): Promise<AdminTask> {
  const { data } = await apiClient.post<AdminTask>(`/admin/tasks/${taskId}/review`, { action, reason })
  return data
}

export async function fetchModuleOverview(moduleKey: string): Promise<AdminModuleOverview> {
  const { data } = await apiClient.get<AdminModuleOverview>(`/admin/module/${moduleKey}/overview`)
  return data
}

export async function fetchModuleTasks(moduleKey: string, params: { page?: number; limit?: number; status?: string } = {}): Promise<{ tasks: AdminTask[]; total: number }> {
  const { data } = await apiClient.get<{ tasks: AdminTask[]; total: number }>(`/admin/module/${moduleKey}/tasks`, { params })
  return data
}

export async function fetchModuleUsers(moduleKey: string): Promise<AdminUser[]> {
  const { data } = await apiClient.get<AdminUser[]>(`/admin/module/${moduleKey}/users`)
  return data
}

export interface ModuleReport {
  taskId: string
  scenario: string
  updatedAt: string
  reportFormat: string
  reportUrl: string
}

export async function fetchModuleReports(moduleKey: string): Promise<ModuleReport[]> {
  const { data } = await apiClient.get<ModuleReport[]>(`/admin/module/${moduleKey}/reports`)
  return data
}

export interface ModuleSettingsConfig {
  execution: {
    mode: 'auto' | 'manual' | 'hybrid'
    maxConcurrency: number
    timeoutSeconds: number
    retryLimit: number
  }
  alerts: {
    enabled: boolean
    channels: string[]
    webhookUrl: string
    emails: string[]
  }
  visibility: {
    allowCustomerView: boolean
    allowExport: boolean
  }
  rule: {
    focusChecks: string[]
    riskSignals: string[]
    failSignals: string[]
    nextActions: string[]
  }
  integrations: {
    dataSource: string
    dashboardPath: string
    moduleCategory: string
  }
  remarks: string
}

export interface ModuleSettings {
  moduleKey: string
  moduleName: string
  moduleCategory: string
  source: 'default' | 'saved'
  updatedBy: string
  updatedAt: string | null
  createdAt: string | null
  config: ModuleSettingsConfig
}

export async function fetchModuleSettings(moduleKey: string): Promise<ModuleSettings> {
  const { data } = await apiClient.get<ModuleSettings>(`/admin/module/${moduleKey}/settings`)
  return data
}

export async function updateModuleSettings(
  moduleKey: string,
  config: ModuleSettingsConfig,
): Promise<ModuleSettings> {
  const { data } = await apiClient.put<ModuleSettings>(`/admin/module/${moduleKey}/settings`, { config })
  return data
}
