import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import LandingView from '@/views/LandingView.vue'
import CustomerCenterView from '@/views/CustomerCenterView.vue'
import ModuleWorkspaceView from '@/views/ModuleWorkspaceView.vue'
import StaticInfoView from '@/views/StaticInfoView.vue'
import { useAuthStore } from '@/stores/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView,
      meta: { guestOnly: false },
    },
    {
      path: '/app',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: { name: 'customer' },
        },
        {
          path: 'customer',
          name: 'customer',
          component: CustomerCenterView,
          meta: { requiresAuth: true },
        },
        {
          path: ':moduleKey',
          name: 'module-workspace',
          component: ModuleWorkspaceView,
          meta: { requiresAuth: true },
        },
        {
          path: 'help',
          name: 'help',
          component: StaticInfoView,
          meta: { requiresAuth: true, pageKey: 'help' },
        },
        {
          path: 'contact',
          name: 'contact',
          component: StaticInfoView,
          meta: { requiresAuth: true, pageKey: 'contact' },
        },
        {
          path: 'terms',
          name: 'terms',
          component: StaticInfoView,
          meta: { requiresAuth: true, pageKey: 'terms' },
        },
        {
          path: 'privacy',
          name: 'privacy',
          component: StaticInfoView,
          meta: { requiresAuth: true, pageKey: 'privacy' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'customer' },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.hydrate()

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'customer' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/',
      query: { redirect: to.fullPath },
    }
  }

  if (to.name === 'module-workspace') {
    const moduleKey = String(to.params.moduleKey ?? '')
    const enabled = auth.user?.enabledModules ?? []
    if (!enabled.includes(moduleKey)) {
      return { name: 'customer' }
    }
  }

  return true
})
