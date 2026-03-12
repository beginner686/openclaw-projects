<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchModuleReports } from '@/api/admin'
import type { ModuleReport } from '@/api/admin'

const route = useRoute()
const loading = ref(true)
const reports = ref<ModuleReport[]>([])

async function load() {
  loading.value = true
  try {
    reports.value = await fetchModuleReports(route.params.moduleKey as string)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.moduleKey, load)
onMounted(load)

function formatTime(iso: string) {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '-'
}
</script>

<template>
  <div class="module-reports">
    <div class="page-header">
      <h2 class="page-title">报告列表</h2>
      <span class="total-tip">共 {{ reports.length }} 份报告</span>
    </div>

    <div v-if="loading">
      <el-skeleton :rows="5" animated />
    </div>

    <el-table v-else :data="reports" style="width: 100%">
      <el-table-column label="任务ID" width="120">
        <template #default="{ row }">
          <span class="mono">{{ row.taskId?.slice(0, 12) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="场景" prop="scenario" min-width="180" show-overflow-tooltip />
      <el-table-column label="完成时间" width="140">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="格式" prop="reportFormat" width="80" align="center" />
      <el-table-column label="报告" width="80" align="center">
        <template #default="{ row }">
          <a :href="row.reportUrl" target="_blank" class="report-link">查看报告</a>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && reports.length === 0" description="暂无报告" />
  </div>
</template>

<style scoped>
.module-reports { max-width: 900px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 1.1rem; color: var(--text-strong, #222); }
.total-tip { font-size: 0.88rem; color: var(--text-muted, #888); }
.mono { font-family: monospace; font-size: 0.85rem; color: var(--text-muted, #888); }
.report-link { color: var(--brand, #e03020); font-size: 0.85rem; text-decoration: none; }
.report-link:hover { text-decoration: underline; }
</style>
