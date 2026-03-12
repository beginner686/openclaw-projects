<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchModuleUsers } from '@/api/admin'
import type { AdminUser } from '@/api/admin'

const route = useRoute()
const loading = ref(true)
const users = ref<AdminUser[]>([])

async function load() {
  loading.value = true
  try {
    users.value = await fetchModuleUsers(route.params.moduleKey as string)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.moduleKey, load)
onMounted(load)

function formatTime(iso: string | null | undefined) {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '暂无'
}
</script>

<template>
  <div class="module-users">
    <div class="page-header">
      <h2 class="page-title">用户列表</h2>
      <span class="total-tip">共 {{ users.length }} 名用户开通了此模块</span>
    </div>

    <el-table v-loading="loading" :data="users" style="width: 100%">
      <el-table-column label="姓名" prop="name" min-width="100" />
      <el-table-column label="账号" prop="contact" min-width="160" />
      <el-table-column label="角色" prop="role" width="90">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
            {{ row.role === 'admin' ? '管理员' : '客户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="本模块任务数" prop="taskCount" width="130" align="center">
        <template #default="{ row }">{{ row.taskCount ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="最近任务时间" width="140">
        <template #default="{ row }">{{ formatTime(row.lastTaskAt) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.module-users { max-width: 900px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 1.1rem; color: var(--text-strong, #222); }
.total-tip { font-size: 0.88rem; color: var(--text-muted, #888); }
</style>
