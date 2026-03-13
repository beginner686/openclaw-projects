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
  { name: 'admin-module-factory', path: '/admin/module-factory', label: '模块生成器', icon: '🏗️' },
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
  --bg-base: #f3f6fb;
  --bg-panel: #ffffff;
  --bg-soft: #f8faff;
  --text-body: #1f2a44;
  --text-strong: #0f172a;
  --text-muted: #5f6b84;
  --brand: #d45132;
  --brand-deep: #b33e24;
  --line: #e5eaf3;

  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-body);
}

.admin-topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
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
  color: var(--text-muted);
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
  background: var(--bg-panel);
  border-right: 1px solid var(--line);
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
  color: var(--text-body);
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}

.menu-item:hover {
  background: var(--bg-soft);
  color: var(--brand);
}

.menu-item.active {
  background: rgba(212, 81, 50, 0.1);
  color: var(--brand);
  font-weight: 600;
  border-right: 3px solid var(--brand);
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>
