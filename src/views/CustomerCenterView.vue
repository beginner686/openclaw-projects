<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { moduleMap } from '@/config/modules'
import { fetchCustomerDashboard } from '@/api/customer'
import { useAuthStore } from '@/stores/auth'
import type { CustomerDashboardData, ModuleTaskResult } from '@/types/domain'

const auth = useAuthStore()
const loading = ref(true)
const errorText = ref('')
const dashboard = ref<CustomerDashboardData | null>(null)

const totalModuleCount = computed(() => moduleMap.size)
const recentTasks = computed(() => dashboard.value?.recentTasks ?? [])
const openedModules = computed(() =>
  (dashboard.value?.openedModules ?? [])
    .map((moduleKey) => moduleMap.get(moduleKey))
    .filter((item): item is NonNullable<typeof item> => Boolean(item)),
)

const openedModuleCount = computed(() => openedModules.value.length)
const runningTaskCount = computed(
  () => recentTasks.value.filter((item) => item.status === 'running' || item.status === 'queued').length,
)
const completedTaskCount = computed(() => recentTasks.value.filter((item) => item.status === 'completed').length)
const failedTaskCount = computed(() => recentTasks.value.filter((item) => item.status === 'failed').length)
const reportCount = computed(() => dashboard.value?.reports.length ?? 0)

const completionRate = computed(() => {
  const total = recentTasks.value.length
  if (total === 0) return 0
  return Math.round((completedTaskCount.value / total) * 100)
})

const activationRate = computed(() => {
  if (totalModuleCount.value === 0) return 0
  return Math.round((openedModuleCount.value / totalModuleCount.value) * 100)
})

const automationScore = computed(() => {
  const rateScore = completionRate.value * 0.7
  const moduleScore = activationRate.value * 0.2
  const stabilityPenalty = Math.min(failedTaskCount.value * 6, 18)
  return Math.max(0, Math.round(rateScore + moduleScore + 10 - stabilityPenalty))
})

const scoreLevel = computed(() => {
  if (automationScore.value >= 90) return '卓越'
  if (automationScore.value >= 75) return '稳定'
  if (automationScore.value >= 60) return '可优化'
  return '待提升'
})

const scoreLevelColor = computed(() => {
  if (automationScore.value >= 90) return '#34d399'
  if (automationScore.value >= 75) return '#4f8ef7'
  if (automationScore.value >= 60) return '#fbbf24'
  return '#f87171'
})

const lastSyncText = computed(() => {
  const latest = recentTasks.value[0]?.updatedAt
  return latest ? formatDateTime(latest) : '--'
})

const enterpriseCount = computed(() => openedModules.value.filter((item) => item.category === 'enterprise').length)
const personalCount = computed(() => openedModules.value.filter((item) => item.category === 'personal').length)

const statusRatio = computed(() => {
  const total = recentTasks.value.length || 1
  return {
    done: Math.round((completedTaskCount.value / total) * 100),
    working: Math.round((runningTaskCount.value / total) * 100),
    failed: Math.round((failedTaskCount.value / total) * 100),
  }
})

// SVG 圆环参数
const RING_R = 52
const RING_CIRCUM = computed(() => 2 * Math.PI * RING_R)
const ringDash = computed(() => (automationScore.value / 100) * RING_CIRCUM.value)
const ringGap = computed(() => RING_CIRCUM.value - ringDash.value)

function statusLabel(status: ModuleTaskResult['status']) {
  if (status === 'completed') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'running') return '执行中'
  return '排队中'
}

function statusClass(status: ModuleTaskResult['status']) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'warning'
  return 'pending'
}

