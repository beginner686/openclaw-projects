export type ModuleCategory = 'enterprise' | 'personal'

export type ModuleStatus = 'active' | 'beta' | 'coming_soon'

export interface ModuleMeta {
  moduleKey: string
  name: string
  category: ModuleCategory
  description: string
  icon: string
  status: ModuleStatus
  mobileSupported: boolean
}

export interface AuthUser {
  id: string
  name: string
  contact: string
  enabledModules: string[]
  role: 'customer' | 'admin'
  tokenState: 'active' | 'expired'
}

export interface DashboardReport {
  id: string
  title: string
  createdAt: string
  format: 'pdf' | 'xlsx' | 'docx' | 'html' | 'txt'
  url: string
}

export interface DashboardNotification {
  id: string
  title: string
  level: 'info' | 'warning' | 'success'
  createdAt: string
}

export interface ModuleTaskResult {
  taskId: string
  moduleKey: string
  status: 'review' | 'queued' | 'running' | 'completed' | 'failed'
  summary: string
  updatedAt: string
  reportUrl?: string
  errorMessage?: string
}

export interface CustomerDashboardData {
  openedModules: string[]
  recentTasks: ModuleTaskResult[]
  reports: DashboardReport[]
  notifications: DashboardNotification[]
}

export interface ModuleTaskPayload {
  moduleKey: string
  scenario: string
  inputText: string
  attachments: string[]
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface ApiMessage {
  message: string
}
