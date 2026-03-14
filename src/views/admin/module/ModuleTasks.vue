<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { fetchModuleFeatureRecords, fetchModuleTasks, reviewAdminTask } from '@/api/admin'
import type { AdminTask, AdminTaskSummary, ModuleFeatureRecord, ModuleTaskFeatureApplied } from '@/api/admin'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const tasks = ref<AdminTask[]>([])
const total = ref(0)
const page = ref(1)
const filterStatus = ref('')
const keyword = ref('')
const featureApplied = ref<ModuleTaskFeatureApplied | null>(null)
const featureRecords = ref<ModuleFeatureRecord[]>([])
const featureRecordTotal = ref(0)
const featureRecordSummary = ref<AdminTaskSummary>({
  total: 0,
  review: 0,
  queued: 0,
  running: 0,
  completed: 0,
  failed: 0,
  processing: 0,
  successRate: 0,
})
const featureRecordLoading = ref(false)
const summary = ref<AdminTaskSummary>({
  total: 0,
  review: 0,
  queued: 0,
  running: 0,
  completed: 0,
  failed: 0,
  processing: 0,
  successRate: 0,
})
const reviewingTaskId = ref('')

const routeFeatureKey = computed(() => {
  const raw = route.query.featureKey
  if (!raw) return ''
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim()
  return String(raw).trim()
})

