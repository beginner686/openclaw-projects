<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchAdminUsers, updateUserModules } from '@/api/admin'
import type { AdminUser } from '@/api/admin'
import { moduleCatalog } from '@/config/modules'

const ALL_MODULES = moduleCatalog.map((item) => ({
  key: item.moduleKey,
  name: item.name,
}))

const loading = ref(true)
const users = ref<AdminUser[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')

const drawerVisible = ref(false)
const selectedUser = ref<AdminUser | null>(null)
const editingModules = ref<string[]>([])
const saving = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const res = await fetchAdminUsers({ page: page.value, limit: 50, search: search.value })
    users.value = res.users
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openDrawer(user: AdminUser) {
  selectedUser.value = user
  editingModules.value = [...(user.enabledModules ?? [])]
  drawerVisible.value = true
}

async function saveModules() {
  if (!selectedUser.value) return

  saving.value = true
  try {
    await updateUserModules(selectedUser.value.id, editingModules.value)
    ElMessage.success('模块权限已更新')
    drawerVisible.value = false
    await loadUsers()
  } catch {
    ElMessage.error('更新失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="admin-users">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <el-input
        v-model="search"
        placeholder="搜索账号或姓名"
        clearable
        style="width: 240px"
        @change="loadUsers"
      >
        <template #prefix>🔎</template>
      </el-input>
    </div>

    <el-table v-loading="loading" :data="users" style="width: 100%">
      <el-table-column label="姓名" prop="name" min-width="120" />
      <el-table-column label="账号" prop="contact" min-width="180" />
      <el-table-column label="角色" prop="role" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
            {{ row.role === 'admin' ? '管理员' : '客户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="已开通模块" width="110" align="center">
        <template #default="{ row }">{{ row.enabledModules?.length ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="账号状态" prop="tokenState" width="110">
        <template #default="{ row }">
          <el-tag :type="row.tokenState === 'active' ? 'success' : 'warning'" size="small">
            {{ row.tokenState === 'active' ? '正常' : '已失效' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button size="small" text @click="openDrawer(row)">编辑模块</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        layout="prev, pager, next"
        :total="total"
        :page-size="50"
        small
        @change="loadUsers"
      />
    </div>

    <el-drawer
      v-model="drawerVisible"
      :title="`编辑 ${selectedUser?.name ?? ''} 的开通模块`"
      size="420px"
    >
      <div class="drawer-body">
        <el-checkbox-group v-model="editingModules" class="module-checkboxes">
          <el-checkbox v-for="m in ALL_MODULES" :key="m.key" :value="m.key" class="module-checkbox">
            {{ m.name }}
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveModules">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.admin-users {
  max-width: 1100px;
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

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.drawer-body {
  padding: 0 4px;
}

.module-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-checkbox {
  margin: 0 !important;
}
</style>
