<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  fetchGeneratedModules,
  generateModuleFromDoc,
  type GeneratedModuleItem,
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const submitting = ref(false)
const loadingList = ref(false)
const generated = ref<GeneratedModuleItem[]>([])

const form = reactive({
  moduleName: '',
  moduleKey: '',
  category: 'enterprise' as 'enterprise' | 'personal',
  icon: 'Grid',
  status: 'beta' as 'active' | 'beta' | 'coming_soon',
  description: '',
  designDoc: '',
})

const lastCreated = ref<GeneratedModuleItem | null>(null)

const iconOptions = [
  'Grid',
  'Tools',
  'Monitor',
  'Tickets',
  'TrendCharts',
  'Bell',
  'Search',
  'Connection',
  'Histogram',
  'DataLine',
  'User',
  'Camera',
  'Lock',
  'Document',
  'Reading',
  'Briefcase',
  'EditPen',
]

async function loadGenerated() {
  loadingList.value = true
  try {
    const res = await fetchGeneratedModules()
    generated.value = res.items
  } finally {
    loadingList.value = false
  }
}

async function handleGenerate() {
  if (!form.moduleName.trim()) {
    ElMessage.warning('请填写模块名称')
    return
  }
  if (!form.designDoc.trim()) {
    ElMessage.warning('请粘贴设计文档内容')
    return
  }

  submitting.value = true
  try {
    const data = await generateModuleFromDoc({
      moduleName: form.moduleName,
      moduleKey: form.moduleKey || undefined,
      category: form.category,
      icon: form.icon,
      status: form.status,
      description: form.description || undefined,
      designDoc: form.designDoc,
    })
    lastCreated.value = data.module
    ElMessage.success(`模块已生成：${data.module.name} (${data.module.moduleKey})`)
    await auth.refreshProfile()
    await loadGenerated()
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成失败'
    ElMessage.error(message)
  } finally {
    submitting.value = false
  }
}

onMounted(loadGenerated)
</script>

<template>
  <div class="factory-page">
    <section class="card">
      <div class="head">
        <div>
          <h1>子后台模块生成器</h1>
          <p>输入设计文档后自动生成子模块后台（模块定义 + 子功能菜单 + KPI + 规则配置）。</p>
        </div>
        <el-button type="primary" plain @click="router.push('/admin/modules')">返回模块中心</el-button>
      </div>

      <el-form label-position="top" class="form">
        <div class="grid">
          <el-form-item label="模块名称">
            <el-input v-model="form.moduleName" placeholder="例如：企业合同履约监控" />
          </el-form-item>
          <el-form-item label="模块Key（可选）">
            <el-input v-model="form.moduleKey" placeholder="例如：contract-fulfillment-monitor" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="form.category">
              <el-option value="enterprise" label="企业服务" />
              <el-option value="personal" label="个人服务" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option value="active" label="active" />
              <el-option value="beta" label="beta" />
              <el-option value="coming_soon" label="coming_soon" />
            </el-select>
          </el-form-item>
          <el-form-item label="图标">
            <el-select v-model="form.icon" filterable>
              <el-option v-for="icon in iconOptions" :key="icon" :value="icon" :label="icon" />
            </el-select>
          </el-form-item>
          <el-form-item label="模块简介（可选）">
            <el-input v-model="form.description" placeholder="可留空，系统会自动提取" />
          </el-form-item>
        </div>

        <el-form-item label="设计文档">
          <el-input
            v-model="form.designDoc"
            type="textarea"
            :rows="14"
            placeholder="粘贴模块设计文档，支持中文长文本与条目列表..."
          />
        </el-form-item>

        <div class="actions">
          <el-button type="primary" :loading="submitting" @click="handleGenerate">生成子后台模块</el-button>
          <el-button
            v-if="lastCreated"
            type="success"
            plain
            @click="router.push(`/admin/module/${lastCreated.moduleKey}`)"
          >
            进入刚生成的模块后台
          </el-button>
        </div>
      </el-form>
    </section>

    <section class="card">
      <div class="head">
        <h2>已生成模块</h2>
        <el-button text @click="loadGenerated">刷新</el-button>
      </div>

      <el-table v-loading="loadingList" :data="generated" style="width: 100%">
        <el-table-column prop="name" label="模块名称" min-width="160" />
        <el-table-column prop="moduleKey" label="模块Key" min-width="190" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="status" label="状态" width="110" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" width="130">
          <template #default="{ row }">
            <el-button text type="primary" @click="router.push(`/admin/module/${row.moduleKey}`)">进入</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.factory-page {
  display: grid;
  gap: 14px;
}

.card {
  border: 1px solid var(--line, #e5eaf3);
  border-radius: 14px;
  background: #fff;
  padding: 14px;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.head h1,
.head h2 {
  margin: 0;
}

.head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 0.9rem;
}

.form {
  margin-top: 8px;
}

.grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
}

.actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
