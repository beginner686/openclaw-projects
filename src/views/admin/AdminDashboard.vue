<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminStats } from '@/api/admin'
import type { AdminStats } from '@/api/admin'

const router = useRouter()
const loading = ref(true)
const stats = ref<AdminStats | null>(null)

onMounted(async () => {
  try {
    stats.value = await fetchAdminStats()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <h1 class="page-title">仪表盘</h1>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else-if="stats">
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🧭</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.totalTasks }}</div>
            <div class="stat-label">总任务数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.completedTasks }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.pendingReviewTasks }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.successRate }}%</div>
            <div class="stat-label">成功率</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.runningTasks }}</div>
            <div class="stat-label">执行中</div>
          </div>
        </div>
      </div>

      <section class="panel">
        <div class="panel-header">
          <h2>模块使用排行</h2>
          <button class="link-btn" @click="router.push('/admin/modules')">查看全部 →</button>
        </div>
        <el-table :data="stats.moduleRanking.slice(0, 8)" size="small">
          <el-table-column label="模块名称" prop="name" min-width="170" />
          <el-table-column label="分类" prop="category" width="100" />
          <el-table-column label="总任务" prop="total" width="90" align="right" />
          <el-table-column label="待审核" prop="review" width="90" align="right" />
          <el-table-column label="已完成" prop="completed" width="90" align="right" />
          <el-table-column label="失败" prop="failed" width="80" align="right" />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button size="small" text @click="router.push(`/admin/module/${row.moduleKey}`)">进入</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>

    <el-empty v-else description="暂无数据" />
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1120px;
}

.page-title {
  margin: 0 0 24px;
  font-size: 1.4rem;
  color: var(--text-strong, #222);
}

.loading-state {
  padding: 20px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.stat-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 12px;
  padding: 20px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  font-size: 1.8rem;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--brand-deep, #c03020);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted, #888);
  margin-top: 2px;
}

.panel {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 12px;
  padding: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
}

.link-btn {
  background: none;
  border: none;
  color: var(--brand, #e03020);
  font-size: 0.88rem;
  cursor: pointer;
  padding: 0;
}
</style>
