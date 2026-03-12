<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchModuleOverview } from '@/api/admin'
import type { AdminModuleOverview } from '@/api/admin'

const route = useRoute()
const loading = ref(true)
const data = ref<AdminModuleOverview | null>(null)

async function load() {
  loading.value = true
  try {
    data.value = await fetchModuleOverview(String(route.params.moduleKey ?? ''))
  } finally {
    loading.value = false
  }
}

watch(() => route.params.moduleKey, load)
onMounted(load)

function formatTime(iso: string) {
  return iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '-'
}

function statusTagType(status: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'review') return 'warning'
  if (status === 'running') return 'primary'
  return 'info'
}
</script>

<template>
  <div class="module-overview">
    <div v-if="loading">
      <el-skeleton :rows="6" animated />
    </div>

    <template v-else-if="data">
      <div class="module-hero">
        <span class="module-icon">{{ data.module?.icon }}</span>
        <div>
          <h1 class="module-title">{{ data.module?.name }}</h1>
          <p class="module-desc">{{ data.module?.description ?? data.module?.name }}</p>
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
  max-width: 960px;
}

.module-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.module-icon {
  font-size: 2.1rem;
}

.module-title {
  margin: 0 0 4px;
  font-size: 1.25rem;
  color: var(--text-strong, #222);
}

.module-desc {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted, #888);
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 10px;
  padding: 18px 16px;
  text-align: center;
}

.stat-val {
  font-size: 1.55rem;
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
  padding: 18px;
}

.panel-title {
  margin: 0 0 14px;
  font-size: 1rem;
}

.mono {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-muted, #888);
}
</style>
