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
  tenantId?: string
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
  tenantId?: string
  ownerId: string
  moduleKey: string
  scenario: string
  inputText?: string
  attachments?: string[]
  status: string
  summary: string
  reportUrl: string
  updatedAt: string
  createdAt: string
  errorMessage?: string
}

export interface AdminTaskSummary {
  total: number
  review: number
  queued: number
  running: number
  completed: number
  failed: number
  processing: number
  successRate: number
}

export interface AdminModuleOverview {
  module: { moduleKey: string; name: string; description: string; category: string; icon: string }
  stat: { total: number; completed: number; failed: number; running: number; queued: number; review: number; successRate: number }
  activeUsers: number
  recentTasks: AdminTask[]
  workbench?: ModuleWorkbench
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

export interface DataDictionaryItem {
  id: number
  dictType: string
  dictKey: string
  dictValue: string
  dictLabel: string
  description: string
  sortOrder: number
  isSystem: boolean
  status: string
  createdAt: string | null
  updatedAt: string | null
}

export async function fetchAdminDictionary(type = ''): Promise<{ items: DataDictionaryItem[]; grouped: Record<string, DataDictionaryItem[]> }> {
  const { data } = await apiClient.get<{ items: DataDictionaryItem[]; grouped: Record<string, DataDictionaryItem[]> }>('/admin/dictionary', {
    params: type ? { type } : undefined,
  })
  return data
}

export interface GeneratedModuleItem {
  moduleKey: string
  name: string
  category: 'enterprise' | 'personal'
  description: string
  icon: string
  status: 'active' | 'beta' | 'coming_soon'
  mobileSupported: boolean
  createdBy: string
  createdAt: string | null
  updatedAt: string | null
}

export interface GenerateModulePayload {
  moduleName: string
  moduleKey?: string
  category?: 'enterprise' | 'personal'
  icon?: string
  status?: 'active' | 'beta' | 'coming_soon'
  description?: string
  designDoc: string
}

export async function fetchGeneratedModules(): Promise<{ items: GeneratedModuleItem[] }> {
  const { data } = await apiClient.get<{ items: GeneratedModuleItem[] }>('/admin/module-factory/modules')
  return data
}

export async function generateModuleFromDoc(payload: GenerateModulePayload): Promise<{
  module: GeneratedModuleItem
  blueprint: Record<string, unknown>
  executionRule: Record<string, unknown>
  sourceDoc: string
}> {
  const { data } = await apiClient.post('/admin/module-factory/generate', payload)
  return data
}

export async function fetchAdminUsers(params: { page?: number; limit?: number; search?: string } = {}): Promise<{ users: AdminUser[]; total: number }> {
  const { data } = await apiClient.get<{ users: AdminUser[]; total: number }>('/admin/users', { params })
  return data
}

export async function updateUserModules(userId: string, modules: string[]): Promise<void> {
  await apiClient.put(`/admin/users/${userId}/modules`, { modules })
}

export async function fetchAdminTasks(
  params: { page?: number; limit?: number; status?: string; moduleKey?: string; keyword?: string } = {},
): Promise<{ tasks: AdminTask[]; total: number; summary: AdminTaskSummary }> {
  const { data } = await apiClient.get<{ tasks: AdminTask[]; total: number; summary: AdminTaskSummary }>('/admin/tasks', { params })
  return data
}

export async function fetchAdminTaskDetail(taskId: string): Promise<AdminTask> {
  const { data } = await apiClient.get<AdminTask>(`/admin/tasks/${taskId}`)
  return data
}

export type ReviewAction = 'approve' | 'reject'

export async function reviewAdminTask(taskId: string, action: ReviewAction, reason = ''): Promise<AdminTask> {
  const { data } = await apiClient.post<AdminTask>(`/admin/tasks/${taskId}/review`, { action, reason })
  return data
}

export async function reviewAdminTasksBulk(
  taskIds: string[],
  action: ReviewAction,
  reason = '',
): Promise<{ processed: number; success: number; failed: number; failedItems: Array<{ taskId: string; code: string; message: string }>; items: AdminTask[] }> {
  const { data } = await apiClient.post('/admin/tasks/review-bulk', { taskIds, action, reason })
  return data
}

export async function fetchModuleOverview(moduleKey: string): Promise<AdminModuleOverview> {
  const { data } = await apiClient.get<AdminModuleOverview>(`/admin/module/${moduleKey}/overview`)
  return data
}

export interface ModuleTaskFeatureApplied {
  key: string
  name: string
  description: string
}

export async function fetchModuleTasks(
  moduleKey: string,
  params: { page?: number; limit?: number; status?: string; keyword?: string; featureKey?: string } = {},
): Promise<{ tasks: AdminTask[]; total: number; summary: AdminTaskSummary; featureApplied?: ModuleTaskFeatureApplied | null }> {
  const { data } = await apiClient.get<{
    tasks: AdminTask[]
    total: number
    summary: AdminTaskSummary
    featureApplied?: ModuleTaskFeatureApplied | null
  }>(`/admin/module/${moduleKey}/tasks`, { params })
  return data
}

export interface ModuleFeatureRecordPayload {
  headline: string
  highlights: string[]
  finding: string
  recommendation: string
  details: Record<string, unknown>
}

export interface ModuleFeatureRecord {
  recordId: string
  tenantId?: string
  taskId: string
  ownerId: string
  moduleKey: string
  featureKey: string
  featureName: string
  scenario: string
  status: string
  payload: ModuleFeatureRecordPayload
  createdAt: string
  updatedAt: string
}

export async function fetchModuleFeatureRecords(
  moduleKey: string,
  featureKey: string,
  params: { page?: number; limit?: number; status?: string; keyword?: string } = {},
): Promise<{ records: ModuleFeatureRecord[]; total: number; summary: AdminTaskSummary; featureApplied?: ModuleTaskFeatureApplied | null }> {
  const { data } = await apiClient.get<{
    records: ModuleFeatureRecord[]
    total: number
    summary: AdminTaskSummary
    featureApplied?: ModuleTaskFeatureApplied | null
  }>(`/admin/module/${moduleKey}/features/${featureKey}/records`, { params })
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

export interface ModuleWorkbenchFeature {
  key: string
  name: string
  description: string
  target: 'overview' | 'tasks' | 'users' | 'reports' | 'settings'
  targetPath: string
  taskCount: number
  pendingCount: number
  completedCount: number
  successRate: number
  lastUpdatedAt: string | null
  status: 'idle' | 'running' | 'healthy' | 'attention'
}

export interface ModuleWorkbenchKpi {
  key: string
  label: string
  value: number
  unit: string
  target: number | null
  delta: number
  level: 'good' | 'stable' | 'warning'
  description: string
  calc: string
  activeUsers: number
}

export interface ModuleWorkbench {
  moduleKey: string
  moduleName: string
  projectName: string
  uniqueValue: string
  featureMenus: ModuleWorkbenchFeature[]
  kpiCards: ModuleWorkbenchKpi[]
  insights: string[]
}

export async function fetchModuleWorkbench(moduleKey: string): Promise<ModuleWorkbench> {
  const { data } = await apiClient.get<ModuleWorkbench>(`/admin/module/${moduleKey}/workbench`)
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
