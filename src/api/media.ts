import { apiClient } from './client'
import type {
  MediaContent,
  MediaDashboardData,
  MediaProduct,
  MediaProject,
  MediaSchedule,
  MediaTopic,
} from '@/types/domain'

export interface GenerateTopicsPayload {
  projectId?: string
  platform?: string
  niche?: string
  audience?: string
  goal?: string
  count?: number
}

export interface GenerateContentPayload {
  projectId?: string
  topicId?: string
  topicText?: string
  platform?: string
  tone?: string
  productHook?: string
}

export interface RewriteContentPayload {
  projectId?: string
  contentId?: string
  rawText?: string
  title?: string
  targetPlatform: string
}

export interface CreateProductPayload {
  projectId?: string
  platformSource: string
  name: string
  url?: string
  price: number
  commissionRate: number
  shippingMode?: string
  supplier?: string
  stockHint?: number
  sellingPoint?: string
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  status?: string
  score?: number
  decision?: 'pending' | 'priority' | 'candidate' | 'drop'
  reasons?: string[]
}

export interface ScoreProductsPayload {
  projectId?: string
  productIds?: string[]
}

export interface GenerateSchedulesPayload {
  projectId?: string
  days?: number
  dailyPosts?: number
  platforms?: string[]
}

export interface UpdateSchedulePayload {
  projectId?: string
  publishDate?: string
  platform?: string
  topicId?: string
  contentId?: string
  productId?: string
  status?: 'planned' | 'publishing' | 'published' | 'failed'
  note?: string
  failureReason?: string
}

export interface CreateProjectPayload {
  name: string
  niche?: string
  goal?: string
  targetPlatforms?: string[]
}

export async function fetchMediaDashboard(projectId?: string) {
  const { data } = await apiClient.get<MediaDashboardData>('/media/dashboard', {
    params: projectId ? { projectId } : undefined,
  })
  return data
}

export async function fetchMediaProjects() {
  const { data } = await apiClient.get<MediaProject[]>('/media/projects')
  return data
}

export async function createMediaProject(payload: CreateProjectPayload) {
  const { data } = await apiClient.post<MediaProject>('/media/projects', payload)
  return data
}

export async function fetchMediaTopics(projectId?: string) {
  const { data } = await apiClient.get<{ project: MediaProject; topics: MediaTopic[] }>('/media/topics', {
    params: projectId ? { projectId } : undefined,
  })
  return data
}

export async function generateMediaTopics(payload: GenerateTopicsPayload) {
  const { data } = await apiClient.post<{ project: MediaProject; topics: MediaTopic[] }>('/media/topics/generate', payload)
  return data
}

export async function fetchMediaContents(projectId?: string) {
  const { data } = await apiClient.get<{ project: MediaProject; contents: MediaContent[] }>('/media/contents', {
    params: projectId ? { projectId } : undefined,
  })
  return data
}

export async function generateMediaContent(payload: GenerateContentPayload) {
  const { data } = await apiClient.post<{ project: MediaProject; content: MediaContent }>('/media/contents/generate', payload)
  return data
}

export async function rewriteMediaContent(payload: RewriteContentPayload) {
  const { data } = await apiClient.post<{ project: MediaProject; content: MediaContent }>('/media/contents/rewrite', payload)
  return data
}

export async function fetchMediaProducts(projectId?: string) {
  const { data } = await apiClient.get<{ project: MediaProject; products: MediaProduct[] }>('/media/products', {
    params: projectId ? { projectId } : undefined,
  })
  return data
}

export async function createMediaProduct(payload: CreateProductPayload) {
  const { data } = await apiClient.post<{ project: MediaProject; product: MediaProduct }>('/media/products', payload)
  return data
}

export async function updateMediaProduct(productId: string, payload: UpdateProductPayload) {
  const { data } = await apiClient.put<MediaProduct>(`/media/products/${productId}`, payload)
  return data
}

export async function deleteMediaProduct(productId: string) {
  const { data } = await apiClient.delete<{ success: boolean }>(`/media/products/${productId}`)
  return data
}

export async function scoreMediaProducts(payload: ScoreProductsPayload) {
  const { data } = await apiClient.post<{ project: MediaProject; products: MediaProduct[] }>('/media/products/score', payload)
  return data
}

export async function fetchMediaSchedules(projectId?: string) {
  const { data } = await apiClient.get<{
    project: MediaProject
    schedules: MediaSchedule[]
    summary?: {
      planned: number
      publishing: number
      published: number
      failed: number
      successRate: number
      topFailureReasons: Array<{ reason: string; count: number }>
    }
  }>('/media/schedules', { params: projectId ? { projectId } : undefined })
  return data
}

export async function generateMediaSchedules(payload: GenerateSchedulesPayload) {
  const { data } = await apiClient.post<{ project: MediaProject; schedules: MediaSchedule[] }>('/media/schedules/generate', payload)
  return data
}

export async function updateMediaSchedule(scheduleId: string, payload: UpdateSchedulePayload) {
  const { data } = await apiClient.put<{ project: MediaProject; schedule: MediaSchedule }>(
    `/media/schedules/${scheduleId}`,
    payload,
  )
  return data
}