function moduleName(moduleKey: string) {
  return moduleMap.get(moduleKey)?.name ?? moduleKey
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

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
  <section class="page-container command-page">

    <!-- ═══════════════ HERO ═══════════════ -->
    <header class="card-panel mission-hero">
      <!-- 背景装饰层 -->
      <div class="hero-bg">
        <div class="bg-aurora bg-aurora-1"></div>
        <div class="bg-aurora bg-aurora-2"></div>
        <div class="bg-grid"></div>
        <div class="bg-noise"></div>
      </div>

      <!-- 左侧主内容 -->
      <div class="hero-main">
        <p class="hero-kicker">
          <span class="kicker-dot"></span>
          CLAWPILOT COMMAND DECK
        </p>
        <h2 class="section-title">客户中心</h2>
        <p class="section-subtitle">
          欢迎回来，<strong class="name-highlight">{{ auth.user?.name }}</strong>。
          你的自动化系统正在持续运行，这里是全局态势与执行结果总览。
        </p>

        <div class="hero-meta">
          <div class="meta-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            最近同步 {{ lastSyncText }}
          </div>
          <div class="meta-badge" :style="{ color: scoreLevelColor, borderColor: scoreLevelColor + '44', background: scoreLevelColor + '18' }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="currentColor"/>
            </svg>
            健康等级 {{ scoreLevel }}
          </div>
          <div class="meta-badge success-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            完成率 {{ completionRate }}%
          </div>
        </div>

        <button class="refresh-btn" @click="loadDashboard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          刷新数据
        </button>
      </div>

      <!-- 右侧评分环 -->
      <div class="hero-side">
        <div class="score-ring-wrap">
          <svg class="score-svg" viewBox="0 0 130 130" width="130" height="130">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4f8ef7"/>
                <stop offset="100%" stop-color="#22d3ee"/>
              </linearGradient>
              <filter id="ringGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <!-- 轨道圆 -->
            <circle cx="65" cy="65" :r="RING_R" fill="none" stroke="rgba(79,142,247,0.12)" stroke-width="10"/>
            <!-- 进度弧 -->
            <circle
              cx="65" cy="65"
              :r="RING_R"
              fill="none"
              stroke="url(#ringGrad)"
              stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="`${ringDash} ${ringGap}`"
              stroke-dashoffset="0"
              transform="rotate(-90 65 65)"
              filter="url(#ringGlow)"
              class="ring-progress"
            />
            <!-- 中心文字 -->
            <text x="65" y="58" text-anchor="middle" fill="#e8edf8" font-size="26" font-weight="800" font-family="inherit">{{ automationScore }}</text>
            <text x="65" y="74" text-anchor="middle" fill="#6b7fa3" font-size="10" letter-spacing="1" font-family="inherit">自动化评分</text>
            <!-- 等级标签 -->
            <text x="65" y="90" text-anchor="middle" :fill="scoreLevelColor" font-size="11" font-weight="700" font-family="inherit">{{ scoreLevel }}</text>
          </svg>
          <!-- 外圈装饰 -->
          <div class="ring-orbit"></div>
          <div class="ring-dot ring-dot-1"></div>
          <div class="ring-dot ring-dot-2"></div>
        </div>
      </div>
    </header>

    <!-- ═══════════════ SKELETON / CONTENT ═══════════════ -->
    <el-skeleton :loading="loading" animated :rows="8">
      <template #default>

        <!-- ── KPI 指标卡片 ── -->
        <div class="kpi-grid">

          <!-- 模块开通率 -->
          <article class="card-panel kpi-card kpi-blue">
            <div class="kpi-icon-wrap kpi-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="9" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
                <rect x="13" y="2" width="9" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
                <rect x="2" y="13" width="9" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
                <rect x="13" y="13" width="9" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="kpi-body">
              <p class="kpi-label">模块开通率</p>
              <p class="kpi-value">{{ openedModuleCount }}<span class="kpi-unit">/{{ totalModuleCount }}</span></p>
              <div class="kpi-bar-track">
                <div class="kpi-bar-fill kpi-bar-blue" :style="{ width: `${activationRate}%` }"></div>
              </div>
              <p class="kpi-note">
                <span class="dot dot-blue"></span>企业 {{ enterpriseCount }}
                <span class="dot dot-cyan"></span>个人 {{ personalCount }}
              </p>
            </div>
          </article>

          <!-- 执行中任务 -->
          <article class="card-panel kpi-card kpi-amber">
            <div class="kpi-icon-wrap kpi-icon-amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h8l-1 8 10-12h-8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="kpi-body">
              <p class="kpi-label">执行中任务</p>
              <p class="kpi-value">{{ runningTaskCount }}</p>
              <div class="kpi-bar-track">
                <div class="kpi-bar-fill kpi-bar-amber" :style="{ width: `${statusRatio.working}%` }"></div>
              </div>
              <p class="kpi-note">
                <span class="dot dot-amber"></span>工作负载占比 {{ statusRatio.working }}%
              </p>
            </div>
          </article>

          <!-- 任务完成率 -->
          <article class="card-panel kpi-card kpi-green">
            <div class="kpi-icon-wrap kpi-icon-green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="kpi-body">
              <p class="kpi-label">任务完成率</p>
              <p class="kpi-value">{{ completionRate }}<span class="kpi-unit">%</span></p>
              <div class="kpi-bar-track">
                <div class="kpi-bar-fill kpi-bar-green" :style="{ width: `${completionRate}%` }"></div>
              </div>
              <p class="kpi-note">
                <span class="dot dot-green"></span>完成 {{ completedTaskCount }}
                <span class="dot dot-red"></span>失败 {{ failedTaskCount }}
              </p>
            </div>
          </article>

          <!-- 报告产出 -->
          <article class="card-panel kpi-card kpi-purple">
            <div class="kpi-icon-wrap kpi-icon-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="kpi-body">
              <p class="kpi-label">报告产出</p>
              <p class="kpi-value">{{ reportCount }}<span class="kpi-unit">份</span></p>
              <div class="kpi-bar-track">
                <div class="kpi-bar-fill kpi-bar-purple" :style="{ width: `${Math.min(reportCount * 16, 100)}%` }"></div>
              </div>
              <p class="kpi-note">
                <span class="dot dot-purple"></span>面向复盘、留档与协同
              </p>
            </div>
          </article>
        </div>

        <el-alert v-if="errorText" :title="errorText" type="error" show-icon :closable="false" />

        <!-- ── 主内容双栏 ── -->
        <div class="main-grid">

          <!-- 任务流（时间轴） -->
          <section class="card-panel task-stream">
            <div class="block-head">
              <div class="block-head-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="block-icon">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h3>任务流态势</h3>
              </div>
              <span class="block-count">{{ recentTasks.length }} 条</span>
            </div>

            <div v-if="recentTasks.length" class="task-timeline">
              <article v-for="task in recentTasks.slice(0, 8)" :key="task.taskId" class="tl-item">
                <div class="tl-line-wrap">
                  <div class="tl-dot" :class="statusClass(task.status)"></div>
                  <div class="tl-bar"></div>
                </div>
                <div class="tl-content">
                  <div class="tl-top">
                    <strong>{{ moduleName(task.moduleKey) }}</strong>
                    <span class="status-pill" :class="statusClass(task.status)">{{ statusLabel(task.status) }}</span>
                  </div>
                  <p class="tl-summary">{{ task.summary }}</p>
                  <div class="tl-foot">
                    <span class="tl-key">{{ task.moduleKey }}</span>
                    <span class="tl-time">{{ formatDateTime(task.updatedAt) }}</span>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.35">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p>暂无任务记录，创建自动化任务后会在这里展示执行态势。</p>
            </div>
          </section>

          <!-- 模块矩阵 -->
          <section class="card-panel module-matrix">
            <div class="block-head">
              <div class="block-head-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="block-icon">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/>
                </svg>
                <h3>模块矩阵</h3>
              </div>
              <span class="block-count">{{ openedModules.length }} 个已开通</span>
            </div>
            <div class="module-grid">
              <div v-for="item in openedModules" :key="item.moduleKey" class="module-card">
                <div class="mc-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h8l-1 8 10-12h-8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  </svg>
                </div>
                <span class="mc-name">{{ item.name }}</span>
                <span class="mc-badge" :class="item.category === 'enterprise' ? 'badge-blue' : 'badge-cyan'">
                  {{ item.category === 'enterprise' ? '企业' : '个人' }}
                </span>
              </div>
            </div>
            <div v-if="!openedModules.length" class="empty-state">
              <p>暂无已开通模块。</p>
            </div>
          </section>
        </div>

        <!-- ── 底栏双列 ── -->
        <div class="bottom-grid">

          <!-- 报告中心 -->
          <section class="card-panel report-list">
            <div class="block-head">
              <div class="block-head-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="block-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                <h3>报告中心</h3>
              </div>
              <span class="block-count">{{ reportCount }} 份</span>
            </div>
            <a v-for="report in dashboard?.reports ?? []" :key="report.id" :href="report.url" class="report-row">
              <div class="report-row-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="report-row-body">
                <strong>{{ report.title }}</strong>
                <span>{{ formatDateTime(report.createdAt) }}</span>
              </div>
              <span class="format-tag">{{ report.format.toUpperCase() }}</span>
            </a>
            <div v-if="(dashboard?.reports ?? []).length === 0" class="empty-state">
              <p>暂无报告，任务完成后将自动沉淀。</p>
            </div>
          </section>

          <!-- 系统提醒 -->
          <section class="card-panel notice-list">
            <div class="block-head">
              <div class="block-head-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="block-icon">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h3>系统提醒</h3>
              </div>
              <span class="block-count">{{ dashboard?.notifications.length ?? 0 }} 条</span>
            </div>
            <article v-for="notice in dashboard?.notifications ?? []" :key="notice.id" class="notice-row">
              <div
                class="notice-level-bar"
                :class="{
                  'lv-warn': notice.level === 'warning',
                  'lv-ok': notice.level === 'success',
                  'lv-info': notice.level === 'info'
                }"
              ></div>
              <div class="notice-body">
                <div class="notice-top">
                  <strong>{{ notice.title }}</strong>
                  <span
                    class="notice-tag"
                    :class="{
                      'tag-warn': notice.level === 'warning',
                      'tag-ok': notice.level === 'success',
                      'tag-info': notice.level === 'info'
                    }"
                  >
                    {{ notice.level === 'warning' ? '提醒' : notice.level === 'success' ? '完成' : '信息' }}
                  </span>
                </div>
                <p>{{ formatDateTime(notice.createdAt) }}</p>
              </div>
            </article>
            <div v-if="(dashboard?.notifications ?? []).length === 0" class="empty-state">
              <p>暂无系统提醒。</p>
            </div>
          </section>
        </div>

      </template>
    </el-skeleton>
  </section>
