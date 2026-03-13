<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchAdminTasks, reviewAdminTask } from '@/api/admin'
import type { AdminTask } from '@/api/admin'

const loading = ref(true)
const tasks = ref<AdminTask[]>([])
const total = ref(0)
const page = ref(1)
const filterStatus = ref('')
const filterModule = ref('')
const reviewingTaskId = ref('')

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'review', label: '待审核' },
  { value: 'queued', label: '排队中' },
  { value: 'running', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
]

const STATUS_MAP: Record<string, { label: string; type: string }> = {
  review: { label: '待审核', type: 'warning' },
  queued: { label: '排队中', type: 'info' },
  running: { label: '执行中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '失败', type: 'danger' },
}

async function loadTasks() {
  loading.value = true
  try {
    const res = await fetchAdminTasks({
      page: page.value,
      limit: 50,
      status: filterStatus.value || undefined,
      moduleKey: filterModule.value || undefined,
    })
    tasks.value = res.tasks
    total.value = res.total
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
    await loadTasks()
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
      inputPlaceholder: '例如：缺少关键凭证',
    })
    reason = String(result.value ?? '').trim()
  } catch {
    return
  }

  reviewingTaskId.value = row.taskId
  try {
    await reviewAdminTask(row.taskId, 'reject', reason)
    ElMessage.success('任务已驳回')
    await loadTasks()
  } catch (error) {
    const message = error instanceof Error ? error.message : '驳回操作失败'
    ElMessage.error(message)
  } finally {
    reviewingTaskId.value = ''
  }
}

onMounted(loadTasks)
</script>

<template>
  <div class="admin-tasks">
    <div class="page-header">
      <h1 class="page-title">全局任务中心</h1>
      <div class="filters">
        <el-input
          v-model="filterModule"
          placeholder="模块Key筛选"
          clearable
          style="width: 180px"
          @change="loadTasks"
        />
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 140px" @change="loadTasks">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value" :label="o.label" />
        </el-select>
      </div>
    </div>

    <el-table v-loading="loading" :data="tasks" style="width: 100%">
      <el-table-column label="任务ID" prop="taskId" width="140">
        <template #default="{ row }">
          <span class="task-id">{{ row.taskId?.slice(0, 16) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="模块" prop="moduleKey" min-width="160" />
      <el-table-column label="场景" prop="scenario" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="(STATUS_MAP[row.status]?.type as any) ?? 'info'" size="small">
            {{ STATUS_MAP[row.status]?.label ?? row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="用户ID" prop="ownerId" width="120">
        <template #default="{ row }">
          <span class="task-id">{{ row.ownerId?.slice(0, 12) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="报告" width="90" align="center">
        <template #default="{ row }">
          <a v-if="row.reportUrl" :href="row.reportUrl" target="_blank" class="report-link">查看</a>
          <span v-else class="no-report">-</span>
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
          <span v-else class="no-report">-</span>
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
        @change="loadTasks"
      />
    </div>
  </div>
</template>

<style scoped>
.admin-tasks {
  max-width: 1220px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 1.4rem;
  color: var(--text-strong, #222);
}

.filters {
  display: flex;
  gap: 10px;
}

.task-id {
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

.no-report {
  color: var(--text-muted, #b0b0b0);
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
</style>
