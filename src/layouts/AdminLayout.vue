<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: 'admin-dashboard', path: '/admin', label: '仪表盘', icon: '📊' },
  { name: 'admin-users', path: '/admin/users', label: '用户管理', icon: '👥' },
  { name: 'admin-tasks', path: '/admin/tasks', label: '任务中心', icon: '🧭' },
  { name: 'admin-modules', path: '/admin/modules', label: '模块中心', icon: '🧩' },
]

const activeMenu = computed(() => String(route.name ?? ''))

async function logout() {
  await auth.logout()
  ElMessage.success('已退出登录')
  await router.push({ path: '/', query: { auth: 'login' } })
}
</script>

<template>
  <div class="admin-shell">
    <header class="admin-topbar">
      <div class="topbar-brand">
        <span class="brand-icon">🦞</span>
        <span class="brand-name">小龙虾统一后台</span>
      </div>

      <div class="topbar-actions">
        <RouterLink to="/app/customer" class="back-link">返回前台</RouterLink>

        <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'logout' && logout()">
          <span class="user-btn">{{ auth.user?.name ?? '管理员' }} ▾</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="admin-body">
      <nav class="admin-sidebar">
        <ul class="menu-list">
          <li v-for="item in menuItems" :key="item.name">
            <RouterLink :to="item.path" class="menu-item" :class="{ active: activeMenu === item.name }">
              <span class="menu-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-base, #f5f7fa);
}

.admin-topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--bg-panel, #fff);
  border-bottom: 1px solid var(--line, #e8eaed);
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.05rem;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.back-link {
  font-size: 0.88rem;
  color: var(--text-muted, #666);
  text-decoration: none;
}

.user-btn {
  cursor: pointer;
  font-size: 0.9rem;
}

.admin-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-panel, #fff);
  border-right: 1px solid var(--line, #e8eaed);
  padding: 16px 0;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  color: var(--text-body, #444);
  text-decoration: none;
}

.menu-item.active {
  background: rgba(224, 48, 32, 0.08);
  color: var(--brand, #e03020);
  font-weight: 600;
  border-right: 3px solid var(--brand, #e03020);
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
