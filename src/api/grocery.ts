import { apiClient } from './client'

export interface GroceryFeedOffer {
  platform: string
  itemName: string
  category: string
  displaySpec: string
  specWeightG: number
  price: number
  dealTag: string
  sourceTitle: string
  sourceLink: string
  capturedAt: string
  unitPrice500g: number
}

export interface GroceryPreference {
  ownerId: string
  budgetPerMeal: number
  familySize: number
  dietaryNotes: string
  updatedAt: string
}

export interface GroceryFreshnessCheck {
  checkId: string
  ownerId: string
  imageName: string
  freshnessScore: number
  freshnessLevel: string
  summary: string
  tips: string[]
  createdAt: string
}

export async function fetchGroceryDashboard() {
  const { data } = await apiClient.get('/grocery/dashboard')
  return data
}

export async function fetchGroceryPreference() {
  const { data } = await apiClient.get<GroceryPreference>('/grocery/preference')
  return data
}

export async function saveGroceryPreference(payload: Partial<Pick<GroceryPreference, 'budgetPerMeal' | 'familySize' | 'dietaryNotes'>>) {
  const { data } = await apiClient.post<GroceryPreference>('/grocery/preference', payload)
  return data
}

export async function compareGroceryPrices(payload: { items: string[] | string }) {
  const { data } = await apiClient.post('/grocery/price-compare', payload)
  return data
}

export async function recommendGroceryToday(payload: { budgetPerMeal?: number; familySize?: number }) {
  const { data } = await apiClient.post('/grocery/recommend-today', payload)
  return data
}

export async function generateGroceryWeeklyMenu(payload: { budgetPerMeal?: number; familySize?: number }) {
  const { data } = await apiClient.post('/grocery/weekly-menu', payload)
  return data
}

export async function fetchGroceryDeals() {
  const { data } = await apiClient.get<GroceryFeedOffer[]>('/grocery/deals')
  return data
}

export async function createGroceryFreshnessCheck(payload: { imageName: string; description?: string }) {
  const { data } = await apiClient.post<GroceryFreshnessCheck>('/grocery/freshness-check', payload)
  return data
}

export async function fetchGroceryFreshnessChecks() {
  const { data } = await apiClient.get<GroceryFreshnessCheck[]>('/grocery/freshness-checks')
  return data
}

export async function buildGroceryBudgetPlan(payload: { budgetPerMeal?: number; familySize?: number; mealsPerDay?: number }) {
  const { data } = await apiClient.post('/grocery/budget-plan', payload)
  return data
}