</template>

<style scoped>
/* ╔══════════════════════════════════════════╗
   ║  LOCAL DESIGN TOKENS                      ║
   ╚══════════════════════════════════════════╝ */
.command-page {
  --cp-bg: transparent;
}

/* ╔══════════════════════════════════════════╗
   ║  HERO                                     ║
   ╚══════════════════════════════════════════╝ */
.mission-hero {
  position: relative;
  overflow: hidden;
  padding: 28px 32px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: center;
  border-color: var(--line-bright);
  background: rgba(10, 16, 36, 0.85);
}

/* 背景层 */
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.bg-aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}

.bg-aurora-1 {
  width: 55%;
  height: 200%;
  top: -50%;
  left: -10%;
  background: radial-gradient(circle, rgba(31, 95, 244, 0.28) 0%, transparent 65%);
}

.bg-aurora-2 {
  width: 40%;
  height: 160%;
  top: -30%;
  right: 5%;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.16) 0%, transparent 65%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(79, 142, 247, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(79, 142, 247, 0.08) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: linear-gradient(to bottom right, rgba(0,0,0,0.7) 20%, transparent 80%);
}

.bg-noise {
  position: absolute;
  inset: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.hero-main,
.hero-side {
  position: relative;
  z-index: 2;
}

/* Kicker */
.hero-kicker {
  margin: 0 0 8px;
  font-size: 0.72rem;
  color: var(--brand);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.kicker-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 10px var(--brand-glow), 0 0 20px var(--brand-glow);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 10px var(--brand-glow); }
  50% { opacity: 0.6; box-shadow: 0 0 20px var(--brand-glow), 0 0 40px var(--brand-glow); }
}

