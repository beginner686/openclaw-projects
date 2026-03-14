<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createMediaProduct,
  createMediaProject,
  deleteMediaProduct,
  fetchMediaDashboard,
  fetchMediaSchedules,
  fetchMediaTopics,
  fetchMediaContents,
  fetchMediaProducts,
  fetchMediaProjects,
  generateMediaContent,
  generateMediaSchedules,
  generateMediaTopics,
  rewriteMediaContent,
  scoreMediaProducts,
  updateMediaSchedule,
  updateMediaProduct,
} from '@/api/media'
import type { MediaContent, MediaDashboardData, MediaProduct, MediaProject, MediaSchedule, MediaTopic } from '@/types/domain'

type ProductDecision = 'pending' | 'priority' | 'candidate' | 'drop'
type ScheduleStatus = 'planned' | 'publishing' | 'published' | 'failed'

const loading = ref(true)
const activeTab = ref('topics')
const selectedProjectId = ref('')

const projects = ref<MediaProject[]>([])
const dashboard = ref<MediaDashboardData | null>(null)
const topics = ref<MediaTopic[]>([])
const contents = ref<MediaContent[]>([])
const products = ref<MediaProduct[]>([])
const schedules = ref<MediaSchedule[]>([])
const scheduleSummary = ref({
  planned: 0,
  publishing: 0,
  published: 0,
  failed: 0,
  successRate: 0,
  topFailureReasons: [] as Array<{ reason: string; count: number }>,
})

const creatingProject = ref(false)
const generatingTopics = ref(false)
const generatingContent = ref(false)
const rewritingContent = ref(false)
const creatingProduct = ref(false)
const updatingProduct = ref(false)
const updatingDecisionProductId = ref('')
const batchDecisionUpdating = ref(false)
const scoringProducts = ref(false)
const generatingSchedules = ref(false)
const updatingSchedule = ref(false)
const editProductDialogVisible = ref(false)
const editingProductId = ref('')
const editScheduleDialogVisible = ref(false)
const editingScheduleId = ref('')
const selectedProductIds = ref<string[]>([])

const projectForm = reactive({
  name: '',
  niche: '居家好物',
  goal: '带货转化',
  targetPlatformsText: 'douyin,kuaishou',
})

const topicForm = reactive({
  platform: 'douyin',
  niche: '居家好物',
  audience: '25-40岁家庭用户',
  goal: '提升转化',
  count: 20,
})

const contentForm = reactive({
  topicId: '',
  topicText: '',
  platform: 'douyin',
  tone: '口语化、可信',
  productHook: '',
})

const rewriteForm = reactive({
  contentId: '',
  targetPlatform: 'kuaishou',
  rawText: '',
})

const productForm = reactive({
  platformSource: 'douyin-alliance',
  name: '',
  url: '',
  price: 59,
  commissionRate: 25,
  shippingMode: '代发',
  supplier: '',
  stockHint: 100,
  sellingPoint: '',
})

const editProductForm = reactive({
  platformSource: '',
  name: '',
  url: '',
  price: 0,
  commissionRate: 0,
  shippingMode: '',
  supplier: '',
  stockHint: 0,
  sellingPoint: '',
})

const productFilterForm = reactive({
  keyword: '',
  decision: 'all',
  source: 'all',
  sortBy: 'score',
  sortOrder: 'desc',
})

const scheduleForm = reactive({
  days: 7,
  dailyPosts: 1,
  platformsText: 'douyin,kuaishou',
})
const scheduleFilterForm = reactive({
  date: '',
  platform: 'all',
  status: 'all',
})
const scheduleEditForm = reactive({
  publishDate: '',
  platform: 'douyin',
  topicId: '',
  contentId: '',
  productId: '',
  status: 'planned' as ScheduleStatus,
  note: '',
  failureReason: '',
})

const currentProject = computed(() => projects.value.find((item) => item.projectId === selectedProjectId.value) ?? null)
const productSourceOptions = computed(() => {
  const sources = new Set<string>()
  for (const item of products.value) {
    const source = String(item.platformSource ?? '').trim()
    if (source) sources.add(source)
  }
  return [...sources].sort((a, b) => a.localeCompare(b))
})
const filteredProducts = computed(() => {
  const keyword = productFilterForm.keyword.trim().toLowerCase()
  const decision = productFilterForm.decision
  const source = productFilterForm.source
  const sortBy = productFilterForm.sortBy
  const direction = productFilterForm.sortOrder === 'asc' ? 1 : -1

  const list = [...products.value].filter((item) => {
    if (decision !== 'all' && item.decision !== decision) return false
    if (source !== 'all' && item.platformSource !== source) return false
    if (!keyword) return true
    const blob = [item.name, item.platformSource, item.supplier, item.sellingPoint].join(' ').toLowerCase()
    return blob.includes(keyword)
  })

  const valueOf = (item: MediaProduct) => {
    if (sortBy === 'commissionRate') return Number(item.commissionRate ?? 0)
    if (sortBy === 'price') return Number(item.price ?? 0)
    if (sortBy === 'stockHint') return Number(item.stockHint ?? 0)
    if (sortBy === 'updatedAt') return new Date(item.updatedAt).getTime()
    return Number(item.score ?? 0)
  }

  list.sort((a, b) => {
    const va = valueOf(a)
    const vb = valueOf(b)
    if (va === vb) return String(a.name ?? '').localeCompare(String(b.name ?? '')) * direction
    return (va > vb ? 1 : -1) * direction
  })
  return list
})
const filteredProductIds = computed(() => filteredProducts.value.map((item) => item.productId))
const hasProductSelection = computed(() => selectedProductIds.value.length > 0)
const allFilteredSelected = computed(() => {
  if (!filteredProductIds.value.length) return false
  const set = new Set(selectedProductIds.value)
  return filteredProductIds.value.every((id) => set.has(id))
})
const filteredSchedules = computed(() => {
  const date = scheduleFilterForm.date.trim()
  const platform = scheduleFilterForm.platform
  const status = scheduleFilterForm.status

  return schedules.value.filter((item) => {
    if (date && item.publishDate !== date) return false
    if (platform !== 'all' && item.platform !== platform) return false
    if (status !== 'all' && item.status !== status) return false
    return true
  })
})
const todayPendingCount = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return schedules.value.filter((item) => item.publishDate === today && item.status === 'planned').length
})

