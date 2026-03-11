<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { ArrowDown, Menu } from '@element-plus/icons-vue'
import { iconMap } from '@/config/icons'
import { useAuthStore } from '@/stores/auth'
import { useModuleStore } from '@/stores/module'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const moduleStore = useModuleStore()

const mobileDrawer = ref(false)

const groupedModules = computed(() => ({
  enterprise: moduleStore.filteredModules.filter((item) => item.category === 'enterprise'),
  personal: moduleStore.filteredModules.filter((item) => item.category === 'personal'),
}))

const categoryLabel = {
  enterprise: '企业服务',
  personal: '个人服务',
} as const

const userName = computed(() => auth.user?.name ?? '未登录用户')

function toCustomer() {
  void router.push({ name: 'customer' })
}

function toInfo(name: 'help' | 'contact' | 'terms' | 'privacy') {
  void router.push({ name })
}

function isModuleActive(moduleKey: string) {
  return route.name === 'module-workspace' && String(route.params.moduleKey) === moduleKey
}

function openModule(moduleKey: string) {
  mobileDrawer.value = false
  void router.push({ name: 'module-workspace', params: { moduleKey } })
}

function resolveModuleIcon(name: string): Component {
  return (iconMap as Record<string, Component>)[name] ?? iconMap.Grid
}

async function onLogout() {
  await auth.logout()
  void router.push({ path: '/', query: { auth: 'login' } })
}

watch(
  () => route.fullPath,
  () => {
    mobileDrawer.value = false
  },
)
</script>

<template>
  <div class="shell-root">
    <header class="top-nav card-panel">
      <div class="brand-wrap">
        <button class="mobile-menu-btn" type="button" @click="mobileDrawer = true">
          <el-icon><Menu /></el-icon>
        </button>
        <div class="brand-mark">OC</div>
        <div>
          <h1 class="brand-title">ClawPilot</h1>
          <p class="brand-subtitle">统一前台 · 15 个业务场景 · 全端响应式</p>
        </div>
      </div>

      <nav class="top-links">
        <button type="button" class="link-btn" @click="toCustomer">客户中心</button>
        <button type="button" class="link-btn" @click="toInfo('help')">帮助中心</button>
        <button type="button" class="link-btn" @click="toInfo('contact')">联系我们</button>
      </nav>

      <el-dropdown trigger="click">
        <span class="user-anchor">
          {{ userName }}
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="toCustomer">客户中心</el-dropdown-item>
            <el-dropdown-item @click="toInfo('privacy')">隐私政策</el-dropdown-item>
            <el-dropdown-item divided @click="onLogout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>

    <div class="workspace-wrap">
      <aside class="side-nav card-panel">
        <div class="side-head">
          <h2>业务中心</h2>
          <el-segmented
            :model-value="moduleStore.category"
            :options="[
              { label: '全部', value: 'all' },
              { label: '企业', value: 'enterprise' },
              { label: '个人', value: 'personal' },
            ]"
            size="small"
            @change="moduleStore.setCategory($event as 'all' | 'enterprise' | 'personal')"
          />
        </div>

        <el-input
          placeholder="搜索业务名称"
          :model-value="moduleStore.searchText"
          clearable
          @update:model-value="moduleStore.setSearchText($event)"
        />

        <div class="module-group" v-for="(items, key) in groupedModules" :key="key">
          <h3>{{ categoryLabel[key as 'enterprise' | 'personal'] }} ({{ items.length }})</h3>
          <button
            v-for="item in items"
            :key="item.moduleKey"
            type="button"
            class="module-item"
            :class="{ active: isModuleActive(item.moduleKey) }"
            @click="openModule(item.moduleKey)"
          >
            <el-icon><component :is="resolveModuleIcon(item.icon)" /></el-icon>
            <span>{{ item.name }}</span>
          </button>
        </div>
      </aside>

      <main class="content-wrap">
        <Transition name="fade-rise" mode="out-in">
          <RouterView />
        </Transition>
      </main>
    </div>

    <footer class="bottom-bar card-panel">
      <p>© 2026 ClawPilot</p>
      <div class="footer-links">
        <button type="button" @click="toInfo('terms')">服务条款</button>
        <button type="button" @click="toInfo('privacy')">隐私政策</button>
        <button type="button" @click="toInfo('contact')">客服支持</button>
      </div>
    </footer>

    <el-drawer v-model="mobileDrawer" title="业务菜单" direction="ltr" size="80%">
      <div class="mobile-menu">
        <div class="module-group" v-for="(items, key) in groupedModules" :key="`mobile-${key}`">
          <h3>{{ categoryLabel[key as 'enterprise' | 'personal'] }}</h3>
          <button
            v-for="item in items"
            :key="`mobile-${item.moduleKey}`"
            type="button"
            class="module-item"
            :class="{ active: isModuleActive(item.moduleKey) }"
            @click="openModule(item.moduleKey)"
          >
            <el-icon><component :is="resolveModuleIcon(item.icon)" /></el-icon>
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.shell-root {
  min-height: 100vh;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.top-nav {
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  align-items: center;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.mobile-menu-btn {
  display: none;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg-panel);
  cursor: pointer;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
  color: #fff;
  font-weight: 700;
}

.brand-title {
  margin: 0;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.top-links {
  display: flex;
  gap: 8px;
}

.link-btn {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.86rem;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}

.link-btn:hover {
  color: var(--text-strong);
  border-color: var(--line);
  background: var(--bg-soft);
}

.user-anchor {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid var(--line);
  padding: 8px 12px;
  cursor: pointer;
}

.workspace-wrap {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 14px;
  min-height: 0;
}

.side-nav {
  padding: 12px;
  display: grid;
  align-content: start;
  gap: 12px;
  max-height: calc(100vh - 186px);
  overflow: auto;
}

.side-head {
  display: grid;
  gap: 10px;
}

.side-head h2 {
  margin: 0;
  font-size: 1rem;
}

.module-group {
  display: grid;
  gap: 8px;
}

.module-group h3 {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.module-item {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.module-item:hover {
  transform: translateY(-1px);
  border-color: var(--brand);
}

.module-item.active {
  border-color: var(--brand);
  background: linear-gradient(120deg, rgba(31, 95, 244, 0.12), rgba(31, 95, 244, 0.02));
  box-shadow: inset 0 0 0 1px rgba(31, 95, 244, 0.2);
}

.content-wrap {
  min-width: 0;
}

.bottom-bar {
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.bottom-bar p {
  margin: 0;
}

.footer-links {
  display: flex;
  gap: 8px;
}

.footer-links button {
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  border-radius: 8px;
  cursor: pointer;
  padding: 4px 8px;
}

.footer-links button:hover {
  border-color: var(--line);
}

.mobile-menu {
  display: grid;
  gap: 12px;
}

@media (max-width: 1080px) {
  .top-links {
    display: none;
  }

  .workspace-wrap {
    grid-template-columns: 1fr;
  }

  .side-nav {
    display: none;
  }

  .mobile-menu-btn {
    display: grid;
    place-items: center;
  }
}

@media (max-width: 720px) {
  .shell-root {
    padding: 10px;
  }

  .top-nav {
    grid-template-columns: 1fr auto;
  }

  .brand-subtitle {
    display: none;
  }
}
</style>
