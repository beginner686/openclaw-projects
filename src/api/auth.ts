import { apiClient } from './client'
import type { ApiMessage, AuthResponse, AuthUser } from '@/types/domain'

export interface LoginPayload {
  account: string
  password: string
  remember: boolean
}

export interface RegisterPayload {
  name: string
  contact: string
  password: string
  role?: 'customer' | 'admin'
}

export async function loginRequest(payload: LoginPayload) {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function registerRequest(payload: RegisterPayload) {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function profileRequest() {
  const { data } = await apiClient.get<AuthUser>('/auth/profile')
  return data
}

export async function logoutRequest() {
  const { data } = await apiClient.post<ApiMessage>('/auth/logout')
  return data
}
