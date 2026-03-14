import { apiClient } from './client'
import type { ModuleMeta, ModuleTaskPayload, ModuleTaskResult, ModuleTaskSchema } from '@/types/domain'

export async function fetchEnabledModules() {
  const { data } = await apiClient.get<ModuleMeta[]>('/modules')
  return data
}

export async function runModuleTask(payload: ModuleTaskPayload) {
  const { data } = await apiClient.post<ModuleTaskResult>(`/modules/${payload.moduleKey}/tasks`, payload)
  return data
}

export async function fetchModuleTask(moduleKey: string, taskId: string) {
  const { data } = await apiClient.get<ModuleTaskResult>(`/modules/${moduleKey}/tasks/${taskId}`)
  return data
}

export async function fetchModuleHistory(moduleKey: string) {
  const { data } = await apiClient.get<ModuleTaskResult[]>(`/modules/${moduleKey}/history`)
  return data
}

export async function fetchModuleSchema(moduleKey: string) {
  const { data } = await apiClient.get<ModuleTaskSchema>(`/modules/${moduleKey}/schema`)
  return data
}
