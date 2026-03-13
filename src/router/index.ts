import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ModuleAdminLayout from '@/layouts/ModuleAdminLayout.vue'
import LandingView from '@/views/LandingView.vue'
import CustomerCenterView from '@/views/CustomerCenterView.vue'
import ModuleWorkspaceView from '@/views/ModuleWorkspaceView.vue'
import StaticInfoView from '@/views/StaticInfoView.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import AdminUsersView from '@/views/admin/AdminUsersView.vue'
import AdminTasksView from '@/views/admin/AdminTasksView.vue'
import AdminModulesView from '@/views/admin/AdminModulesView.vue'
import ModuleOverview from '@/views/admin/module/ModuleOverview.vue'
import ModuleTasks from '@/views/admin/module/ModuleTasks.vue'
import ModuleUsers from '@/views/admin/module/ModuleUsers.vue'
import ModuleReports from '@/views/admin/module/ModuleReports.vue'
import ModuleSettings from '@/views/admin/module/ModuleSettings.vue'
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
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: AdminDashboard,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'users',
          name: 'admin-users',
          component: AdminUsersView,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'tasks',
          name: 'admin-tasks',
          component: AdminTasksView,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'modules',
          name: 'admin-modules',
          component: AdminModulesView,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'module/:moduleKey',
          component: ModuleAdminLayout,
          meta: { requiresAuth: true, requiresAdmin: true },
          children: [
            {
              path: '',
              name: 'module-admin-overview',
              component: ModuleOverview,
              meta: { requiresAuth: true, requiresAdmin: true },
            },
            {
              path: 'tasks',
              name: 'module-admin-tasks',
              component: ModuleTasks,
              meta: { requiresAuth: true, requiresAdmin: true },
            },
            {
              path: 'users',
              name: 'module-admin-users',
              component: ModuleUsers,
              meta: { requiresAuth: true, requiresAdmin: true },
            },
            {
              path: 'reports',
              name: 'module-admin-reports',
              component: ModuleReports,
              meta: { requiresAuth: true, requiresAdmin: true },
            },
            {
              path: 'settings',
              name: 'module-admin-settings',
              component: ModuleSettings,
              meta: { requiresAuth: true, requiresAdmin: true },
            },
          ],
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'landing' },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.hydrate()
  const homeRoute = auth.isAdmin ? { name: 'admin-dashboard' } : { name: 'customer' }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return homeRoute
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'customer' }
  }

  if (to.name === 'module-workspace') {
    const moduleKey = String(to.params.moduleKey ?? '')
    const enabled = auth.user?.enabledModules ?? []
    if (!enabled.includes(moduleKey)) {
      return homeRoute
    }
  }

  if (String(to.name ?? '').startsWith('module-admin-')) {
    const moduleKey = String(to.params.moduleKey ?? '')
    const enabled = auth.user?.enabledModules ?? []
    if (!enabled.includes(moduleKey)) {
      return { name: 'admin-modules' }
    }
  }

  return true
})
