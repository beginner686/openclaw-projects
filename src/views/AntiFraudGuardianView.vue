<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  activateAntiFraudSubscription,
  createAntiFraudComplaint,
  createAntiFraudTarget,
  deleteAntiFraudTarget,
  fetchAntiFraudComplaints,
  fetchAntiFraudDashboard,
  fetchAntiFraudEvidences,
  fetchAntiFraudPlans,
  fetchAntiFraudReports,
  fetchAntiFraudScans,
  fetchAntiFraudSubscription,
  fetchAntiFraudTargets,
  generateAntiFraudReport,
  runAntiFraudScan,
} from '@/api/anti-fraud'
import type {
  AntiFraudComplaint,
  AntiFraudDashboardData,
  AntiFraudEvidence,
  AntiFraudPlan,
  AntiFraudReport,
  AntiFraudScan,
  AntiFraudSubscription,
  AntiFraudTarget,
  AntiFraudUsage,
} from '@/types/domain'

const loading = ref(true)
const activeTab = ref('targets')

const MAX_TARGET_NAME_LENGTH = 80
const MAX_ACCOUNT_HANDLE_LENGTH = 80
const MAX_SOURCE_TITLE_LENGTH = 120
const MAX_SCAN_TEXT_LENGTH = 5000
const MAX_COMPLAINT_EVIDENCES = 20

const dashboard = ref<AntiFraudDashboardData | null>(null)
const plans = ref<AntiFraudPlan[]>([])
const subscription = ref<AntiFraudSubscription | null>(null)
const usage = ref<AntiFraudUsage | null>(null)
const targets = ref<AntiFraudTarget[]>([])
const scans = ref<AntiFraudScan[]>([])
const evidences = ref<AntiFraudEvidence[]>([])
const reports = ref<AntiFraudReport[]>([])
const complaints = ref<AntiFraudComplaint[]>([])

const creatingTarget = ref(false)
const runningScan = ref(false)
const creatingComplaint = ref(false)
const generatingReport = ref(false)
const activatingPlan = ref('')

const targetForm = reactive({
  targetType: 'short-video-account',
  platform: 'douyin',
  anchorName: '',
  accountHandle: '',
  roomLink: '',
  notes: '',
})

const scanForm = reactive({
  targetId: '',
  sourceTitle: '',
  sourceLink: '',
  contentText: '',
})

const reportForm = reactive({
  periodType: 'weekly' as 'weekly' | 'monthly',
})

const complaintForm = reactive({
  scenario: 'false-health-promotion',
  evidenceIds: [] as string[],
  transactionNotes: '',
  factsSummary: '',
})

const complaintPreview = computed(() => complaints.value[0]?.generatedText ?? '')

const canCreateTarget = computed(() => {
  if (!usage.value) return false
  return usage.value.targetCount < usage.value.targetQuota
})