function parsePlatforms(text: string) {
  return text
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
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

function decisionType(decision: string) {
  if (decision === 'priority') return 'success'
  if (decision === 'candidate') return 'warning'
  if (decision === 'drop') return 'danger'
  return 'info'
}

function decisionText(decision: string) {
  if (decision === 'priority') return '优先推'
  if (decision === 'candidate') return '备选'
  if (decision === 'drop') return '淘汰'
  return '待评分'
}

function decisionReason(decision: ProductDecision) {
  if (decision === 'priority') return '人工标记为优先推，建议优先排期并持续跟踪转化。'
  if (decision === 'candidate') return '人工标记为备选，建议先小流量测试。'
  if (decision === 'drop') return '人工标记为淘汰，暂不建议进入排期。'
  return '人工标记为待评分。'
}

function scheduleStatusType(status: string) {
  if (status === 'published') return 'success'
  if (status === 'publishing') return 'warning'
  if (status === 'failed') return 'danger'
  return 'info'
}

function scheduleStatusText(status: string) {
  if (status === 'published') return '已发布'
  if (status === 'publishing') return '发布中'
  if (status === 'failed') return '发布失败'
  return '待发布'
}

function summarizeSchedules(items: MediaSchedule[]) {
  const base = {
    planned: 0,
    publishing: 0,
    published: 0,
    failed: 0,
    successRate: 0,
    topFailureReasons: [] as Array<{ reason: string; count: number }>,
  }

  const reasonMap = new Map<string, number>()
  for (const item of items) {
    if (item.status === 'publishing') base.publishing += 1
    else if (item.status === 'published') base.published += 1
    else if (item.status === 'failed') base.failed += 1
    else base.planned += 1

    if (item.status === 'failed' && item.failureReason) {
      reasonMap.set(item.failureReason, Number(reasonMap.get(item.failureReason) ?? 0) + 1)
    }
  }

  const finished = base.published + base.failed
  base.successRate = finished > 0 ? Math.round((base.published / finished) * 100) : 0
  base.topFailureReasons = [...reasonMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))
  return base
}

