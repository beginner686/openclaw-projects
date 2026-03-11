import { apiClient } from './client'
import type { CustomerDashboardData } from '@/types/domain'

export async function fetchCustomerDashboard() {
  const { data } = await apiClient.get<CustomerDashboardData>('/customer/dashboard')
  return data
}
