import type { AuthUser } from '@/types/domain'

const LOCAL_SESSION_KEY = 'openclaw.local.session'
const TEMP_SESSION_KEY = 'openclaw.temp.session'

interface StoredSession {
  token: string
  user: AuthUser
}

function safeParse(input: string | null): StoredSession | null {
  if (!input) return null
  try {
    const parsed = JSON.parse(input) as StoredSession
    if (parsed.token && parsed.user?.id) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function readStoredSession() {
  const localData = safeParse(localStorage.getItem(LOCAL_SESSION_KEY))
  if (localData) {
    return { ...localData, remember: true }
  }

  const tempData = safeParse(sessionStorage.getItem(TEMP_SESSION_KEY))
  if (tempData) {
    return { ...tempData, remember: false }
  }

  return null
}

export function saveSession(payload: StoredSession, remember: boolean) {
  clearSession()
  const target = remember ? localStorage : sessionStorage
  target.setItem(remember ? LOCAL_SESSION_KEY : TEMP_SESSION_KEY, JSON.stringify(payload))
}

export function clearSession() {
  localStorage.removeItem(LOCAL_SESSION_KEY)
  sessionStorage.removeItem(TEMP_SESSION_KEY)
}

export function readAccessToken(): string {
  return readStoredSession()?.token ?? ''
}
