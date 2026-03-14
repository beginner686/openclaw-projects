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
  tenantId: string
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

export interface ModuleTaskSchemaMetric {
  key: string
  label: string
  unit: string
}

export interface ModuleTaskSchema {
  scenarios: string[]
  inputHints: string[]
  samplePrompt: string
  metrics: ModuleTaskSchemaMetric[]
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface ApiMessage {
  message: string
}

export interface AntiFraudPlan {
  planCode: 'basic' | 'standard' | 'enterprise'
  planName: string
  monthlyPrice: number
  maxTargets: number
  reportFrequency: 'weekly' | 'daily'
  realtimeAlerts: boolean
  productScreening: boolean
  complaintQuotaMonth: number
}

export interface AntiFraudSubscription {
  ownerId: string
  planCode: string
  planName: string
  status: 'active' | 'paused' | 'expired'
  startsAt: string
  expiresAt: string
  maxTargets: number
  reportFrequency: string
  realtimeAlerts: boolean
  productScreening: boolean
  complaintQuotaMonth: number
  createdAt: string
  updatedAt: string
}

export interface AntiFraudUsage {
  targetCount: number
  targetQuota: number
  complaintUsed: number
  complaintQuota: number
  evidenceCount: number
  complaintRemaining: number
}

export interface AntiFraudTarget {
  targetId: string
  ownerId: string
  targetType: string
  platform: string
  anchorName: string
  accountHandle: string
  roomLink: string
  notes: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface AntiFraudScan {
  scanId: string
  ownerId: string
  targetId: string
  sourceTitle: string
  sourceLink: string
  contentText: string
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  riskTags: string[]
  hitPhrases: string[]
  summary: string
  safeAdvice: string
  createdAt: string
}

export interface AntiFraudEvidence {
  evidenceId: string
  ownerId: string
  scanId: string
  targetId: string
  sourceLink: string
  capturedAt: string
  violationPoints: string[]
  snapshotText: string
  status: string
  createdAt: string
}

export interface AntiFraudReport {
  reportId: string
  ownerId: string
  periodType: 'weekly' | 'monthly'
  periodStart: string
  periodEnd: string
  overview: {
    totalScanned: number
    highRiskCount: number
    mediumRiskCount: number
    lowRiskCount: number
  }
  highRiskItems: Array<{
    scanId: string
    sourceTitle?: string
    title?: string
    riskLevel: string
    hitPhrases?: string[]
  }>
  safeItems: Array<{
    scanId: string
    sourceTitle?: string
    title?: string
    riskLevel?: string
  }>
  recommendations: string[]
  createdAt: string
}

export interface AntiFraudComplaint {
  complaintId: string
  ownerId: string
  status: string
  scenario: string
  evidenceIds: string[]
  transactionNotes: string
  factsSummary: string
  generatedText: string
  channelSuggestions: string[]
  createdAt: string
  updatedAt: string
}

export interface AntiFraudDashboardData {
  subscription: AntiFraudSubscription
  usage: AntiFraudUsage
  stats: {
    targets: number
    scans: number
    highRisk: number
    mediumRisk: number
    evidences: number
    reports: number
    complaints: number
  }
  latestRisks: AntiFraudScan[]
  latestEvidences: AntiFraudEvidence[]
  latestReports: AntiFraudReport[]
}
