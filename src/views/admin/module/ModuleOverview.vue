<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchModuleOverview, fetchModuleWorkbench } from '@/api/admin'
import type { AdminModuleOverview, ModuleWorkbench } from '@/api/admin'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const data = ref<AdminModuleOverview | null>(null)
const workbench = ref<ModuleWorkbench | null>(null)

async function load() {
  loading.value = true
  try {
    const moduleKey = String(route.params.moduleKey ?? '')
    const [overview, wb] = await Promise.all([
      fetchModuleOverview(moduleKey),
      fetchModuleWorkbench(moduleKey),
    ])
    data.value = overview
    workbench.value = wb
  } finally {
    loading.value = false
  }
}

watch(() => route.params.moduleKey, load)
onMounted(load)

function formatTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '-'
}

function statusTagType(status: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'review') return 'warning'
  if (status === 'running') return 'primary'
  return 'info'
}

function featureTagType(status: string) {
  if (status === 'healthy') return 'success'
  if (status === 'running') return 'warning'
  if (status === 'attention') return 'danger'
  return 'info'
}

function kpiTagType(level: string) {
  if (level === 'good') return 'success'
  if (level === 'warning') return 'danger'
  return 'info'
}

function goFeature(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="module-overview">
    <div v-if="loading">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else-if="data">
      <div class="module-hero">
        <span class="module-icon">{{ data.module?.icon }}</span>
        <div>
          <h1 class="module-title">{{ data.module?.name }}</h1>
          <p class="module-desc">{{ data.module?.description ?? data.module?.name }}</p>
          <p v-if="workbench" class="module-unique">{{ workbench.projectName }}：{{ workbench.uniqueValue }}</p>
        </div>
      </div>

      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-val">{{ data.stat.total }}</div>
          <div class="stat-lbl">总任务数</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ data.stat.review }}</div>
          <div class="stat-lbl">待审核</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ data.stat.completed }}</div>
          <div class="stat-lbl">已完成</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ data.stat.successRate }}%</div>
          <div class="stat-lbl">成功率</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ data.activeUsers }}</div>
          <div class="stat-lbl">开通用户数</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ data.stat.running + data.stat.queued }}</div>
          <div class="stat-lbl">执行中</div>
        </div>
      </div>

      <div v-if="workbench" class="panel">
        <h2 class="panel-title">子后台功能导航</h2>
        <div class="feature-grid">
          <article v-for="item in workbench.featureMenus" :key="item.key" class="feature-card">
            <div class="feature-head">
              <h3>{{ item.name }}</h3>
              <el-tag size="small" :type="featureTagType(item.status) as any">{{ item.status }}</el-tag>
            </div>
            <p class="feature-desc">{{ item.description }}</p>
            <div class="feature-metrics">
              <span>任务 {{ item.taskCount }}</span>
              <span>待处理 {{ item.pendingCount }}</span>
              <span>成功率 {{ item.successRate }}%</span>
            </div>
            <div class="feature-foot">
              <span>最近更新：{{ formatTime(item.lastUpdatedAt) }}</span>
              <el-button type="primary" size="small" @click="goFeature(item.targetPath)">查看数据</el-button>
            </div>
          </article>
        </div>
      </div>

      <div v-if="workbench" class="panel">
        <h2 class="panel-title">专属指标看板</h2>
        <div class="kpi-grid">
          <article v-for="kpi in workbench.kpiCards" :key="kpi.key" class="kpi-card">
            <div class="kpi-head">
              <span class="kpi-label">{{ kpi.label }}</span>
              <el-tag size="small" :type="kpiTagType(kpi.level) as any">{{ kpi.level }}</el-tag>
            </div>
            <div class="kpi-value">
              <strong>{{ kpi.value }}</strong>
              <small>{{ kpi.unit }}</small>
            </div>
            <div class="kpi-meta">
              <span>目标：{{ kpi.target ?? '-' }}{{ kpi.unit }}</span>
              <span>偏差：{{ kpi.delta > 0 ? '+' : '' }}{{ kpi.delta }}</span>
            </div>
            <p class="kpi-desc">{{ kpi.description }}</p>
          </article>
        </div>
      </div>

      <div v-if="workbench" class="panel">
        <h2 class="panel-title">模块独有能力分析</h2>
        <ul class="insight-list">
          <li v-for="(item, index) in workbench.insights" :key="`${index}-${item}`">{{ item }}</li>
        </ul>
      </div>

      <div class="panel">
        <h2 class="panel-title">最近任务</h2>
        <el-table :data="data.recentTasks" size="small">
          <el-table-column label="任务ID" width="130">
            <template #default="{ row }">
              <span class="mono">{{ row.taskId?.slice(0, 16) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="场景" prop="scenario" min-width="150" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status) as any" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="170">
            <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <el-empty v-else description="模块数据不存在" />
  </div>
</template>

<style scoped>
.module-overview {
  max-width: 1140px;
  display: grid;
  gap: 16px;
}

.module-hero {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f7faff 100%);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 12px;
  padding: 16px;
}

.module-icon {
  font-size: 2.1rem;
  line-height: 1;
}

.module-title {
  margin: 0 0 4px;
  font-size: 1.25rem;
  color: var(--text-strong, #222);
}

.module-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted, #888);
}

.module-unique {
  margin: 8px 0 0;
  color: #334155;
  font-size: 0.86rem;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.stat-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 10px;
  padding: 16px 12px;
  text-align: center;
}

.stat-val {
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--brand-deep, #c03020);
}

.stat-lbl {
  font-size: 0.82rem;
  color: var(--text-muted, #888);
  margin-top: 4px;
}

.panel {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 10px;
  padding: 16px;
}

.panel-title {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #1e293b;
}

.feature-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.feature-card {
  border: 1px solid #e6ebf3;
  border-radius: 10px;
  padding: 12px;
  display: grid;
  gap: 8px;
  background: #fcfdff;
}

.feature-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.feature-head h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #1f2a44;
}

.feature-desc {
  margin: 0;
  color: #64748b;
  font-size: 0.82rem;
  min-height: 32px;
}

.feature-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #334155;
  font-size: 0.8rem;
}

.feature-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #64748b;
  font-size: 0.78rem;
}

.kpi-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.kpi-card {
  border: 1px solid #e6ebf3;
  border-radius: 10px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.kpi-label {
  color: #334155;
  font-size: 0.9rem;
}

.kpi-value strong {
  font-size: 1.5rem;
  line-height: 1;
  color: #0f172a;
}

.kpi-value small {
  margin-left: 6px;
  color: #64748b;
}

.kpi-meta {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 0.8rem;
}

.kpi-desc {
  margin: 0;
  color: #64748b;
  font-size: 0.8rem;
  min-height: 30px;
}

.insight-list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
  display: grid;
  gap: 6px;
}

.mono {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-muted, #888);
}

@media (max-width: 720px) {
  .feature-foot {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
