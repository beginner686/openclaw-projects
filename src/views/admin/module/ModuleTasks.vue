<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { fetchModuleTasks, reviewAdminTask } from '@/api/admin'
import type { AdminTask } from '@/api/admin'

const route = useRoute()
const loading = ref(true)
const tasks = ref<AdminTask[]>([])
const total = ref(0)
const page = ref(1)
const filterStatus = ref('')
const reviewingTaskId = ref('')

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
    const res = await fetchModuleTasks(String(route.params.moduleKey ?? ''), {
      page: page.value,
      limit: 50,
      status: filterStatus.value || undefined,
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

watch(
  () => route.params.moduleKey,
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
      <el-select v-model="filterStatus" clearable placeholder="状态筛选" style="width: 140px" @change="load">
        <el-option value="" label="全部" />
        <el-option value="review" label="待审核" />
        <el-option value="queued" label="排队中" />
        <el-option value="running" label="执行中" />
        <el-option value="completed" label="已完成" />
        <el-option value="failed" label="失败" />
      </el-select>
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
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-strong, #222);
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
</style>
