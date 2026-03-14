<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchAdminTaskDetail,
  fetchAdminTasks,
  reviewAdminTask,
  reviewAdminTasksBulk,
  type AdminTask,
  type AdminTaskSummary,
} from '@/api/admin'
import { fetchEnabledModules } from '@/api/modules'
import { moduleCatalog, moduleMap } from '@/config/modules'

const loading = ref(true)
const tasks = ref<AdminTask[]>([])
const total = ref(0)
const page = ref(1)
const filterStatus = ref('')
const filterModule = ref('')
const keyword = ref('')
const reviewingTaskId = ref('')

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

const selectedRows = ref<AdminTask[]>([])
const bulkLoading = ref(false)
const moduleOptionsData = ref<Array<{ value: string; label: string }>>(
  moduleCatalog.map((item) => ({ value: item.moduleKey, label: item.name })),
)
const moduleNameMap = ref<Map<string, string>>(
  new Map(moduleCatalog.map((item) => [item.moduleKey, item.name])),
)

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailTask = ref<AdminTask | null>(null)

const moduleOptions = computed(() =>
  moduleOptionsData.value,
)

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

const reviewableTaskIds = computed(() =>
  selectedRows.value.filter((item) => item.status === 'review').map((item) => item.taskId),
)

async function loadTasks() {
  loading.value = true
  try {
    const res = await fetchAdminTasks({
      page: page.value,
      limit: 50,
      status: filterStatus.value || undefined,
      moduleKey: filterModule.value || undefined,
      keyword: keyword.value.trim() || undefined,
    })
    tasks.value = res.tasks
    total.value = res.total
    summary.value = res.summary
  } finally {
    loading.value = false
  }
}

function formatTime(iso: string) {
  return iso ? new Date(iso).toLocaleString('zh-CN', { hour12: false }) : '-'
}

function getModuleName(moduleKey: string) {
  return moduleNameMap.value.get(moduleKey) ?? moduleMap.get(moduleKey)?.name ?? moduleKey
}

async function loadModuleOptions() {
  try {
    const modules = await fetchEnabledModules()
    const items = modules.map((item) => ({ value: item.moduleKey, label: item.name }))
    moduleOptionsData.value = items
    moduleNameMap.value = new Map(modules.map((item) => [item.moduleKey, item.name]))
  } catch {
    // Keep static fallback options.
  }
}

function isReviewing(taskId: string) {
  return reviewingTaskId.value === taskId
}

function onSelectionChange(rows: AdminTask[]) {
  selectedRows.value = rows
}