const STATUS_MAP: Record<string, { label: string; type: string }> = {
  review: { label: '待审核', type: 'warning' },
  queued: { label: '排队中', type: 'info' },
  running: { label: '执行中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '失败', type: 'danger' },
}

async function load() {
  loading.value = true
  try {
    const moduleKey = String(route.params.moduleKey ?? '')
    const res = await fetchModuleTasks(String(route.params.moduleKey ?? ''), {
      page: page.value,
      limit: 50,
      status: filterStatus.value || undefined,
      keyword: keyword.value.trim() || undefined,
      featureKey: routeFeatureKey.value || undefined,
    })
    tasks.value = res.tasks
    total.value = res.total
    summary.value = res.summary
    featureApplied.value = res.featureApplied ?? null

    if (routeFeatureKey.value) {
      featureRecordLoading.value = true
      try {
        const featureRes = await fetchModuleFeatureRecords(moduleKey, routeFeatureKey.value, {
          page: page.value,
          limit: 20,
          status: filterStatus.value || undefined,
          keyword: keyword.value.trim() || undefined,
        })
        featureRecords.value = featureRes.records
        featureRecordTotal.value = featureRes.total
        featureRecordSummary.value = featureRes.summary
      } finally {
        featureRecordLoading.value = false
      }
    } else {
      featureRecords.value = []
      featureRecordTotal.value = 0
      featureRecordSummary.value = {
        total: 0,
        review: 0,
        queued: 0,
        running: 0,
        completed: 0,
        failed: 0,
        processing: 0,
        successRate: 0,
      }
      featureRecordLoading.value = false
    }
  } finally {
    loading.value = false
  }
}

function formatTime(iso: string) {
  return iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '-'
}

function isReviewing(taskId: string) {
  return reviewingTaskId.value === taskId
}

async function handleApprove(row: AdminTask) {
  reviewingTaskId.value = row.taskId
  try {
    await reviewAdminTask(row.taskId, 'approve')
    ElMessage.success('审核通过，任务已重新入队')
    await load()
  } catch (error) {
    const message = error instanceof Error ? error.message : '审核通过操作失败'
    ElMessage.error(message)
  } finally {
    reviewingTaskId.value = ''
  }
}

async function handleReject(row: AdminTask) {
  let reason = ''
  try {
    const result = await ElMessageBox.prompt('可填写驳回原因（选填）', '驳回任务', {
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：输入信息不足',
    })
    reason = String(result.value ?? '').trim()
  } catch {
    return
  }

  reviewingTaskId.value = row.taskId
  try {
    await reviewAdminTask(row.taskId, 'reject', reason)
    ElMessage.success('任务已驳回')
    await load()
  } catch (error) {
    const message = error instanceof Error ? error.message : '驳回操作失败'
    ElMessage.error(message)
  } finally {
    reviewingTaskId.value = ''
  }
}

function clearFeatureFilter() {
  const query = { ...route.query }
  delete query.featureKey
  router.replace({ query })
}

watch(
  () => route.params.moduleKey,
  () => {
    page.value = 1
    void load()
  },
)

watch(
  () => route.query.featureKey,
  () => {
    page.value = 1
    void load()
  },
)

onMounted(load)
</script>

<template>
  <div class="module-tasks">
    <div class="page-header">
      <h2 class="page-title">任务列表</h2>
      <div class="filters">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索场景 / 输入 / 摘要"
          style="width: 220px"
          @keyup.enter="load"
          @clear="load"
        />
        <el-select v-model="filterStatus" clearable placeholder="状态筛选" style="width: 140px" @change="load">
          <el-option value="" label="全部" />
          <el-option value="review" label="待审核" />
          <el-option value="queued" label="排队中" />
          <el-option value="running" label="执行中" />
          <el-option value="completed" label="已完成" />
          <el-option value="failed" label="失败" />
        </el-select>
        <el-button type="primary" plain @click="load">查询</el-button>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-item"><span>总任务</span><strong>{{ summary.total }}</strong></div>
      <div class="summary-item"><span>待审核</span><strong>{{ summary.review }}</strong></div>
      <div class="summary-item"><span>执行中</span><strong>{{ summary.processing }}</strong></div>
      <div class="summary-item"><span>成功率</span><strong>{{ summary.successRate }}%</strong></div>
    </div>

    <div v-if="featureApplied" class="feature-filter-tip">
      <span>当前子功能筛选：{{ featureApplied.name }}（{{ featureApplied.description }}）</span>
      <el-button text type="primary" @click="clearFeatureFilter">清除筛选</el-button>
    </div>

    <div v-if="featureApplied" class="feature-records" v-loading="featureRecordLoading">
      <div class="feature-records-header">
        <h3>子功能记录</h3>
        <span>共 {{ featureRecordTotal }} 条 · 成功率 {{ featureRecordSummary.successRate }}%</span>
      </div>
      <el-table v-if="featureRecords.length" :data="featureRecords" size="small" style="width: 100%">
        <el-table-column label="记录ID" width="150">
          <template #default="{ row }">
            <span class="mono">{{ row.recordId?.slice(0, 18) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="任务ID" width="150">
          <template #default="{ row }">
            <span class="mono">{{ row.taskId?.slice(0, 18) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.payload?.headline || row.featureName }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="(STATUS_MAP[row.status]?.type as any) ?? 'info'" size="small">
              {{ STATUS_MAP[row.status]?.label ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发现" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.payload?.finding || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="建议" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.payload?.recommendation || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无子功能记录" />
    </div>

    <el-table v-loading="loading" :data="tasks" style="width: 100%">
      <el-table-column label="任务ID" width="140">
        <template #default="{ row }">
          <span class="mono">{{ row.taskId?.slice(0, 16) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="场景" prop="scenario" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="(STATUS_MAP[row.status]?.type as any) ?? 'info'" size="small">
            {{ STATUS_MAP[row.status]?.label ?? row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="用户ID" width="120">
        <template #default="{ row }">
          <span class="mono">{{ row.ownerId?.slice(0, 12) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="报告" width="90" align="center">
        <template #default="{ row }">
          <a v-if="row.reportUrl" :href="row.reportUrl" target="_blank" class="report-link">查看</a>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="审核" width="180" align="center">
        <template #default="{ row }">
          <div v-if="row.status === 'review'" class="actions">
            <el-button
              size="small"
              type="success"
              :loading="isReviewing(row.taskId)"
              @click="handleApprove(row)"
            >通过</el-button>
            <el-button
              size="small"
              type="danger"
              plain
              :loading="isReviewing(row.taskId)"
              @click="handleReject(row)"
            >驳回</el-button>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        layout="prev, pager, next, total"
        :total="total"
        :page-size="50"
        small
        @change="load"
      />
    </div>
  </div>
</template>

<style scoped>
.module-tasks {
  max-width: 1160px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-strong, #222);
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.summary-item {
  border: 1px solid var(--line, #e5eaf3);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  display: grid;
  gap: 4px;
}

.summary-item span {
  color: var(--text-muted, #64748b);
  font-size: 0.78rem;
}

.summary-item strong {
  font-size: 1.05rem;
  color: #1e293b;
  line-height: 1;
}

.feature-filter-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  border: 1px dashed #d8e3f4;
  border-radius: 8px;
  background: #f8fbff;
  color: #334155;
  padding: 8px 10px;
  font-size: 0.82rem;
}

.feature-records {
  margin-bottom: 12px;
  border: 1px solid #e3e9f3;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
}

.feature-records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.feature-records-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
}

.feature-records-header span {
  color: #64748b;
  font-size: 0.8rem;
}

.mono {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-muted, #666);
}

.report-link {
  color: var(--brand, #e03020);
  font-size: 0.85rem;
  text-decoration: none;
}

.report-link:hover {
  text-decoration: underline;
}

.actions {
  display: inline-flex;
  gap: 6px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

@media (max-width: 760px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    justify-content: stretch;
  }

  .summary-row {
    grid-template-columns: repeat(2, minmax(100px, 1fr));
  }

  .feature-filter-tip {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
