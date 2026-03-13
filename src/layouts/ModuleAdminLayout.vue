<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { fetchModuleOverview } from '@/api/admin'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const moduleKey = computed(() => String(route.params.moduleKey ?? ''))
const moduleName = ref('')

onMounted(async () => {
  try {
    const data = await fetchModuleOverview(moduleKey.value)
    moduleName.value = data.module?.name ?? moduleKey.value
  } catch {
    moduleName.value = moduleKey.value
  }
})

const subMenuItems = computed(() => [
  { name: 'module-admin-overview', path: `/admin/module/${moduleKey.value}`, label: '概览', icon: '📊' },
  { name: 'module-admin-tasks', path: `/admin/module/${moduleKey.value}/tasks`, label: '任务列表', icon: '🧭' },
  { name: 'module-admin-users', path: `/admin/module/${moduleKey.value}/users`, label: '用户列表', icon: '👥' },
  { name: 'module-admin-reports', path: `/admin/module/${moduleKey.value}/reports`, label: '报告列表', icon: '🗂️' },
  { name: 'module-admin-settings', path: `/admin/module/${moduleKey.value}/settings`, label: '设置', icon: '⚙️' },
])

const activeMenu = computed(() => String(route.name ?? ''))
</script>

<template>
  <div class="module-admin-shell">
    <header class="module-topbar">
      <div class="topbar-left">
        <button class="back-btn" @click="router.push('/admin/modules')">← 返回模块中心</button>
        <span class="module-title">{{ moduleName || moduleKey }}</span>
      </div>
      <div class="topbar-actions">
        <span class="user-label">{{ auth.user?.name ?? '管理员' }}</span>
      </div>
    </header>

    <div class="module-body">
      <nav class="module-sidebar">
        <ul class="menu-list">
          <li v-for="item in subMenuItems" :key="item.name">
            <RouterLink :to="item.path" class="menu-item" :class="{ active: activeMenu === item.name }">
              <span class="menu-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <main class="module-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.module-admin-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--bg-base, #f5f7fa);
}

.module-topbar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(224, 48, 32, 0.05);
  border-bottom: 1px solid var(--line, #e8eaed);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: none;
  border: 1px solid var(--line, #e0e0e0);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text-body, #444);
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-base, #f5f5f5);
  border-color: var(--brand, #e03020);
  color: var(--brand, #e03020);
}

.module-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--brand-deep, #c03020);
}

.topbar-actions {
  font-size: 0.88rem;
  color: var(--text-muted, #888);
}

.module-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.module-sidebar {
  width: 180px;
  flex-shrink: 0;
  background: var(--bg-panel, #fff);
  border-right: 1px solid var(--line, #e8eaed);
  padding: 12px 0;
  overflow-y: auto;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  color: var(--text-body, #444);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.menu-item:hover {
  background: var(--bg-base, #f8f9fa);
  color: var(--brand, #e03020);
}

.menu-item.active {
  background: rgba(224, 48, 32, 0.08);
  color: var(--brand, #e03020);
  font-weight: 600;
  border-right: 3px solid var(--brand, #e03020);
}

.menu-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.module-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
</style>
