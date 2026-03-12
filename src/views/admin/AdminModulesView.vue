<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchAdminStats } from '@/api/admin'
import type { ModuleRankItem } from '@/api/admin'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const modules = ref<ModuleRankItem[]>([])

onMounted(async () => {
  loading.value = true
  try {
    const stats = await fetchAdminStats()
    modules.value = stats.moduleRanking
  } finally {
    loading.value = false
  }
})

const CATEGORY_MAP: Record<string, string> = {
  enterprise: '企业服务',
  personal: '个人服务',
}
</script>

<template>
  <div class="admin-modules">
    <h1 class="page-title">模块管理</h1>
    <p class="page-desc">点击「进入子后台」查看各模块的任务、用户和报告详情。</p>

    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else class="module-grid">
      <div
        v-for="m in modules"
        :key="m.moduleKey"
        class="module-card"
      >
        <div class="card-header">
          <span class="module-icon">{{ m.icon }}</span>
          <div>
            <div class="module-name">{{ m.name }}</div>
            <el-tag size="small" :type="m.category === 'enterprise' ? 'warning' : 'success'" class="cat-tag">
              {{ CATEGORY_MAP[m.category] ?? m.category }}
            </el-tag>
          </div>
        </div>

        <div class="card-stats">
          <div class="stat-item">
            <div class="stat-val">{{ m.total }}</div>
            <div class="stat-lbl">总任务</div>
          </div>
          <div class="stat-item">
            <div class="stat-val">{{ m.completed }}</div>
            <div class="stat-lbl">已完成</div>
          </div>
          <div class="stat-item">
            <div class="stat-val">{{ m.running + m.queued }}</div>
            <div class="stat-lbl">进行中</div>
          </div>
        </div>

        <el-button
          type="primary"
          size="small"
          class="enter-btn"
          @click="router.push(`/admin/module/${m.moduleKey}`)"
        >
          进入子后台 →
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-modules { max-width: 1100px; }
.page-title { margin: 0 0 6px; font-size: 1.4rem; color: var(--text-strong, #222); }
.page-desc { margin: 0 0 24px; font-size: 0.9rem; color: var(--text-muted, #888); }
.loading-state { padding: 20px; }

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.module-card {
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow 0.2s, transform 0.2s;
}

.module-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.module-icon { font-size: 1.8rem; flex-shrink: 0; }
.module-name { font-size: 0.95rem; font-weight: 600; color: var(--text-strong, #222); margin-bottom: 4px; }
.cat-tag { margin: 0; }

.card-stats {
  display: flex;
  gap: 0;
  border-top: 1px solid var(--line, #f0f0f0);
  padding-top: 12px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-val { font-size: 1.2rem; font-weight: 700; color: var(--brand-deep, #c03020); }
.stat-lbl { font-size: 0.78rem; color: var(--text-muted, #888); margin-top: 2px; }

.enter-btn { width: 100%; }
</style>