.name-highlight {
  color: var(--cyan);
  font-weight: 700;
}

/* Meta badges */
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--line-bright);
  background: rgba(79, 142, 247, 0.08);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 0.76rem;
  font-weight: 500;
  backdrop-filter: blur(8px);
}

.success-badge {
  color: var(--ok);
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.08);
}

/* Refresh button */
.refresh-btn {
  margin-top: 20px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 999px;
  border: 1px solid var(--line-bright);
  background: linear-gradient(135deg, rgba(31, 95, 244, 0.2), rgba(34, 211, 238, 0.1));
  color: var(--brand);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.22s ease;
  font-family: inherit;
}

.refresh-btn:hover {
  background: linear-gradient(135deg, rgba(31, 95, 244, 0.35), rgba(34, 211, 238, 0.18));
  border-color: var(--brand);
  box-shadow: 0 0 20px var(--brand-glow);
  transform: translateY(-1px);
}

/* ── Score Ring ── */
.hero-side {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.score-ring-wrap {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-svg {
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 16px rgba(79, 142, 247, 0.3));
}

.ring-progress {
  transition: stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.ring-orbit {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px dashed rgba(79, 142, 247, 0.2);
  animation: spin-slow 20s linear infinite;
}

.ring-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 10px var(--brand-glow);
}

.ring-dot-1 {
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  animation: spin-slow 20s linear infinite;
  transform-origin: 4px 76px;
}

.ring-dot-2 {
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--cyan);
  box-shadow: 0 0 10px var(--cyan-glow);
  animation: spin-slow 20s linear infinite reverse;
  transform-origin: 4px -72px;
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ╔══════════════════════════════════════════╗
   ║  KPI CARDS                                ║
   ╚══════════════════════════════════════════╝ */
.kpi-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-card {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: rgba(14, 20, 44, 0.70);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 40px rgba(0, 8, 32, 0.5);
}

/* Icon wrappers */
.kpi-icon-wrap {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon-blue   { background: linear-gradient(135deg, rgba(79,142,247,0.25), rgba(34,211,238,0.12)); color: var(--brand); border: 1px solid rgba(79,142,247,0.25); }
.kpi-icon-amber  { background: linear-gradient(135deg, rgba(251,191,36,0.22), rgba(249,115,22,0.12)); color: var(--warn);  border: 1px solid rgba(251,191,36,0.25); }
.kpi-icon-green  { background: linear-gradient(135deg, rgba(52,211,153,0.22), rgba(16,185,129,0.12)); color: var(--ok);    border: 1px solid rgba(52,211,153,0.25); }
.kpi-icon-purple { background: linear-gradient(135deg, rgba(167,139,250,0.22), rgba(139,92,246,0.12)); color: #a78bfa;   border: 1px solid rgba(167,139,250,0.25); }

.kpi-body {
  flex: 1;
  min-width: 0;
}

.kpi-label {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 500;
}

.kpi-value {
  margin: 6px 0 10px;
  font-size: 2.1rem;
  line-height: 1;
  font-weight: 800;
}

.kpi-blue   .kpi-value { color: var(--brand); }
.kpi-amber  .kpi-value { color: var(--warn); }
.kpi-green  .kpi-value { color: var(--ok); }
.kpi-purple .kpi-value { color: #a78bfa; }

.kpi-unit {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-left: 2px;
}

.kpi-bar-track {
  height: 5px;
  border-radius: 999px;
  background: rgba(255,255,255,0.07);
  overflow: hidden;
  margin-bottom: 8px;
}

.kpi-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.kpi-bar-blue   { background: linear-gradient(90deg, var(--brand-deep), var(--cyan)); }
.kpi-bar-amber  { background: linear-gradient(90deg, var(--warn), var(--accent)); }
.kpi-bar-green  { background: linear-gradient(90deg, #059669, var(--ok)); }
.kpi-bar-purple { background: linear-gradient(90deg, #7c3aed, #a78bfa); }

.kpi-note {
  margin: 0;
  font-size: 0.76rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.dot-blue   { background: var(--brand); }
.dot-cyan   { background: var(--cyan); }
.dot-amber  { background: var(--warn); }
.dot-green  { background: var(--ok); }
.dot-red    { background: var(--danger); }
.dot-purple { background: #a78bfa; }

/* ╔══════════════════════════════════════════╗
   ║  BLOCK HEADER                             ║
   ╚══════════════════════════════════════════╝ */
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.block-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.block-icon {
  color: var(--brand);
  flex-shrink: 0;
}

.block-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-strong);
}

.block-count {
  font-size: 0.78rem;
  color: var(--text-muted);
  background: rgba(79, 142, 247, 0.1);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 10px;
}

/* ╔══════════════════════════════════════════╗
   ║  MAIN GRID + TASK TIMELINE                ║
   ╚══════════════════════════════════════════╝ */
.main-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 14px;
}

.task-stream,
.module-matrix,
.report-list,
.notice-list {
  padding: 20px;
  background: rgba(14, 20, 44, 0.70);
}

.task-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tl-item {
  display: flex;
  gap: 14px;
  padding: 0 0 16px 0;
}

.tl-item:last-child .tl-bar {
  display: none;
}

.tl-line-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
  padding-top: 4px;
}

.tl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid;
}

.tl-dot.success { background: var(--ok);     border-color: var(--ok);     box-shadow: 0 0 10px var(--ok-glow); }
.tl-dot.danger  { background: var(--danger);  border-color: var(--danger);  box-shadow: 0 0 10px var(--danger-glow); }
.tl-dot.warning { background: var(--warn);    border-color: var(--warn);    box-shadow: 0 0 10px var(--warn-glow); }
.tl-dot.pending { background: var(--brand);   border-color: var(--brand);   box-shadow: 0 0 10px var(--brand-glow); }

.tl-bar {
  flex: 1;
  width: 1.5px;
  background: var(--line);
  margin-top: 4px;
}

.tl-content {
  flex: 1;
  min-width: 0;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  transition: border-color 0.2s, background 0.2s;
}

.tl-content:hover {
  border-color: var(--line-bright);
  background: rgba(79, 142, 247, 0.05);
}

.tl-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.tl-top strong {
  font-size: 0.9rem;
  color: var(--text-strong);
}

.tl-summary {
  margin: 6px 0;
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.55;
}

.tl-foot {
  display: flex;
  justify-content: space-between;
  font-size: 0.73rem;
  color: var(--text-dim);
}

.tl-key {
  font-family: 'SF Mono', 'Fira Code', monospace;
  background: rgba(79, 142, 247, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
}

/* Status pills */
.status-pill {
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid transparent;
  flex-shrink: 0;
}

.status-pill.success { color: var(--ok);    background: var(--ok-glow);     border-color: rgba(52,211,153,0.35); }
.status-pill.warning { color: var(--warn);  background: var(--warn-glow);   border-color: rgba(251,191,36,0.35); }
.status-pill.pending { color: var(--brand); background: var(--brand-glow);  border-color: rgba(79,142,247,0.35); }
.status-pill.danger  { color: var(--danger);background: var(--danger-glow); border-color: rgba(248,113,113,0.35); }

/* ╔══════════════════════════════════════════╗
   ║  MODULE MATRIX                            ║
   ╚══════════════════════════════════════════╝ */
.module-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255,255,255,0.025);
  transition: all 0.2s ease;
  cursor: default;
}

.module-card:hover {
  border-color: var(--line-bright);
  background: rgba(79, 142, 247, 0.07);
  transform: translateY(-1px);
}

.mc-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(79, 142, 247, 0.12);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mc-name {
  flex: 1;
  font-size: 0.82rem;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mc-badge {
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.badge-blue { background: rgba(79,142,247,0.18); color: var(--brand); }
.badge-cyan { background: rgba(34,211,238,0.12); color: var(--cyan); }

/* ╔══════════════════════════════════════════╗
   ║  BOTTOM GRID                              ║
   ╚══════════════════════════════════════════╝ */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.report-list,
.notice-list {
  display: grid;
  align-content: start;
  gap: 8px;
}

/* Report rows */
.report-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255,255,255,0.025);
  transition: all 0.2s ease;
}

.report-row:hover {
  border-color: var(--line-bright);
  background: rgba(79, 142, 247, 0.06);
  transform: translateX(2px);
}

.report-row-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(79,142,247,0.1);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-row-body {
  flex: 1;
  min-width: 0;
}

.report-row-body strong {
  display: block;
  font-size: 0.88rem;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-row-body span {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.format-tag {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 5px;
  background: rgba(79,142,247,0.15);
  color: var(--brand);
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

/* Notice rows */
.notice-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255,255,255,0.025);
  overflow: hidden;
  transition: all 0.2s ease;
}

.notice-row:hover {
  border-color: var(--line-bright);
  background: rgba(79,142,247,0.05);
}

.notice-level-bar {
  width: 4px;
  flex-shrink: 0;
}

.lv-warn { background: var(--warn); }
.lv-ok   { background: var(--ok); }
.lv-info { background: var(--brand); }

.notice-body {
  flex: 1;
  padding: 10px 12px;
}

.notice-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.notice-top strong {
  font-size: 0.88rem;
  color: var(--text-strong);
}

.notice-body p {
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.notice-tag {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.tag-warn { background: var(--warn-glow); color: var(--warn); }
.tag-ok   { background: var(--ok-glow);   color: var(--ok); }
.tag-info { background: var(--brand-glow); color: var(--brand); }

/* ╔══════════════════════════════════════════╗
   ║  EMPTY STATE                              ║
   ╚══════════════════════════════════════════╝ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  color: var(--text-muted);
  font-size: 0.86rem;
  text-align: center;
}

.empty-state p {
  margin: 0;
}

/* ╔══════════════════════════════════════════╗
   ║  RESPONSIVE                               ║
   ╚══════════════════════════════════════════╝ */
@media (max-width: 1240px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 840px) {
  .mission-hero {
    grid-template-columns: 1fr;
  }

  .hero-side {
    justify-content: flex-start;
  }

  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .module-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .kpi-card {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