async function openTaskDetail(row: AdminTask) {
  detailVisible.value = true
  detailLoading.value = true
  detailTask.value = null
  try {
    detailTask.value = await fetchAdminTaskDetail(row.taskId)
  } catch (error) {
    const message = error instanceof Error ? error.message : '任务详情加载失败'
    ElMessage.error(message)
  } finally {
    detailLoading.value = false
  }
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

async function handleBulkApprove() {
  if (!reviewableTaskIds.value.length) {
    ElMessage.warning('请先选择待审核任务')
    return
  }
  bulkLoading.value = true
  try {
    const res = await reviewAdminTasksBulk(reviewableTaskIds.value, 'approve')
    ElMessage.success(`批量审核完成：成功 ${res.success} 条`) 
    await loadTasks()
  } catch (error) {
    const message = error instanceof Error ? error.message : '批量审核失败'
    ElMessage.error(message)
  } finally {
    bulkLoading.value = false
  }
}

async function handleBulkReject() {
  if (!reviewableTaskIds.value.length) {
    ElMessage.warning('请先选择待审核任务')
    return
  }

  let reason = ''
  try {
    const result = await ElMessageBox.prompt('批量驳回原因（选填）', '批量驳回', {
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：输入信息不足',
    })
    reason = String(result.value ?? '').trim()
  } catch {
    return
  }

  bulkLoading.value = true
  try {
    const res = await reviewAdminTasksBulk(reviewableTaskIds.value, 'reject', reason)
    ElMessage.success(`批量驳回完成：成功 ${res.success} 条`) 
    await loadTasks()
  } catch (error) {
    const message = error instanceof Error ? error.message : '批量驳回失败'
    ElMessage.error(message)
  } finally {
    bulkLoading.value = false
  }
}

onMounted(async () => {
  await loadModuleOptions()
  await loadTasks()
})
</script>

<template>
  <div class="admin-tasks">
    <div class="page-header">
      <h1 class="page-title">全局任务中心</h1>
      <div class="filters">
        <el-input
          v-model="keyword"
          placeholder="搜索任务ID / 用户ID / 场景 / 输入内容"
          clearable
          style="width: 300px"
          @keyup.enter="loadTasks"
          @clear="loadTasks"
        />
        <el-select
          v-model="filterModule"
          placeholder="模块筛选"
          clearable
          filterable
          style="width: 220px"
          @change="loadTasks"
        >
          <el-option v-for="item in moduleOptions" :key="item.value" :value="item.value" :label="item.label" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 140px" @change="loadTasks">
          <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value" :label="o.label" />
        </el-select>
        <el-button type="primary" plain @click="loadTasks">查询</el-button>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-card">
        <span>总任务</span>
        <strong>{{ summary.total }}</strong>
      </div>
      <div class="summary-card warning">
        <span>待审核</span>
        <strong>{{ summary.review }}</strong>
      </div>
      <div class="summary-card info">
        <span>执行中</span>
        <strong>{{ summary.processing }}</strong>
      </div>
      <div class="summary-card success">
        <span>成功率</span>
        <strong>{{ summary.successRate }}%</strong>
      </div>
      <div class="summary-card danger">
        <span>失败</span>
        <strong>{{ summary.failed }}</strong>
      </div>
    </div>

    <div class="bulk-bar">
      <span>已选 {{ selectedRows.length }} 条（可批量审核 {{ reviewableTaskIds.length }} 条）</span>
      <div class="bulk-actions">
        <el-button type="success" :loading="bulkLoading" @click="handleBulkApprove">批量通过</el-button>
        <el-button type="danger" plain :loading="bulkLoading" @click="handleBulkReject">批量驳回</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="tasks" style="width: 100%" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="44" />
      <el-table-column label="任务ID" prop="taskId" width="140">
        <template #default="{ row }">
          <span class="task-id">{{ row.taskId?.slice(0, 16) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="模块" min-width="220">
        <template #default="{ row }">
          <div class="module-cell">
            <span class="module-name">{{ getModuleName(row.moduleKey) }}</span>
            <span class="module-key">{{ row.moduleKey }}</span>
          </div>
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
      <el-table-column label="操作" width="210" align="center">
        <template #default="{ row }">
          <div class="actions">
            <el-button size="small" text @click="openTaskDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'review'"
              size="small"
              type="success"
              :loading="isReviewing(row.taskId)"
              @click="handleApprove(row)"
            >通过</el-button>
            <el-button
              v-if="row.status === 'review'"
              size="small"
              type="danger"
              plain
              :loading="isReviewing(row.taskId)"
              @click="handleReject(row)"
            >驳回</el-button>
          </div>
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

    <el-drawer v-model="detailVisible" title="任务详情" size="520px">
      <el-skeleton v-if="detailLoading" :rows="8" animated />
      <div v-else-if="detailTask" class="detail-grid">
        <div class="detail-item"><label>任务ID</label><code>{{ detailTask.taskId }}</code></div>
        <div class="detail-item"><label>模块</label><span>{{ getModuleName(detailTask.moduleKey) }}</span></div>
        <div class="detail-item"><label>模块Key</label><code>{{ detailTask.moduleKey }}</code></div>
        <div class="detail-item"><label>状态</label><el-tag :type="(STATUS_MAP[detailTask.status]?.type as any) ?? 'info'" size="small">{{ STATUS_MAP[detailTask.status]?.label ?? detailTask.status }}</el-tag></div>
        <div class="detail-item"><label>场景</label><span>{{ detailTask.scenario }}</span></div>
        <div class="detail-item"><label>用户ID</label><code>{{ detailTask.ownerId }}</code></div>
        <div class="detail-item full"><label>输入内容</label><pre>{{ detailTask.inputText || '-' }}</pre></div>
        <div class="detail-item full"><label>摘要</label><pre>{{ detailTask.summary || '-' }}</pre></div>
        <div class="detail-item full" v-if="detailTask.errorMessage"><label>错误信息</label><pre>{{ detailTask.errorMessage }}</pre></div>
        <div class="detail-item"><label>创建时间</label><span>{{ formatTime(detailTask.createdAt) }}</span></div>
        <div class="detail-item"><label>更新时间</label><span>{{ formatTime(detailTask.updatedAt) }}</span></div>
        <div class="detail-item" v-if="detailTask.reportUrl"><label>报告</label><a :href="detailTask.reportUrl" target="_blank" class="report-link">打开报告</a></div>
      </div>
      <el-empty v-else description="暂无详情" />
    </el-drawer>
  </div>
</template>

<style scoped>
.admin-tasks {
  max-width: 1240px;
  display: grid;
  gap: 12px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 1.4rem;
  color: var(--text-strong, #222);
}

.filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 10px;
}

.summary-card {
  border: 1px solid var(--line, #e8eaed);
  border-radius: 10px;
  background: #fff;
  padding: 10px 12px;
  display: grid;
  gap: 3px;
}

.summary-card span {
  color: var(--text-muted, #7b8397);
  font-size: 0.8rem;
}

.summary-card strong {
  color: #1f2a44;
  font-size: 1.3rem;
  line-height: 1;
}

.summary-card.warning strong { color: #d97706; }
.summary-card.info strong { color: #2563eb; }
.summary-card.success strong { color: #059669; }
.summary-card.danger strong { color: #dc2626; }

.bulk-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px dashed var(--line, #e8eaed);
  border-radius: 10px;
  background: #fcfdff;
  padding: 10px 12px;
  color: var(--text-muted, #6b7280);
  font-size: 0.86rem;
}

.bulk-actions {
  display: inline-flex;
  gap: 8px;
}

.task-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  color: var(--text-muted, #666);
}

.module-cell {
  display: grid;
  gap: 2px;
}

.module-name {
  color: var(--text-strong, #222);
  font-weight: 600;
  line-height: 1.2;
}

.module-key {
  color: var(--text-muted, #8c93a6);
  font-size: 0.72rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
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
  align-items: center;
}

.pagination {
  margin-top: 4px;
  display: flex;
  justify-content: center;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.detail-item {
  border: 1px solid var(--line, #e8eaed);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 6px;
  background: #fff;
}

.detail-item.full {
  grid-column: 1 / -1;
}

.detail-item label {
  color: var(--text-muted, #6b7280);
  font-size: 0.78rem;
}

.detail-item span,
.detail-item code {
  color: var(--text-strong, #1f2937);
  font-size: 0.86rem;
  word-break: break-all;
}

.detail-item pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.83rem;
  line-height: 1.45;
  color: #243047;
  font-family: var(--font-main, 'Microsoft YaHei', sans-serif);
}

@media (max-width: 1080px) {
  .summary-row {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}

@media (max-width: 760px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    justify-content: stretch;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
