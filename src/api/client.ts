import axios from 'axios'
import { clearSession, readAccessToken } from '@/utils/session'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

let authRedirecting = false

apiClient.interceptors.request.use((config) => {
  const token = readAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error.response?.data?.code ?? 'API_REQUEST_FAILED'
    const message = error.response?.data?.message ?? error.message ?? '请求失败，请稍后再试。'
    const status = Number(error.response?.status ?? 0)
    const requestUrl = String(error.config?.url ?? '')

    if (status === 401 && !requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/register')) {
      clearSession()
      if (typeof window !== 'undefined' && !authRedirecting) {
        authRedirecting = true
        const currentPath = window.location.pathname + window.location.search
        const query = new URLSearchParams({ auth: 'login' })
        if (currentPath && currentPath !== '/') {
          query.set('redirect', currentPath)
        }
        window.location.assign(`/?${query.toString()}`)
      }
    }

    const wrapped = Object.assign(new Error(message), {
      code,
      status,
    })
    return Promise.reject(wrapped)
  },
)