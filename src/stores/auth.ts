import { defineStore } from 'pinia'
import { loginRequest, logoutRequest, profileRequest, registerRequest, type LoginPayload, type RegisterPayload } from '@/api/auth'
import type { AuthUser } from '@/types/domain'
import { clearSession, readStoredSession, saveSession } from '@/utils/session'

interface AuthState {
  token: string
  user: AuthUser | null
  hydrated: boolean
  remember: boolean
}

const legacyModuleKeyMap: Record<string, string> = {
  'matchmaking-ai': 'matchmaking-assistant',
  'job-lead-capture': 'job-lead-automation',
  'content-auto-publishing': 'content-generation-publisher',
}

function normalizeUserModules(user: AuthUser) {
  const enabled = new Set(
    (user.enabledModules ?? [])
      .map((item) => {
        const normalized = String(item).trim()
        return legacyModuleKeyMap[normalized] ?? normalized
      })
      .filter(Boolean),
  )
  return {
    ...user,
    enabledModules: [...enabled],
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: '',
    user: null,
    hydrated: false,
    remember: true,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    hydrate() {
      if (this.hydrated) {
        return
      }

      const stored = readStoredSession()
      if (stored) {
        this.token = stored.token
        this.user = normalizeUserModules(stored.user)
        this.remember = stored.remember
        saveSession({ token: this.token, user: this.user }, this.remember)
      }

      this.hydrated = true
    },

    async login(payload: LoginPayload) {
      const result = await loginRequest(payload)
      this.token = result.token
      this.user = normalizeUserModules(result.user)
      this.remember = payload.remember
      this.hydrated = true
      saveSession({ token: result.token, user: this.user }, payload.remember)
    },

    async register(payload: RegisterPayload) {
      const result = await registerRequest(payload)
      this.token = result.token
      this.user = normalizeUserModules(result.user)
      this.remember = true
      this.hydrated = true
      saveSession({ token: result.token, user: this.user }, true)
    },

    async refreshProfile() {
      if (!this.token) {
        return
      }

      const profile = await profileRequest()
      this.user = normalizeUserModules(profile)
      saveSession({ token: this.token, user: this.user }, this.remember)
    },

    async logout() {
      if (this.token) {
        try {
          await logoutRequest()
        } catch {
          // Ignore mock or network edge errors during logout.
        }
      }

      this.token = ''
      this.user = null
      this.remember = true
      this.hydrated = true
      clearSession()
    },
  },
})