const riskTagType = (level: string) => {
  if (level === 'high') return 'danger'
  if (level === 'medium') return 'warning'
  return 'success'
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function refreshAll() {
  loading.value = true
  try {
    const [dashboardData, planList, subData, targetList, scanList, evidenceList, reportList, complaintList] = await Promise.all([
      fetchAntiFraudDashboard(),
      fetchAntiFraudPlans(),
      fetchAntiFraudSubscription(),
      fetchAntiFraudTargets(),
      fetchAntiFraudScans(),
      fetchAntiFraudEvidences(),
      fetchAntiFraudReports(),
      fetchAntiFraudComplaints(),
    ])

    dashboard.value = dashboardData
    plans.value = planList
    subscription.value = subData.subscription
    usage.value = subData.usage
    targets.value = targetList
    scans.value = scanList
    evidences.value = evidenceList
    reports.value = reportList
    complaints.value = complaintList
  } catch (error) {
    const message = error instanceof Error ? error.message : '反诈模块数据加载失败。'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

async function onActivatePlan(planCode: 'basic' | 'standard' | 'enterprise') {
  activatingPlan.value = planCode
  try {
    await activateAntiFraudSubscription({ planCode, months: 1 })
    ElMessage.success('套餐已人工开通（无支付模式）。')
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '套餐开通失败。'
    ElMessage.error(message)
  } finally {
    activatingPlan.value = ''
  }
}

async function onCreateTarget() {
  const anchorName = targetForm.anchorName.trim()
  const accountHandle = targetForm.accountHandle.trim()
  if (!anchorName || !accountHandle) {
    ElMessage.warning('请填写对象名称和账号标识。')
    return
  }
  if (anchorName.length > MAX_TARGET_NAME_LENGTH) {
    ElMessage.warning(`对象名称不能超过 ${MAX_TARGET_NAME_LENGTH} 字符。`)
    return
  }
  if (accountHandle.length > MAX_ACCOUNT_HANDLE_LENGTH) {
    ElMessage.warning(`账号标识不能超过 ${MAX_ACCOUNT_HANDLE_LENGTH} 字符。`)
    return
  }

  creatingTarget.value = true
  try {
    await createAntiFraudTarget({
      ...targetForm,
      anchorName,
      accountHandle,
      roomLink: targetForm.roomLink.trim(),
      notes: targetForm.notes.trim(),
    })
    ElMessage.success('监测对象已添加。')
    targetForm.anchorName = ''
    targetForm.accountHandle = ''
    targetForm.roomLink = ''
    targetForm.notes = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '添加监测对象失败。'
    ElMessage.error(message)
  } finally {
    creatingTarget.value = false
  }
}

async function onDeleteTarget(target: AntiFraudTarget) {
  try {
    await ElMessageBox.confirm(`确认删除监测对象“${target.anchorName}”？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteAntiFraudTarget(target.targetId)
    ElMessage.success('监测对象已删除。')
    await refreshAll()
  } catch {
    // user canceled or request failed (message handled below only for request)
  }
}

async function onRunScan() {
  const sourceTitle = scanForm.sourceTitle.trim()
  const contentText = scanForm.contentText.trim()
  if (!sourceTitle || !contentText) {
    ElMessage.warning('请填写内容标题和文本内容。')
    return
  }
  if (sourceTitle.length > MAX_SOURCE_TITLE_LENGTH) {
    ElMessage.warning(`内容标题不能超过 ${MAX_SOURCE_TITLE_LENGTH} 字符。`)
    return
  }
  if (contentText.length > MAX_SCAN_TEXT_LENGTH) {
    ElMessage.warning(`文本内容不能超过 ${MAX_SCAN_TEXT_LENGTH} 字符。`)
    return
  }

  runningScan.value = true
  try {
    const result = await runAntiFraudScan({
      ...scanForm,
      sourceTitle,
      sourceLink: scanForm.sourceLink.trim(),
      contentText,
    })
    ElMessage.success(result.notice)
    scanForm.sourceTitle = ''
    scanForm.sourceLink = ''
    scanForm.contentText = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '扫描失败。'
    ElMessage.error(message)
  } finally {
    runningScan.value = false
  }
}

async function onGenerateReport() {
  generatingReport.value = true
  try {
    await generateAntiFraudReport({ periodType: reportForm.periodType })
    ElMessage.success('风险报告已生成。')
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成报告失败。'
    ElMessage.error(message)
  } finally {
    generatingReport.value = false
  }
}

async function onCreateComplaint() {
  if (!complaintForm.evidenceIds.length) {
    ElMessage.warning('请至少选择一条证据。')
    return
  }
  if (complaintForm.evidenceIds.length > MAX_COMPLAINT_EVIDENCES) {
    ElMessage.warning(`证据最多选择 ${MAX_COMPLAINT_EVIDENCES} 条。`)
    return
  }
  creatingComplaint.value = true
  try {
    await createAntiFraudComplaint({
      ...complaintForm,
      transactionNotes: complaintForm.transactionNotes.trim(),
      factsSummary: complaintForm.factsSummary.trim(),
    })
    ElMessage.success('投诉材料已生成。')
    complaintForm.evidenceIds = []
    complaintForm.transactionNotes = ''
    complaintForm.factsSummary = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成投诉材料失败。'
    ElMessage.error(message)
  } finally {
    creatingComplaint.value = false
  }
}

onMounted(() => {
  void refreshAll()
})
</script>

<template>
  <section class="anti-fraud-page">
    <header class="hero card-panel">
      <div>
        <h2>全域反诈守护</h2>
        <p>AI 中老年健康信息净化器 + 防骗证据助手（无支付版商业系统）</p>
      </div>
      <el-button type="primary" plain @click="refreshAll">刷新</el-button>
    </header>

    <el-skeleton :loading="loading" animated :rows="8">
      <template #default>
        <section class="card-panel overview" v-if="dashboard && subscription && usage">
          <div class="stat">
            <label>当前套餐</label>
            <strong>{{ subscription.planName }}</strong>
          </div>
          <div class="stat">
            <label>监测对象</label>
            <strong>{{ usage.targetCount }}/{{ usage.targetQuota }}</strong>
          </div>
          <div class="stat">
            <label>本月投诉额度</label>
            <strong>{{ usage.complaintUsed }}/{{ usage.complaintQuota }}</strong>
          </div>
          <div class="stat">
            <label>高风险内容</label>
            <strong>{{ dashboard.stats.highRisk }}</strong>
          </div>
          <div class="stat">
            <label>证据归档</label>
            <strong>{{ dashboard.stats.evidences }}</strong>
          </div>
          <div class="stat">
            <label>报告数量</label>
            <strong>{{ dashboard.stats.reports }}</strong>
          </div>
        </section>

        <el-tabs v-model="activeTab" class="af-tabs">
          <el-tab-pane label="监测对象" name="targets">
            <section class="panel-grid">
              <article class="card-panel form-panel">
                <h3>新增监测对象</h3>
                <el-form label-position="top">
                  <el-form-item label="对象类型">
                    <el-select v-model="targetForm.targetType">
                      <el-option label="短视频账号" value="short-video-account" />
                      <el-option label="直播间" value="live-room" />
                      <el-option label="主播" value="anchor" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="平台">
                    <el-select v-model="targetForm.platform">
                      <el-option label="抖音" value="douyin" />
                      <el-option label="快手" value="kuaishou" />
                      <el-option label="视频号" value="wechat-video" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="对象名称">
                    <el-input v-model="targetForm.anchorName" placeholder="例如：养生课堂A" />
                  </el-form-item>
                  <el-form-item label="账号标识">
                    <el-input v-model="targetForm.accountHandle" placeholder="例如：@health-a" />
                  </el-form-item>
                  <el-form-item label="链接">
                    <el-input v-model="targetForm.roomLink" placeholder="可选" />
                  </el-form-item>
                  <el-form-item label="备注">
                    <el-input v-model="targetForm.notes" type="textarea" :rows="2" />
                  </el-form-item>
                  <el-button type="primary" :loading="creatingTarget" :disabled="!canCreateTarget" @click="onCreateTarget">
                    添加对象
                  </el-button>
                </el-form>
              </article>

              <article class="card-panel list-panel">
                <h3>已配置对象</h3>
                <el-empty v-if="!targets.length" description="暂无监测对象" />
                <div v-else class="item-list">
                  <div v-for="target in targets" :key="target.targetId" class="item-row">
                    <div>
                      <strong>{{ target.anchorName }}</strong>
                      <p>{{ target.platform }} · {{ target.accountHandle }}</p>
                      <p>{{ target.notes || '无备注' }}</p>
                    </div>
                    <el-button text type="danger" @click="onDeleteTarget(target)">删除</el-button>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="风险识别" name="scans">
            <section class="panel-grid">
              <article class="card-panel form-panel">
                <h3>新建识别任务</h3>
                <el-form label-position="top">
                  <el-form-item label="关联对象">
                    <el-select v-model="scanForm.targetId" clearable>
                      <el-option v-for="target in targets" :key="target.targetId" :label="target.anchorName" :value="target.targetId" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="内容标题">
                    <el-input v-model="scanForm.sourceTitle" />
                  </el-form-item>
                  <el-form-item label="内容链接">
                    <el-input v-model="scanForm.sourceLink" />
                  </el-form-item>
                  <el-form-item label="文本内容">
                    <el-input v-model="scanForm.contentText" type="textarea" :rows="6" placeholder="粘贴直播话术/短视频文案..." />
                  </el-form-item>
                  <el-button type="primary" :loading="runningScan" @click="onRunScan">开始识别</el-button>
                </el-form>
              </article>

              <article class="card-panel list-panel">
                <h3>识别结果</h3>
                <el-empty v-if="!scans.length" description="暂无识别记录" />
                <div v-else class="scan-list">
                  <div v-for="scan in scans" :key="scan.scanId" class="scan-item">
                    <div class="row-between">
                      <strong>{{ scan.sourceTitle }}</strong>
                      <el-tag :type="riskTagType(scan.riskLevel)">{{ scan.riskLevel }} · {{ scan.riskScore }}</el-tag>
                    </div>
                    <p>{{ scan.summary }}</p>
                    <p class="muted">命中：{{ scan.hitPhrases.join('、') || '无' }}</p>
                    <p class="muted">{{ formatTime(scan.createdAt) }}</p>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="证据中心" name="evidences">
            <section class="card-panel single-panel">
              <h3>可疑健康宣传证据包</h3>
              <el-table :data="evidences" height="320">
                <el-table-column prop="evidenceId" label="证据ID" min-width="180" />
                <el-table-column prop="scanId" label="扫描ID" min-width="180" />
                <el-table-column label="违规点" min-width="300">
                  <template #default="scope">{{ scope.row.violationPoints.join('、') }}</template>
                </el-table-column>
                <el-table-column label="采集时间" min-width="140">
                  <template #default="scope">{{ formatTime(scope.row.capturedAt) }}</template>
                </el-table-column>
              </el-table>
            </section>
          </el-tab-pane>

          <el-tab-pane label="报告中心" name="reports">
            <section class="panel-grid">
              <article class="card-panel form-panel">
                <h3>生成风险报告</h3>
                <el-form label-position="top">
                  <el-form-item label="报告周期">
                    <el-select v-model="reportForm.periodType">
                      <el-option label="周报" value="weekly" />
                      <el-option label="月报" value="monthly" />
                    </el-select>
                  </el-form-item>
                  <el-button type="primary" :loading="generatingReport" @click="onGenerateReport">生成报告</el-button>
                </el-form>
              </article>

              <article class="card-panel list-panel">
                <h3>历史报告</h3>
                <el-empty v-if="!reports.length" description="暂无报告" />
                <div v-else class="item-list">
                  <div v-for="report in reports" :key="report.reportId" class="item-row">
                    <div>
                      <strong>{{ report.periodType === 'weekly' ? '周报' : '月报' }} · {{ report.reportId }}</strong>
                      <p>扫描总量：{{ report.overview.totalScanned }}，高风险：{{ report.overview.highRiskCount }}</p>
                      <p>{{ formatTime(report.createdAt) }}</p>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="投诉助手" name="complaints">
            <section class="panel-grid">
              <article class="card-panel form-panel">
                <h3>生成投诉材料</h3>
                <el-form label-position="top">
                  <el-form-item label="投诉场景">
                    <el-select v-model="complaintForm.scenario">
                      <el-option label="虚假健康宣传" value="false-health-promotion" />
                      <el-option label="诱导消费" value="induced-purchase" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="选择证据">
                    <el-select v-model="complaintForm.evidenceIds" multiple>
                      <el-option v-for="e in evidences" :key="e.evidenceId" :label="`${e.evidenceId} · ${e.violationPoints[0] || '违规点'}`" :value="e.evidenceId" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="交易记录说明">
                    <el-input v-model="complaintForm.transactionNotes" type="textarea" :rows="2" />
                  </el-form-item>
                  <el-form-item label="事实概述">
                    <el-input v-model="complaintForm.factsSummary" type="textarea" :rows="3" />
                  </el-form-item>
                  <el-button type="primary" :loading="creatingComplaint" @click="onCreateComplaint">生成材料</el-button>
                </el-form>
              </article>

              <article class="card-panel list-panel">
                <h3>投诉材料记录</h3>
                <el-empty v-if="!complaints.length" description="暂无投诉材料" />
                <div v-else class="item-list">
                  <div v-for="item in complaints" :key="item.complaintId" class="item-row">
                    <div>
                      <strong>{{ item.complaintId }}</strong>
                      <p>渠道建议：{{ item.channelSuggestions.join('、') }}</p>
                      <p>{{ formatTime(item.createdAt) }}</p>
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section class="card-panel single-panel" v-if="complaintPreview">
              <h3>最新投诉文案预览</h3>
              <pre class="preview">{{ complaintPreview }}</pre>
            </section>
          </el-tab-pane>

          <el-tab-pane label="套餐权限" name="plans">
            <section class="card-panel single-panel">
              <h3>商业套餐（无支付模式，人工开通）</h3>
              <div class="plan-grid">
                <div v-for="plan in plans" :key="plan.planCode" class="plan-card">
                  <h4>{{ plan.planName }}</h4>
                  <p class="price">¥{{ plan.monthlyPrice }}/月</p>
                  <p>监测对象：{{ plan.maxTargets }} 个</p>
                  <p>实时提醒：{{ plan.realtimeAlerts ? '支持' : '不支持' }}</p>
                  <p>投诉额度：{{ plan.complaintQuotaMonth }} 次/月</p>
                  <el-button
                    type="primary"
                    plain
                    :loading="activatingPlan === plan.planCode"
                    @click="onActivatePlan(plan.planCode)"
                  >
                    切换为此套餐
                  </el-button>
                </div>
              </div>
            </section>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-skeleton>
  </section>
</template>

<style scoped>
.anti-fraud-page {
  display: grid;
  gap: 14px;
}

.hero {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: radial-gradient(circle at 0% 0%, rgba(31, 95, 244, 0.16), transparent 40%), #fff;
}

.hero h2 {
  margin: 0;
}

.hero p {
  margin: 8px 0 0;
  color: var(--text-muted);
}

.overview {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.stat {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  background: #fff;
}

.stat label {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.stat strong {
  display: block;
  margin-top: 6px;
  font-size: 1.2rem;
  color: var(--brand);
}

.af-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-panel,
.list-panel,
.single-panel {
  padding: 14px;
}

.form-panel h3,
.list-panel h3,
.single-panel h3 {
  margin: 0 0 12px;
}

.item-list,
.scan-list {
  display: grid;
  gap: 10px;
}

.item-row,
.scan-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}

.row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.item-row p,
.scan-item p {
  margin: 6px 0 0;
  color: var(--text-muted);
}

.preview {
  white-space: pre-wrap;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fafcff;
  padding: 12px;
  line-height: 1.6;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.plan-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  display: grid;
  gap: 8px;
}

.plan-card h4 {
  margin: 0;
}

.price {
  margin: 0;
  color: var(--brand);
  font-weight: 700;
  font-size: 1.2rem;
}

.muted {
  font-size: 0.82rem;
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .plan-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }

  .overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .overview {
    grid-template-columns: 1fr;
  }
}
</style>
