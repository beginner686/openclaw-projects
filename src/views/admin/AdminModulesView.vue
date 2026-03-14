<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminStats } from '@/api/admin'
import type { ModuleRankItem } from '@/api/admin'
import { iconMap, type IconName } from '@/config/icons'

const router = useRouter()
const loading = ref(true)
const modules = ref<ModuleRankItem[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const stats = await fetchAdminStats()
    modules.value = stats.moduleRanking
  } finally {
    loading.value = false
  }
})

const categoryGroups = computed(() => {
  const enterprise = modules.value.filter((item) => item.category === 'enterprise')
  const personal = modules.value.filter((item) => item.category === 'personal')

  return [
    {
      key: 'enterprise',
      label: '企业服务',
      desc: '面向企业客户的自动化执行与运营协同模块。',
      tagType: 'warning' as const,
      modules: enterprise,
    },
    {
      key: 'personal',
      label: '个人服务',
      desc: '面向个人用户的效率与风险防护模块。',
      tagType: 'success' as const,
      modules: personal,
    },
  ].filter((group) => group.modules.length > 0)
})

const totalTasks = computed(() => modules.value.reduce((sum, item) => sum + item.total, 0))
const totalReview = computed(() => modules.value.reduce((sum, item) => sum + item.review, 0))
const totalRunning = computed(() => modules.value.reduce((sum, item) => sum + item.running + item.queued, 0))

function resolveIcon(name: string) {
  const key = String(name || 'Grid') as IconName
  return iconMap[key] ?? iconMap.Grid
}

function completionRate(item: ModuleRankItem) {
  if (item.total <= 0) return 0
  return Math.min(100, Math.round((item.completed / item.total) * 100))
}

function activeTasks(item: ModuleRankItem) {
  return item.running + item.queued
}
</script>

<template>
  <div class="admin-modules">
    <header class="hero">
      <div>
        <h1 class="page-title">模块中心</h1>
        <p class="page-desc">按业务分区管理子后台模块，查看模块健康度并快速进入对应后台。</p>
        <div class="hero-actions">
          <el-button type="primary" @click="router.push('/admin/module-factory')">新增子模块后台</el-button>
        </div>
      </div>

      <div class="hero-stats">
        <div class="stat-pill">
          <span>模块总数</span>
          <strong>{{ modules.length }}</strong>
        </div>
        <div class="stat-pill">
          <span>总任务</span>
          <strong>{{ totalTasks }}</strong>
        </div>
        <div class="stat-pill">
          <span>待审核</span>
          <strong>{{ totalReview }}</strong>
        </div>
        <div class="stat-pill">
          <span>执行中</span>
          <strong>{{ totalRunning }}</strong>
        </div>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="10" animated />
    </div>

    <template v-else>
      <section v-for="group in categoryGroups" :key="group.key" class="category-panel">
        <div class="panel-head">
          <div>
            <h2>{{ group.label }}</h2>
            <p>{{ group.desc }}</p>
          </div>
          <el-tag :type="group.tagType">{{ group.modules.length }} 个模块</el-tag>
        </div>

        <div class="module-grid">
          <article v-for="m in group.modules" :key="m.moduleKey" class="module-card">
            <div class="card-head">
              <div class="icon-wrap">
                <component :is="resolveIcon(m.icon)" class="module-icon" />
              </div>

              <div class="title-wrap">
                <h3 class="module-name">{{ m.name }}</h3>
                <p class="module-key">{{ m.moduleKey }}</p>
              </div>

              <el-tag size="small" :type="group.tagType">{{ group.label }}</el-tag>
            </div>

            <div class="metric-row">
              <div class="metric-item">
                <strong>{{ m.total }}</strong>
                <span>总任务</span>
              </div>
              <div class="metric-item">
                <strong>{{ m.review }}</strong>
                <span>待审核</span>
              </div>
              <div class="metric-item">
                <strong>{{ activeTasks(m) }}</strong>
                <span>执行中</span>
              </div>
              <div class="metric-item">
                <strong>{{ m.completed }}</strong>
                <span>已完成</span>
              </div>
            </div>

            <div class="progress-row">
              <span>完成率 {{ completionRate(m) }}%</span>
              <div class="progress-track">
                <span :style="{ width: `${completionRate(m)}%` }"></span>
              </div>
            </div>

            <div class="actions">
              <el-button type="primary" @click="router.push(`/admin/module/${m.moduleKey}`)">进入子后台</el-button>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-modules {
  width: 100%;
  padding-bottom: 20px;
  display: grid;
  gap: 18px;
}

.hero {
  display: grid;
  gap: 14px;
  grid-template-columns: 1.3fr 1fr;
  background: linear-gradient(135deg, #ffffff 0%, #f7faff 100%);
  border: 1px solid var(--line, #e5eaf3);
  border-radius: 16px;
  padding: 18px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-strong, #111827);
}

.page-desc {
  margin: 6px 0 0;
  color: var(--text-muted, #6b7280);
  font-size: 0.92rem;
}

.hero-actions {
  margin-top: 10px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 10px;
}

.stat-pill {
  border: 1px solid var(--line, #e5eaf3);
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.stat-pill span {
  color: var(--text-muted, #6b7280);
  font-size: 0.8rem;
}

.stat-pill strong {
  color: var(--brand-deep, #b33e24);
  font-size: 1.25rem;
  line-height: 1;
}

.loading-state {
  padding: 14px;
  background: #fff;
  border: 1px solid var(--line, #e5eaf3);
  border-radius: 14px;
}

.category-panel {
  border: 1px solid var(--line, #e5eaf3);
  border-radius: 16px;
  background: #fff;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.panel-head h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-strong, #111827);
}

.panel-head p {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: var(--text-muted, #6b7280);
}

.module-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.module-card {
  border: 1px solid var(--line, #e5eaf3);
  border-radius: 14px;
  padding: 12px;
  display: grid;
  gap: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.module-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(17, 24, 39, 0.08);
}

.card-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #f3f7ff;
  border: 1px solid #dbe7ff;
}

.module-icon {
  width: 18px;
  height: 18px;
  color: #3b82f6;
}

.module-name {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-strong, #111827);
}

.module-key {
  margin: 3px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.73rem;
  color: #8a94a8;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 8px;
  border-radius: 10px;
  background: #f8fbff;
  border: 1px solid #e7eef9;
}

.metric-item {
  text-align: center;
  display: grid;
  gap: 2px;
}

.metric-item strong {
  color: #1f2a44;
  font-size: 1rem;
  line-height: 1;
}

.metric-item span {
  color: #6b7280;
  font-size: 0.74rem;
}

.progress-row {
  display: grid;
  gap: 6px;
}

.progress-row span {
  font-size: 0.78rem;
  color: #5f6b84;
}

.progress-track {
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: #eaf1fb;
  overflow: hidden;
}

.progress-track > span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #ef4444 45%, #3b82f6 100%);
}

.actions :deep(.el-button) {
  width: 100%;
  height: 34px;
  border-radius: 9px;
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .module-grid {
    grid-template-columns: 1fr;
  }

  .metric-row {
    grid-template-columns: repeat(2, 1fr);
    row-gap: 10px;
  }
}
</style>
