import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    pageKey?: 'help' | 'contact' | 'terms' | 'privacy'
  }
}
