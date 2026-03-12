import { defineStore } from 'pinia'
import { loginRequest, logoutRequest, profileRequest, registerRequest, type LoginPayload, type RegisterPayload } from '@/api/auth'
import type { AuthUser } from '@/types/domain'
import { moduleCatalog } from '@/config/modules'
import { clearSession, readStoredSession, saveSession } from '@/utils/session'

interface AuthState {
  token: string
  user: AuthUser | null
  hydrated: boolean
  remember: boolean
}

function normalizeUserModules(user: AuthUser) {
  const allKeys = moduleCatalog.map((item) => item.moduleKey)
  const enabled = new Set(user.enabledModules)
  for (const key of allKeys) {
    enabled.add(key)
  }
  return {
    ...user,
    enabledModules: allKeys.filter((key) => enabled.has(key)),
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
