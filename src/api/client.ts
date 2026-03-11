import axios from 'axios'
import { readAccessToken } from '@/utils/session'

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

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
    const wrapped = Object.assign(new Error(message), {
      code,
      status: Number(error.response?.status ?? 0),
    })
    return Promise.reject(wrapped)
  },
)
