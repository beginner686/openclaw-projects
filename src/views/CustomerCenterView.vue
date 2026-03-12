<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { moduleMap } from '@/config/modules'
import { fetchCustomerDashboard } from '@/api/customer'
import { useAuthStore } from '@/stores/auth'
import type { CustomerDashboardData } from '@/types/domain'

const auth = useAuthStore()
const loading = ref(true)
const errorText = ref('')
const dashboard = ref<CustomerDashboardData | null>(null)

const openedModuleCount = computed(() => dashboard.value?.openedModules.length ?? 0)
const runningTaskCount = computed(
  () => dashboard.value?.recentTasks.filter((item) => item.status === 'running' || item.status === 'queued').length ?? 0,
)

const openedModules = computed(() =>
  (dashboard.value?.openedModules ?? [])
    .map((moduleKey) => moduleMap.get(moduleKey))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)),
)

async function loadDashboard() {
  loading.value = true
  errorText.value = ''
  try {
    dashboard.value = await fetchCustomerDashboard()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载失败，请稍后重试。'
    ElMessage.error(errorText.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <section class="page-container customer-page">
    <header class="card-panel page-head">
      <div>
        <h2 class="section-title">客户中心</h2>
        <p class="section-subtitle">
          欢迎回来，{{ auth.user?.name }}。这里展示已开通业务、最近任务与报告入口。
        </p>
      </div>
      <el-button type="primary" plain @click="loadDashboard">刷新数据</el-button>
    </header>

    <el-skeleton :loading="loading" animated :rows="8">
      <template #default>
        <div class="dashboard-grid">
          <section class="card-panel profile-card">
            <h3>账号信息</h3>
            <p><strong>账号:</strong> {{ auth.user?.contact }}</p>
            <p><strong>角色:</strong> {{ auth.user?.role === 'customer' ? '客户' : '管理员' }}</p>
            <p><strong>状态:</strong> {{ auth.user?.tokenState === 'active' ? '正常' : '异常' }}</p>
          </section>

          <section class="card-panel stat-card">
            <h3>已开通业务</h3>
            <p class="big-number">{{ openedModuleCount }}</p>
          </section>

          <section class="card-panel stat-card">
            <h3>执行中任务</h3>
            <p class="big-number">{{ runningTaskCount }}</p>
          </section>

          <section class="card-panel stat-card">
            <h3>报告数量</h3>
            <p class="big-number">{{ dashboard?.reports.length ?? 0 }}</p>
          </section>
        </div>

        <el-alert v-if="errorText" :title="errorText" type="error" show-icon :closable="false" />

        <section class="card-panel opened-modules">
          <h3>已开通业务</h3>
          <div class="module-tags">
            <el-tag v-for="item in openedModules" :key="item.moduleKey" round>{{ item.name }}</el-tag>
          </div>
        </section>

        <section class="card-panel recent-tasks">
          <h3>最近任务</h3>
          <el-table :data="dashboard?.recentTasks ?? []" height="290">
            <el-table-column prop="moduleKey" label="模块" min-width="150" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'completed' ? 'success' : scope.row.status === 'failed' ? 'danger' : 'warning'">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="summary" label="摘要" min-width="220" show-overflow-tooltip />
            <el-table-column prop="updatedAt" label="更新时间" min-width="180" />
          </el-table>
        </section>

        <div class="extra-grid">
          <section class="card-panel report-list">
            <h3>报告入口</h3>
            <a v-for="report in dashboard?.reports ?? []" :key="report.id" :href="report.url" class="report-item">
              <div>
                <strong>{{ report.title }}</strong>
                <p>{{ report.createdAt }}</p>
              </div>
              <el-tag>{{ report.format.toUpperCase() }}</el-tag>
            </a>
          </section>

          <section class="card-panel notice-list">
            <h3>消息提醒</h3>
            <div v-for="notice in dashboard?.notifications ?? []" :key="notice.id" class="notice-item">
              <el-tag :type="notice.level === 'warning' ? 'warning' : notice.level === 'success' ? 'success' : 'info'">
                {{ notice.level }}
              </el-tag>
              <div>
                <strong>{{ notice.title }}</strong>
                <p>{{ notice.createdAt }}</p>
              </div>
            </div>
          </section>
        </div>
      </template>
    </el-skeleton>
  </section>
</template>

<style scoped>
.customer-page {
  display: grid;
  gap: 14px;
}

.page-head {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 12px;
}

.profile-card,
.stat-card,
.opened-modules,
.recent-tasks,
.report-list,
.notice-list {
  padding: 14px;
}

.profile-card h3,
.stat-card h3,
.opened-modules h3,
.recent-tasks h3,
.report-list h3,
.notice-list h3 {
  margin: 0 0 10px;
}

.profile-card p {
  margin: 6px 0;
}

.big-number {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 700;
  color: var(--brand);
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.extra-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
}

.report-list,
.notice-list {
  display: grid;
  gap: 10px;
}

.report-item,
.notice-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.report-item p,
.notice-item p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}

@media (max-width: 1180px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .extra-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-head {
    align-items: start;
    flex-direction: column;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
