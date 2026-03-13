import { apiClient } from './client'
import type {
  AntiFraudComplaint,
  AntiFraudDashboardData,
  AntiFraudEvidence,
  AntiFraudPlan,
  AntiFraudReport,
  AntiFraudScan,
  AntiFraudSubscription,
  AntiFraudTarget,
  AntiFraudUsage,
} from '@/types/domain'

export interface ActivatePlanPayload {
  planCode: 'basic' | 'standard' | 'enterprise'
  months?: number
}

export interface CreateTargetPayload {
  targetType: string
  platform: string
  anchorName: string
  accountHandle: string
  roomLink?: string
  notes?: string
}

export interface RunScanPayload {
  targetId?: string
  sourceTitle: string
  sourceLink?: string
  contentText: string
}

export interface GenerateReportPayload {
  periodType: 'weekly' | 'monthly'
}

export interface CreateComplaintPayload {
  scenario: string
  evidenceIds: string[]
  transactionNotes?: string
  factsSummary?: string
}

export async function fetchAntiFraudDashboard() {
  const { data } = await apiClient.get<AntiFraudDashboardData>('/anti-fraud/dashboard')
  return data
}

export async function fetchAntiFraudPlans() {
  const { data } = await apiClient.get<AntiFraudPlan[]>('/anti-fraud/plans')
  return data
}

export async function fetchAntiFraudSubscription() {
  const { data } = await apiClient.get<{ subscription: AntiFraudSubscription; usage: AntiFraudUsage }>(
    '/anti-fraud/subscription',
  )
  return data
}

export async function activateAntiFraudSubscription(payload: ActivatePlanPayload) {
  const { data } = await apiClient.post<AntiFraudSubscription>('/anti-fraud/subscription/activate', payload)
  return data
}

export async function fetchAntiFraudTargets() {
  const { data } = await apiClient.get<AntiFraudTarget[]>('/anti-fraud/targets')
  return data
}

export async function createAntiFraudTarget(payload: CreateTargetPayload) {
  const { data } = await apiClient.post<AntiFraudTarget>('/anti-fraud/targets', payload)
  return data
}

export async function updateAntiFraudTarget(targetId: string, payload: Partial<CreateTargetPayload & { status: string }>) {
  const { data } = await apiClient.put<AntiFraudTarget>(`/anti-fraud/targets/${targetId}`, payload)
  return data
}

export async function deleteAntiFraudTarget(targetId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(`/anti-fraud/targets/${targetId}`)
  return data
}

export async function fetchAntiFraudScans() {
  const { data } = await apiClient.get<AntiFraudScan[]>('/anti-fraud/scans')
  return data
}

export async function runAntiFraudScan(payload: RunScanPayload) {
  const { data } = await apiClient.post<{ scan: AntiFraudScan; evidence: AntiFraudEvidence | null; notice: string }>(
    '/anti-fraud/scans',
    payload,
  )
  return data
}

export async function fetchAntiFraudEvidences() {
  const { data } = await apiClient.get<AntiFraudEvidence[]>('/anti-fraud/evidences')
  return data
}

export async function fetchAntiFraudReports() {
  const { data } = await apiClient.get<AntiFraudReport[]>('/anti-fraud/reports')
  return data
}

export async function generateAntiFraudReport(payload: GenerateReportPayload) {
  const { data } = await apiClient.post<AntiFraudReport>('/anti-fraud/reports/generate', payload)
  return data
}

export async function fetchAntiFraudComplaints() {
  const { data } = await apiClient.get<AntiFraudComplaint[]>('/anti-fraud/complaints')
  return data
}

export async function createAntiFraudComplaint(payload: CreateComplaintPayload) {
  const { data } = await apiClient.post<AntiFraudComplaint>('/anti-fraud/complaints', payload)
  return data
}