async function refreshAll() {
  loading.value = true
  try {
    const projectList = await fetchMediaProjects()
    projects.value = projectList
    const firstProject = projectList[0]
    if (!selectedProjectId.value && firstProject) {
      selectedProjectId.value = firstProject.projectId
    }
    const projectId = selectedProjectId.value || firstProject?.projectId
    if (!projectId) {
      dashboard.value = null
      topics.value = []
      contents.value = []
      products.value = []
      schedules.value = []
      return
    }
    const [dashboardData, topicData, contentData, productData, scheduleData] = await Promise.all([
      fetchMediaDashboard(projectId),
      fetchMediaTopics(projectId),
      fetchMediaContents(projectId),
      fetchMediaProducts(projectId),
      fetchMediaSchedules(projectId),
    ])
    dashboard.value = dashboardData
    topics.value = topicData.topics
    contents.value = contentData.contents
    products.value = productData.products
    schedules.value = scheduleData.schedules
    scheduleSummary.value = scheduleData.summary ?? summarizeSchedules(scheduleData.schedules)
    const validProductIds = new Set(productData.products.map((item) => item.productId))
    selectedProductIds.value = selectedProductIds.value.filter((id) => validProductIds.has(id))
  } catch (error) {
    const message = error instanceof Error ? error.message : '自媒体模块数据加载失败。'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

async function onCreateProject() {
  const name = projectForm.name.trim()
  if (!name) {
    ElMessage.warning('项目名称不能为空。')
    return
  }
  creatingProject.value = true
  try {
    const project = await createMediaProject({
      name,
      niche: projectForm.niche.trim(),
      goal: projectForm.goal.trim(),
      targetPlatforms: parsePlatforms(projectForm.targetPlatformsText),
    })
    selectedProjectId.value = project.projectId
    projectForm.name = ''
    ElMessage.success('项目已创建。')
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建项目失败。'
    ElMessage.error(message)
  } finally {
    creatingProject.value = false
  }
}

async function onGenerateTopics() {
  generatingTopics.value = true
  try {
    await generateMediaTopics({
      projectId: selectedProjectId.value,
      platform: topicForm.platform,
      niche: topicForm.niche.trim(),
      audience: topicForm.audience.trim(),
      goal: topicForm.goal.trim(),
      count: topicForm.count,
    })
    ElMessage.success('选题已生成。')
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成选题失败。'
    ElMessage.error(message)
  } finally {
    generatingTopics.value = false
  }
}

async function onGenerateContent() {
  if (!contentForm.topicId && !contentForm.topicText.trim()) {
    ElMessage.warning('请选择一个选题，或手动输入选题内容。')
    return
  }
  generatingContent.value = true
  try {
    await generateMediaContent({
      projectId: selectedProjectId.value,
      topicId: contentForm.topicId || undefined,
      topicText: contentForm.topicText.trim() || undefined,
      platform: contentForm.platform,
      tone: contentForm.tone.trim(),
      productHook: contentForm.productHook.trim(),
    })
    ElMessage.success('内容稿件已生成。')
    contentForm.topicText = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成内容失败。'
    ElMessage.error(message)
  } finally {
    generatingContent.value = false
  }
}

async function onRewriteContent() {
  if (!rewriteForm.contentId && !rewriteForm.rawText.trim()) {
    ElMessage.warning('请先选择一条内容或输入原文。')
    return
  }
  rewritingContent.value = true
  try {
    await rewriteMediaContent({
      projectId: selectedProjectId.value,
      contentId: rewriteForm.contentId || undefined,
      rawText: rewriteForm.rawText.trim() || undefined,
      targetPlatform: rewriteForm.targetPlatform,
    })
    ElMessage.success('平台改写完成。')
    rewriteForm.rawText = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '改写失败。'
    ElMessage.error(message)
  } finally {
    rewritingContent.value = false
  }
}

async function onCreateProduct() {
  const name = productForm.name.trim()
  if (!name) {
    ElMessage.warning('商品名称不能为空。')
    return
  }
  creatingProduct.value = true
  try {
    await createMediaProduct({
      projectId: selectedProjectId.value,
      platformSource: productForm.platformSource.trim(),
      name,
      url: productForm.url.trim(),
      price: Number(productForm.price),
      commissionRate: Number(productForm.commissionRate),
      shippingMode: productForm.shippingMode.trim(),
      supplier: productForm.supplier.trim(),
      stockHint: Number(productForm.stockHint),
      sellingPoint: productForm.sellingPoint.trim(),
    })
    ElMessage.success('商品已加入选品池。')
    productForm.name = ''
    productForm.url = ''
    productForm.supplier = ''
    productForm.sellingPoint = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '添加商品失败。'
    ElMessage.error(message)
  } finally {
    creatingProduct.value = false
  }
}

async function onDeleteProduct(item: MediaProduct) {
  try {
    await ElMessageBox.confirm(`确认删除商品“${item.name}”？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteMediaProduct(item.productId)
    ElMessage.success('商品已删除。')
    await refreshAll()
  } catch {
    // ignore
  }
}

function onOpenEditProduct(item: MediaProduct) {
  editingProductId.value = item.productId
  editProductForm.platformSource = item.platformSource || ''
  editProductForm.name = item.name || ''
  editProductForm.url = item.url || ''
  editProductForm.price = Number(item.price ?? 0)
  editProductForm.commissionRate = Number(item.commissionRate ?? 0)
  editProductForm.shippingMode = item.shippingMode || ''
  editProductForm.supplier = item.supplier || ''
  editProductForm.stockHint = Number(item.stockHint ?? 0)
  editProductForm.sellingPoint = item.sellingPoint || ''
  editProductDialogVisible.value = true
}

async function onSaveEditProduct() {
  if (!editingProductId.value) return

  const name = editProductForm.name.trim()
  if (!name) {
    ElMessage.warning('商品名称不能为空。')
    return
  }

  updatingProduct.value = true
  try {
    await updateMediaProduct(editingProductId.value, {
      platformSource: editProductForm.platformSource.trim(),
      name,
      url: editProductForm.url.trim(),
      price: Number(editProductForm.price),
      commissionRate: Number(editProductForm.commissionRate),
      shippingMode: editProductForm.shippingMode.trim(),
      supplier: editProductForm.supplier.trim(),
      stockHint: Number(editProductForm.stockHint),
      sellingPoint: editProductForm.sellingPoint.trim(),
    })
    ElMessage.success('商品信息已更新。')
    editProductDialogVisible.value = false
    editingProductId.value = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新商品失败。'
    ElMessage.error(message)
  } finally {
    updatingProduct.value = false
  }
}

async function onSetProductDecision(item: MediaProduct, decision: ProductDecision) {
  updatingDecisionProductId.value = item.productId
  try {
    await updateMediaProduct(item.productId, {
      decision,
      reasons: [decisionReason(decision)],
    })
    ElMessage.success(`已设为${decisionText(decision)}。`)
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新商品决策失败。'
    ElMessage.error(message)
  } finally {
    updatingDecisionProductId.value = ''
  }
}

function onToggleSelectAllFiltered(checked: boolean) {
  if (!checked) {
    const visibleIds = new Set(filteredProductIds.value)
    selectedProductIds.value = selectedProductIds.value.filter((id) => !visibleIds.has(id))
    return
  }
  const merged = new Set([...selectedProductIds.value, ...filteredProductIds.value])
  selectedProductIds.value = [...merged]
}

function onSelectAllFilteredChange(value: string | number | boolean) {
  onToggleSelectAllFiltered(Boolean(value))
}

function clearSelectedProducts() {
  selectedProductIds.value = []
}

async function onBatchSetProductDecision(decision: ProductDecision) {
  if (!selectedProductIds.value.length) {
    ElMessage.warning('请先选择商品。')
    return
  }

  const ids = [...selectedProductIds.value]
  batchDecisionUpdating.value = true
  try {
    const results = await Promise.allSettled(
      ids.map((id) =>
        updateMediaProduct(id, {
          decision,
          reasons: [decisionReason(decision)],
        }),
      ),
    )
    const successCount = results.filter((item) => item.status === 'fulfilled').length
    const failCount = results.length - successCount
    if (successCount) {
      ElMessage.success(`已更新 ${successCount} 个商品为${decisionText(decision)}。`)
    }
    if (failCount) {
      ElMessage.warning(`${failCount} 个商品更新失败，请重试。`)
    }
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '批量更新决策失败。'
    ElMessage.error(message)
  } finally {
    batchDecisionUpdating.value = false
  }
}

async function onScoreProducts(mode: 'all' | 'selected' = 'all') {
  if (!products.value.length) {
    ElMessage.warning('选品池暂无商品。')
    return
  }
  if (mode === 'selected' && !selectedProductIds.value.length) {
    ElMessage.warning('请先选择商品。')
    return
  }

  scoringProducts.value = true
  try {
    await scoreMediaProducts({
      projectId: selectedProjectId.value,
      productIds: mode === 'selected' ? [...selectedProductIds.value] : undefined,
    })
    ElMessage.success(mode === 'selected' ? '选中商品评分已更新。' : '选品评分已更新。')
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '评分失败。'
    ElMessage.error(message)
  } finally {
    scoringProducts.value = false
  }
}

async function onGenerateSchedules() {
  generatingSchedules.value = true
  try {
    await generateMediaSchedules({
      projectId: selectedProjectId.value,
      days: scheduleForm.days,
      dailyPosts: scheduleForm.dailyPosts,
      platforms: parsePlatforms(scheduleForm.platformsText),
    })
    ElMessage.success('发布排期已生成。')
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成排期失败。'
    ElMessage.error(message)
  } finally {
    generatingSchedules.value = false
  }
}

function onShowTodayPending() {
  scheduleFilterForm.date = new Date().toISOString().slice(0, 10)
  scheduleFilterForm.status = 'planned'
}

function onOpenEditSchedule(item: MediaSchedule) {
  editingScheduleId.value = item.scheduleId
  scheduleEditForm.publishDate = item.publishDate
  scheduleEditForm.platform = item.platform
  scheduleEditForm.topicId = item.topicId || ''
  scheduleEditForm.contentId = item.contentId || ''
  scheduleEditForm.productId = item.productId || ''
  scheduleEditForm.status = (item.status || 'planned') as ScheduleStatus
  scheduleEditForm.note = item.note || ''
  scheduleEditForm.failureReason = item.failureReason || ''
  editScheduleDialogVisible.value = true
}

async function onSaveEditSchedule() {
  if (!editingScheduleId.value) return
  updatingSchedule.value = true
  try {
    await updateMediaSchedule(editingScheduleId.value, {
      projectId: selectedProjectId.value,
      publishDate: scheduleEditForm.publishDate,
      platform: scheduleEditForm.platform,
      topicId: scheduleEditForm.topicId || '',
      contentId: scheduleEditForm.contentId || '',
      productId: scheduleEditForm.productId || '',
      status: scheduleEditForm.status,
      note: scheduleEditForm.note.trim(),
      failureReason: scheduleEditForm.failureReason.trim(),
    })
    ElMessage.success('排期已更新。')
    editScheduleDialogVisible.value = false
    editingScheduleId.value = ''
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新排期失败。'
    ElMessage.error(message)
  } finally {
    updatingSchedule.value = false
  }
}

async function onSetScheduleStatus(item: MediaSchedule, status: ScheduleStatus) {
  let failureReason = ''
  if (status === 'failed') {
    try {
      const result = await ElMessageBox.prompt('请输入失败原因（用于后续复盘统计）', '标记发布失败', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputValue: item.failureReason || '',
        inputPlaceholder: '例如：素材违规、接口限流、商品下架',
      })
      failureReason = String(result.value ?? '').trim()
    } catch {
      return
    }
  }

  updatingSchedule.value = true
  try {
    await updateMediaSchedule(item.scheduleId, {
      projectId: selectedProjectId.value,
      status,
      failureReason,
    })
    ElMessage.success(`排期已设为${scheduleStatusText(status)}。`)
    await refreshAll()
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新排期状态失败。'
    ElMessage.error(message)
  } finally {
    updatingSchedule.value = false
  }
}

onMounted(() => {
  void refreshAll()
})
</script>

<template>
  <section class="media-page">
    <header class="hero card-panel">
      <div>
        <h2>自媒体内容与选品工作台</h2>
        <p>先内容后带货：选题、脚本、平台改写、选品评分、发布排期一体化</p>
      </div>
      <div class="actions">
        <el-select v-model="selectedProjectId" placeholder="选择项目" style="width: 260px" @change="refreshAll">
          <el-option v-for="item in projects" :key="item.projectId" :label="item.name" :value="item.projectId" />
        </el-select>
        <el-button type="primary" plain @click="refreshAll">刷新</el-button>
      </div>
    </header>

    <section class="card-panel create-project">
      <h3>新建项目</h3>
      <div class="form-grid">
        <el-input v-model="projectForm.name" placeholder="项目名称，例如：家居百货抖音号" />
        <el-input v-model="projectForm.niche" placeholder="赛道，例如：居家好物" />
        <el-input v-model="projectForm.goal" placeholder="目标，例如：带货转化" />
        <el-input v-model="projectForm.targetPlatformsText" placeholder="平台列表，例如：douyin,kuaishou" />
        <el-button type="primary" :loading="creatingProject" @click="onCreateProject">创建项目</el-button>
      </div>
    </section>

    <el-skeleton :loading="loading" animated :rows="8">
      <template #default>
        <section class="card-panel overview" v-if="dashboard">
          <article>
            <label>当前项目</label>
            <strong>{{ currentProject?.name || dashboard.project.name }}</strong>
          </article>
          <article>
            <label>选题数量</label>
            <strong>{{ dashboard.stats.topics }}</strong>
          </article>
          <article>
            <label>内容稿件</label>
            <strong>{{ dashboard.stats.contents }}</strong>
          </article>
          <article>
            <label>选品池</label>
            <strong>{{ dashboard.stats.products }}</strong>
          </article>
          <article>
            <label>优先推商品</label>
            <strong>{{ dashboard.stats.priorityProducts }}</strong>
          </article>
          <article>
            <label>排期数</label>
            <strong>{{ dashboard.stats.schedules }}</strong>
          </article>
          <article>
            <label>已发布</label>
            <strong>{{ dashboard.stats.publishedSchedules }}</strong>
          </article>
          <article>
            <label>发布失败</label>
            <strong>{{ dashboard.stats.failedSchedules }}</strong>
          </article>
          <article>
            <label>发布成功率</label>
            <strong>{{ dashboard.stats.scheduleSuccessRate }}%</strong>
          </article>
        </section>

        <el-tabs v-model="activeTab" class="media-tabs">
          <el-tab-pane label="选题库" name="topics">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>生成选题</h3>
                <el-form label-position="top">
                  <el-form-item label="平台">
                    <el-select v-model="topicForm.platform">
                      <el-option label="抖音" value="douyin" />
                      <el-option label="快手" value="kuaishou" />
                      <el-option label="小红书" value="xiaohongshu" />
                      <el-option label="视频号" value="wechat-video" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="赛道">
                    <el-input v-model="topicForm.niche" />
                  </el-form-item>
                  <el-form-item label="目标人群">
                    <el-input v-model="topicForm.audience" />
                  </el-form-item>
                  <el-form-item label="目标">
                    <el-input v-model="topicForm.goal" />
                  </el-form-item>
                  <el-form-item label="生成数量">
                    <el-input-number v-model="topicForm.count" :min="1" :max="50" />
                  </el-form-item>
                  <el-button type="primary" :loading="generatingTopics" @click="onGenerateTopics">生成选题</el-button>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>选题结果</h3>
                <el-empty v-if="!topics.length" description="暂无选题" />
                <div v-else class="topic-list">
                  <div v-for="item in topics" :key="item.topicId" class="topic-item">
                    <div class="row-between">
                      <strong>{{ item.title }}</strong>
                      <el-tag>{{ item.platform }}</el-tag>
                    </div>
                    <p class="muted">角度：{{ item.angle || '通用' }}</p>
                    <p class="muted">热度 {{ item.heatScore }} · 转化 {{ item.convertScore }}</p>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="内容工厂" name="contents">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>生成内容</h3>
                <el-form label-position="top">
                  <el-form-item label="选题">
                    <el-select v-model="contentForm.topicId" clearable filterable>
                      <el-option v-for="item in topics" :key="item.topicId" :label="item.title" :value="item.topicId" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="手动选题（可选）">
                    <el-input v-model="contentForm.topicText" />
                  </el-form-item>
                  <el-form-item label="平台">
                    <el-select v-model="contentForm.platform">
                      <el-option label="抖音" value="douyin" />
                      <el-option label="快手" value="kuaishou" />
                      <el-option label="小红书" value="xiaohongshu" />
                      <el-option label="视频号" value="wechat-video" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="文案风格">
                    <el-input v-model="contentForm.tone" />
                  </el-form-item>
                  <el-form-item label="商品卖点钩子">
                    <el-input v-model="contentForm.productHook" type="textarea" :rows="3" />
                  </el-form-item>
                  <el-button type="primary" :loading="generatingContent" @click="onGenerateContent">生成内容</el-button>
                </el-form>

                <h3 style="margin-top: 18px">平台改写</h3>
                <el-form label-position="top">
                  <el-form-item label="原内容">
                    <el-select v-model="rewriteForm.contentId" clearable filterable>
                      <el-option v-for="item in contents" :key="item.contentId" :label="item.title" :value="item.contentId" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="手动原文（可选）">
                    <el-input v-model="rewriteForm.rawText" type="textarea" :rows="3" />
                  </el-form-item>
                  <el-form-item label="目标平台">
                    <el-select v-model="rewriteForm.targetPlatform">
                      <el-option label="抖音" value="douyin" />
                      <el-option label="快手" value="kuaishou" />
                      <el-option label="小红书" value="xiaohongshu" />
                      <el-option label="视频号" value="wechat-video" />
                    </el-select>
                  </el-form-item>
                  <el-button type="success" :loading="rewritingContent" @click="onRewriteContent">开始改写</el-button>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>内容列表</h3>
                <el-empty v-if="!contents.length" description="暂无内容" />
                <div v-else class="content-list">
                  <div v-for="item in contents" :key="item.contentId" class="content-item">
                    <div class="row-between">
                      <strong>{{ item.title }}</strong>
                      <el-tag>{{ item.platform }}</el-tag>
                    </div>
                    <p class="muted">{{ item.hook }}</p>
                    <p class="preview">{{ item.scriptText }}</p>
                    <p class="muted">{{ formatTime(item.updatedAt) }}</p>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="选品池" name="products">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>添加商品</h3>
                <el-form label-position="top">
                  <el-form-item label="来源平台">
                    <el-input v-model="productForm.platformSource" placeholder="douyin-alliance / pdd / youzan 等" />
                  </el-form-item>
                  <el-form-item label="商品名称">
                    <el-input v-model="productForm.name" />
                  </el-form-item>
                  <el-form-item label="链接">
                    <el-input v-model="productForm.url" />
                  </el-form-item>
                  <el-form-item label="价格">
                    <el-input-number v-model="productForm.price" :min="0" :max="100000" />
                  </el-form-item>
                  <el-form-item label="佣金比例（%）">
                    <el-input-number v-model="productForm.commissionRate" :min="0" :max="100" />
                  </el-form-item>
                  <el-form-item label="发货方式">
                    <el-input v-model="productForm.shippingMode" placeholder="代发 / 自发货" />
                  </el-form-item>
                  <el-form-item label="供应商">
                    <el-input v-model="productForm.supplier" />
                  </el-form-item>
                  <el-form-item label="库存参考">
                    <el-input-number v-model="productForm.stockHint" :min="0" :max="100000" />
                  </el-form-item>
                  <el-form-item label="卖点">
                    <el-input v-model="productForm.sellingPoint" type="textarea" :rows="3" />
                  </el-form-item>
                  <div class="row-actions">
                    <el-button type="primary" :loading="creatingProduct" @click="onCreateProduct">添加商品</el-button>
                    <el-button type="success" :loading="scoringProducts" @click="onScoreProducts('all')">全量评分</el-button>
                  </div>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>商品列表</h3>
                <el-empty v-if="!products.length" description="暂无商品" />
                <div v-else class="product-list">
                  <div class="product-toolbar">
                    <el-input v-model="productFilterForm.keyword" placeholder="搜索商品/来源/供应商/卖点" clearable />
                    <el-select v-model="productFilterForm.decision">
                      <el-option label="全部决策" value="all" />
                      <el-option label="优先推" value="priority" />
                      <el-option label="备选" value="candidate" />
                      <el-option label="淘汰" value="drop" />
                      <el-option label="待评分" value="pending" />
                    </el-select>
                    <el-select v-model="productFilterForm.source">
                      <el-option label="全部来源" value="all" />
                      <el-option v-for="source in productSourceOptions" :key="source" :label="source" :value="source" />
                    </el-select>
                    <el-select v-model="productFilterForm.sortBy">
                      <el-option label="按评分" value="score" />
                      <el-option label="按佣金" value="commissionRate" />
                      <el-option label="按价格" value="price" />
                      <el-option label="按库存" value="stockHint" />
                      <el-option label="按更新时间" value="updatedAt" />
                    </el-select>
                    <el-select v-model="productFilterForm.sortOrder">
                      <el-option label="降序" value="desc" />
                      <el-option label="升序" value="asc" />
                    </el-select>
                  </div>
                  <div class="product-batch-actions">
                    <el-checkbox :model-value="allFilteredSelected" @change="onSelectAllFilteredChange">
                      全选当前筛选结果
                    </el-checkbox>
                    <span class="muted">已选 {{ selectedProductIds.length }} 个</span>
                    <el-button
                      size="small"
                      type="success"
                      plain
                      :disabled="!hasProductSelection"
                      :loading="scoringProducts"
                      @click="onScoreProducts('selected')"
                    >
                      评分选中
                    </el-button>
                    <el-button
                      size="small"
                      type="success"
                      :disabled="!hasProductSelection"
                      :loading="batchDecisionUpdating"
                      @click="onBatchSetProductDecision('priority')"
                    >
                      批量优先
                    </el-button>
                    <el-button
                      size="small"
                      type="warning"
                      :disabled="!hasProductSelection"
                      :loading="batchDecisionUpdating"
                      @click="onBatchSetProductDecision('candidate')"
                    >
                      批量备选
                    </el-button>
                    <el-button
                      size="small"
                      type="info"
                      :disabled="!hasProductSelection"
                      :loading="batchDecisionUpdating"
                      @click="onBatchSetProductDecision('drop')"
                    >
                      批量淘汰
                    </el-button>
                    <el-button size="small" :disabled="!hasProductSelection" @click="clearSelectedProducts">清空选择</el-button>
                  </div>
                  <p class="muted">筛选结果：{{ filteredProducts.length }} / {{ products.length }}</p>
                  <el-empty v-if="!filteredProducts.length" description="筛选后暂无匹配商品" />
                  <div v-for="item in filteredProducts" :key="item.productId" class="product-item">
                    <div class="row-between">
                      <div class="product-title-line">
                        <el-checkbox v-model="selectedProductIds" :value="item.productId" />
                        <strong>{{ item.name }}</strong>
                      </div>
                      <el-tag :type="decisionType(item.decision)">
                        {{ decisionText(item.decision) }} · {{ item.score }}
                      </el-tag>
                    </div>
                    <p class="muted">{{ item.platformSource }} · ¥{{ item.price }} · 佣金 {{ item.commissionRate }}%</p>
                    <p class="muted">发货：{{ item.shippingMode || '未填写' }} · 库存：{{ item.stockHint }}</p>
                    <p class="preview">{{ item.reasons.join(' ') }}</p>
                    <div class="row-actions">
                      <el-button
                        text
                        type="success"
                        :loading="updatingDecisionProductId === item.productId"
                        :disabled="item.decision === 'priority'"
                        @click="onSetProductDecision(item, 'priority')"
                      >
                        设为优先
                      </el-button>
                      <el-button
                        text
                        type="warning"
                        :loading="updatingDecisionProductId === item.productId"
                        :disabled="item.decision === 'candidate'"
                        @click="onSetProductDecision(item, 'candidate')"
                      >
                        设为备选
                      </el-button>
                      <el-button
                        text
                        type="info"
                        :loading="updatingDecisionProductId === item.productId"
                        :disabled="item.decision === 'drop'"
                        @click="onSetProductDecision(item, 'drop')"
                      >
                        设为淘汰
                      </el-button>
                      <el-button text type="primary" @click="onOpenEditProduct(item)">编辑</el-button>
                      <el-button text type="danger" @click="onDeleteProduct(item)">删除</el-button>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="发布排期" name="schedules">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>生成排期</h3>
                <el-form label-position="top">
                  <el-form-item label="天数">
                    <el-input-number v-model="scheduleForm.days" :min="1" :max="30" />
                  </el-form-item>
                  <el-form-item label="每天发布条数">
                    <el-input-number v-model="scheduleForm.dailyPosts" :min="1" :max="6" />
                  </el-form-item>
                  <el-form-item label="平台列表">
                    <el-input v-model="scheduleForm.platformsText" placeholder="douyin,kuaishou,xiaohongshu" />
                  </el-form-item>
                  <el-button type="primary" :loading="generatingSchedules" @click="onGenerateSchedules">生成排期</el-button>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>排期列表</h3>
                <el-empty v-if="!schedules.length" description="暂无排期" />
                <div v-else class="schedule-list">
                  <div class="schedule-summary">
                    <el-tag type="info">待发布 {{ scheduleSummary.planned }}</el-tag>
                    <el-tag type="warning">发布中 {{ scheduleSummary.publishing }}</el-tag>
                    <el-tag type="success">已发布 {{ scheduleSummary.published }}</el-tag>
                    <el-tag type="danger">失败 {{ scheduleSummary.failed }}</el-tag>
                    <el-tag type="success">成功率 {{ scheduleSummary.successRate }}%</el-tag>
                  </div>
                  <div v-if="scheduleSummary.topFailureReasons.length" class="failure-reasons">
                    <p class="muted">高频失败原因：</p>
                    <div class="row-actions">
                      <el-tag v-for="item in scheduleSummary.topFailureReasons" :key="item.reason" type="danger" effect="plain">
                        {{ item.reason }}（{{ item.count }}）
                      </el-tag>
                    </div>
                  </div>
                  <div class="schedule-toolbar">
                    <el-date-picker
                      v-model="scheduleFilterForm.date"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="按日期筛选"
                      clearable
                    />
                    <el-select v-model="scheduleFilterForm.platform">
                      <el-option label="全部平台" value="all" />
                      <el-option label="抖音" value="douyin" />
                      <el-option label="快手" value="kuaishou" />
                      <el-option label="小红书" value="xiaohongshu" />
                      <el-option label="视频号" value="wechat-video" />
                    </el-select>
                    <el-select v-model="scheduleFilterForm.status">
                      <el-option label="全部状态" value="all" />
                      <el-option label="待发布" value="planned" />
                      <el-option label="发布中" value="publishing" />
                      <el-option label="已发布" value="published" />
                      <el-option label="发布失败" value="failed" />
                    </el-select>
                    <el-button plain @click="onShowTodayPending">今日待发（{{ todayPendingCount }}）</el-button>
                  </div>
                  <p class="muted">筛选结果：{{ filteredSchedules.length }} / {{ schedules.length }}</p>
                  <el-empty v-if="!filteredSchedules.length" description="筛选后暂无排期" />
                  <div v-for="item in filteredSchedules" :key="item.scheduleId" class="schedule-item">
                    <div class="row-between">
                      <strong>{{ item.publishDate }}</strong>
                      <div class="row-actions">
                        <el-tag>{{ item.platform }}</el-tag>
                        <el-tag :type="scheduleStatusType(item.status)">{{ scheduleStatusText(item.status) }}</el-tag>
                      </div>
                    </div>
                    <p class="muted">选题：{{ item.topicId || '未关联' }}</p>
                    <p class="muted">内容：{{ item.contentId || '未关联' }}</p>
                    <p class="muted">商品：{{ item.productId || '未关联' }}</p>
                    <p class="muted">备注：{{ item.note || '无' }}</p>
                    <p class="muted">执行时间：{{ item.executedAt ? formatTime(item.executedAt) : '未执行' }}</p>
                    <p class="muted" v-if="item.failureReason">失败原因：{{ item.failureReason }}</p>
                    <div class="row-actions">
                      <el-button text type="primary" @click="onOpenEditSchedule(item)">编辑</el-button>
                      <el-button
                        text
                        type="warning"
                        :disabled="item.status === 'publishing' || item.status === 'published'"
                        :loading="updatingSchedule"
                        @click="onSetScheduleStatus(item, 'publishing')"
                      >
                        标记发布中
                      </el-button>
                      <el-button
                        text
                        type="success"
                        :disabled="item.status === 'published' || item.status === 'failed'"
                        :loading="updatingSchedule"
                        @click="onSetScheduleStatus(item, 'published')"
                      >
                        标记已发布
                      </el-button>
                      <el-button
                        text
                        type="danger"
                        :disabled="item.status === 'failed' || item.status === 'published'"
                        :loading="updatingSchedule"
                        @click="onSetScheduleStatus(item, 'failed')"
                      >
                        标记失败
                      </el-button>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>
        </el-tabs>

        <el-dialog v-model="editProductDialogVisible" title="编辑商品" width="540px">
          <el-form label-position="top">
            <el-form-item label="来源平台">
              <el-input v-model="editProductForm.platformSource" />
            </el-form-item>
            <el-form-item label="商品名称">
              <el-input v-model="editProductForm.name" />
            </el-form-item>
            <el-form-item label="链接">
              <el-input v-model="editProductForm.url" />
            </el-form-item>
            <el-form-item label="价格">
              <el-input-number v-model="editProductForm.price" :min="0" :max="100000" />
            </el-form-item>
            <el-form-item label="佣金比例（%）">
              <el-input-number v-model="editProductForm.commissionRate" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="发货方式">
              <el-input v-model="editProductForm.shippingMode" />
            </el-form-item>
            <el-form-item label="供应商">
              <el-input v-model="editProductForm.supplier" />
            </el-form-item>
            <el-form-item label="库存参考">
              <el-input-number v-model="editProductForm.stockHint" :min="0" :max="100000" />
            </el-form-item>
            <el-form-item label="卖点">
              <el-input v-model="editProductForm.sellingPoint" type="textarea" :rows="3" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="editProductDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="updatingProduct" @click="onSaveEditProduct">保存</el-button>
          </template>
        </el-dialog>

        <el-dialog v-model="editScheduleDialogVisible" title="编辑排期" width="560px">
          <el-form label-position="top">
            <el-form-item label="发布日期">
              <el-date-picker
                v-model="scheduleEditForm.publishDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
              />
            </el-form-item>
            <el-form-item label="平台">
              <el-select v-model="scheduleEditForm.platform">
                <el-option label="抖音" value="douyin" />
                <el-option label="快手" value="kuaishou" />
                <el-option label="小红书" value="xiaohongshu" />
                <el-option label="视频号" value="wechat-video" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="scheduleEditForm.status">
                <el-option label="待发布" value="planned" />
                <el-option label="发布中" value="publishing" />
                <el-option label="已发布" value="published" />
                <el-option label="发布失败" value="failed" />
              </el-select>
            </el-form-item>
            <el-form-item label="关联选题">
              <el-select v-model="scheduleEditForm.topicId" clearable filterable>
                <el-option label="不关联" value="" />
                <el-option v-for="item in topics" :key="item.topicId" :label="item.title" :value="item.topicId" />
              </el-select>
            </el-form-item>
            <el-form-item label="关联内容">
              <el-select v-model="scheduleEditForm.contentId" clearable filterable>
                <el-option label="不关联" value="" />
                <el-option v-for="item in contents" :key="item.contentId" :label="item.title" :value="item.contentId" />
              </el-select>
            </el-form-item>
            <el-form-item label="关联商品">
              <el-select v-model="scheduleEditForm.productId" clearable filterable>
                <el-option label="不关联" value="" />
                <el-option v-for="item in products" :key="item.productId" :label="item.name" :value="item.productId" />
              </el-select>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="scheduleEditForm.note" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="失败原因（仅失败状态使用）">
              <el-input v-model="scheduleEditForm.failureReason" type="textarea" :rows="2" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="editScheduleDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="updatingSchedule" @click="onSaveEditSchedule">保存</el-button>
          </template>
        </el-dialog>
      </template>
    </el-skeleton>
  </section>
</template>

<style scoped>
.media-page {
  display: grid;
  gap: 14px;
}

.hero {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  background: radial-gradient(circle at 0% -20%, rgba(16, 185, 129, 0.15), transparent 35%), #fff;
}

.hero h2 {
  margin: 0;
}

.hero p {
  margin: 6px 0 0;
  color: var(--text-muted);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.create-project {
  padding: 12px;
}

.create-project h3 {
  margin: 0 0 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 2fr auto;
  gap: 8px;
  align-items: center;
}

.overview {
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.overview article {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
}

.overview label {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.overview strong {
  display: block;
  margin-top: 6px;
  font-size: 1.1rem;
  color: var(--brand);
}

.media-tabs :deep(.el-tabs__header) {
  margin-bottom: 10px;
}

.grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel {
  padding: 14px;
}

.panel h3 {
  margin: 0 0 12px;
}

.topic-list,
.content-list,
.product-list,
.schedule-list {
  display: grid;
  gap: 10px;
}

.topic-item,
.content-item,
.product-item,
.schedule-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.row-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.product-toolbar {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 8px;
}

.product-batch-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.product-title-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.schedule-toolbar {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr auto;
  gap: 8px;
}

.schedule-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.failure-reasons {
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: 8px;
}

.muted {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.preview {
  margin: 8px 0 0;
  color: #374151;
  font-size: 0.84rem;
  white-space: pre-wrap;
  line-height: 1.5;
}

@media (max-width: 1260px) {
  .overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 980px) {
  .grid-two {
    grid-template-columns: 1fr;
  }
  .product-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .schedule-toolbar {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
  .actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
  }
  .overview {
    grid-template-columns: 1fr;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .product-toolbar {
    grid-template-columns: 1fr;
  }
  .schedule-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
