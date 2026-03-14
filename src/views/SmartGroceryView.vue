<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  buildGroceryBudgetPlan,
  compareGroceryPrices,
  createGroceryFreshnessCheck,
  fetchGroceryDashboard,
  fetchGroceryDeals,
  fetchGroceryFreshnessChecks,
  fetchGroceryPreference,
  generateGroceryWeeklyMenu,
  recommendGroceryToday,
  saveGroceryPreference,
  type GroceryFreshnessCheck,
} from '@/api/grocery'

const loading = ref(true)
const activeTab = ref('dashboard')

const MAX_COMPARE_ITEMS = 20
const MAX_FRESHNESS_IMAGE_NAME_LENGTH = 120

const dashboard = ref<any>(null)
const deals = ref<any[]>([])
const freshnessChecks = ref<GroceryFreshnessCheck[]>([])
const compareResult = ref<any[]>([])
const todayRecommend = ref<any | null>(null)
const weeklyMenu = ref<any | null>(null)
const budgetPlan = ref<any | null>(null)
const preference = ref<any | null>(null)

const comparing = ref(false)
const recommending = ref(false)
const generatingMenu = ref(false)
const generatingBudget = ref(false)
const checkingFreshness = ref(false)
const savingPreference = ref(false)

const compareForm = reactive({
  itemsText: '西红柿\n鸡蛋\n鸡胸肉\n大米',
})

const recommendForm = reactive({
  budgetPerMeal: 20,
  familySize: 2,
})

const menuForm = reactive({
  budgetPerMeal: 20,
  familySize: 2,
})

const preferenceForm = reactive({
  budgetPerMeal: 20,
  familySize: 2,
  dietaryNotes: '',
})

const freshnessForm = reactive({
  imageName: '',
  description: '',
})

const budgetForm = reactive({
  budgetPerMeal: 20,
  familySize: 2,
  mealsPerDay: 2,
})

const topDeals = computed(() => deals.value.slice(0, 8))

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return `¥${Number(value).toFixed(2)}`
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

function isFiniteInRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max
}

async function loadData() {
  loading.value = true
  try {
    const [dashboardData, dealData, freshData, prefData] = await Promise.all([
      fetchGroceryDashboard(),
      fetchGroceryDeals(),
      fetchGroceryFreshnessChecks(),
      fetchGroceryPreference(),
    ])

    dashboard.value = dashboardData
    deals.value = dealData
    freshnessChecks.value = freshData
    preference.value = prefData

    preferenceForm.budgetPerMeal = prefData.budgetPerMeal
    preferenceForm.familySize = prefData.familySize
    preferenceForm.dietaryNotes = prefData.dietaryNotes

    recommendForm.budgetPerMeal = prefData.budgetPerMeal
    recommendForm.familySize = prefData.familySize
    menuForm.budgetPerMeal = prefData.budgetPerMeal
    menuForm.familySize = prefData.familySize
    budgetForm.budgetPerMeal = prefData.budgetPerMeal
    budgetForm.familySize = prefData.familySize

    todayRecommend.value = dashboardData.todayRecommendation
  } catch (error) {
    const message = error instanceof Error ? error.message : '智慧买菜数据加载失败。'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

async function onSavePreference() {
  if (!isFiniteInRange(Number(preferenceForm.budgetPerMeal), 5, 300)) {
    ElMessage.warning('每餐预算需在 5-300 之间。')
    return
  }
  if (!isFiniteInRange(Number(preferenceForm.familySize), 1, 10)) {
    ElMessage.warning('家庭人数需在 1-10 之间。')
    return
  }

  savingPreference.value = true
  try {
    const saved = await saveGroceryPreference(preferenceForm)
    preference.value = saved
    recommendForm.budgetPerMeal = saved.budgetPerMeal
    recommendForm.familySize = saved.familySize
    menuForm.budgetPerMeal = saved.budgetPerMeal
    menuForm.familySize = saved.familySize
    budgetForm.budgetPerMeal = saved.budgetPerMeal
    budgetForm.familySize = saved.familySize
    ElMessage.success('家庭偏好已保存。')
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存失败。'
    ElMessage.error(message)
  } finally {
    savingPreference.value = false
  }
}

async function onCompare() {
  const items = compareForm.itemsText
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!items.length) {
    ElMessage.warning('请先输入至少一个商品名称。')
    return
  }
  if (items.length > MAX_COMPARE_ITEMS) {
    ElMessage.warning(`单次最多比价 ${MAX_COMPARE_ITEMS} 个商品。`)
    return
  }

  comparing.value = true
  try {
    compareResult.value = await compareGroceryPrices({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : '比价失败。'
    ElMessage.error(message)
  } finally {
    comparing.value = false
  }
}

async function onRecommend() {
  if (!isFiniteInRange(Number(recommendForm.budgetPerMeal), 5, 300)) {
    ElMessage.warning('每餐预算需在 5-300 之间。')
    return
  }
  if (!isFiniteInRange(Number(recommendForm.familySize), 1, 10)) {
    ElMessage.warning('家庭人数需在 1-10 之间。')
    return
  }

  recommending.value = true
  try {
    todayRecommend.value = await recommendGroceryToday(recommendForm)
    ElMessage.success('今日推荐已更新。')
  } catch (error) {
    const message = error instanceof Error ? error.message : '推荐生成失败。'
    ElMessage.error(message)
  } finally {
    recommending.value = false
  }
}

async function onGenerateMenu() {
  if (!isFiniteInRange(Number(menuForm.budgetPerMeal), 5, 300)) {
    ElMessage.warning('每餐预算需在 5-300 之间。')
    return
  }
  if (!isFiniteInRange(Number(menuForm.familySize), 1, 10)) {
    ElMessage.warning('家庭人数需在 1-10 之间。')
    return
  }

  generatingMenu.value = true
  try {
    weeklyMenu.value = await generateGroceryWeeklyMenu(menuForm)
    ElMessage.success('一周菜谱已生成。')
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成菜谱失败。'
    ElMessage.error(message)
  } finally {
    generatingMenu.value = false
  }
}

async function onFreshnessCheck() {
  const imageName = freshnessForm.imageName.trim()
  if (!imageName) {
    ElMessage.warning('请填写图片名称或拍照文件名。')
    return
  }
  if (imageName.length > MAX_FRESHNESS_IMAGE_NAME_LENGTH) {
    ElMessage.warning(`图片名称不能超过 ${MAX_FRESHNESS_IMAGE_NAME_LENGTH} 字符。`)
    return
  }

  checkingFreshness.value = true
  try {
    const result = await createGroceryFreshnessCheck({
      imageName,
      description: freshnessForm.description.trim(),
    })
    freshnessChecks.value = [result, ...freshnessChecks.value].slice(0, 30)
    freshnessForm.imageName = ''
    freshnessForm.description = ''
    ElMessage.success(`识别完成：${result.summary}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '新鲜度识别失败。'
    ElMessage.error(message)
  } finally {
    checkingFreshness.value = false
  }
}

async function onBuildBudgetPlan() {
  if (!isFiniteInRange(Number(budgetForm.budgetPerMeal), 5, 300)) {
    ElMessage.warning('每餐预算需在 5-300 之间。')
    return
  }
  if (!isFiniteInRange(Number(budgetForm.familySize), 1, 10)) {
    ElMessage.warning('家庭人数需在 1-10 之间。')
    return
  }
  if (!isFiniteInRange(Number(budgetForm.mealsPerDay), 1, 4)) {
    ElMessage.warning('每日做饭餐次需在 1-4 之间。')
    return
  }

  generatingBudget.value = true
  try {
    budgetPlan.value = await buildGroceryBudgetPlan(budgetForm)
    ElMessage.success('预算方案已生成。')
  } catch (error) {
    const message = error instanceof Error ? error.message : '预算方案生成失败。'
    ElMessage.error(message)
  } finally {
    generatingBudget.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <section class="grocery-page">
    <header class="hero card-panel">
      <div>
        <h2>智慧买菜 / 超市</h2>
        <p>家庭买菜省钱 AI：公开价格比对 + 今日推荐 + 菜谱预算 + 新鲜度检查</p>
      </div>
      <el-button type="primary" plain @click="loadData">刷新</el-button>
    </header>

    <el-skeleton :loading="loading" animated :rows="8">
      <template #default>
        <section class="overview card-panel" v-if="dashboard">
          <article>
            <label>覆盖平台</label>
            <strong>{{ dashboard.stats.platformCount }}</strong>
          </article>
          <article>
            <label>价格样本</label>
            <strong>{{ dashboard.stats.feedCount }}</strong>
          </article>
          <article>
            <label>今日特价</label>
            <strong>{{ dashboard.stats.dealCount }}</strong>
          </article>
          <article>
            <label>新鲜度记录</label>
            <strong>{{ dashboard.stats.freshnessChecks }}</strong>
          </article>
        </section>

        <el-tabs v-model="activeTab" class="g-tabs">
          <el-tab-pane label="今日推荐" name="dashboard">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>推荐参数</h3>
                <el-form label-position="top">
                  <el-form-item label="每餐预算（元）">
                    <el-input-number v-model="recommendForm.budgetPerMeal" :min="5" :max="300" />
                  </el-form-item>
                  <el-form-item label="家庭人数">
                    <el-input-number v-model="recommendForm.familySize" :min="1" :max="10" />
                  </el-form-item>
                  <el-button type="primary" :loading="recommending" @click="onRecommend">更新推荐</el-button>
                </el-form>
              </article>

              <article class="card-panel panel" v-if="todayRecommend">
                <h3>今日必买清单</h3>
                <p class="muted">预算 {{ formatMoney(todayRecommend.budget) }} · 预计 {{ formatMoney(todayRecommend.estimatedCost) }}</p>
                <p class="hint">{{ todayRecommend.decision }}</p>
                <div class="chip-list">
                  <span class="chip" v-for="item in todayRecommend.todayMustBuy" :key="`${item.platform}-${item.itemName}`">
                    {{ item.itemName }} · {{ item.platform }} · {{ formatMoney(item.price) }}
                  </span>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="今日比价" name="compare">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>商品比价</h3>
                <el-form label-position="top">
                  <el-form-item label="商品名称（每行一个）">
                    <el-input v-model="compareForm.itemsText" type="textarea" :rows="6" />
                  </el-form-item>
                  <el-button type="primary" :loading="comparing" @click="onCompare">开始比价</el-button>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>比价结果</h3>
                <el-empty v-if="!compareResult.length" description="还没有比价结果" />
                <div v-else class="compare-list">
                  <div class="compare-item" v-for="item in compareResult" :key="item.itemName">
                    <div class="row-between">
                      <strong>{{ item.itemName }}</strong>
                      <span class="muted">最低 {{ item.cheapestPlatform || '--' }} {{ formatMoney(item.cheapestPrice) }}</span>
                    </div>
                    <p class="muted">折算单价（500g）：{{ item.cheapestUnitPrice500g ? `¥${item.cheapestUnitPrice500g}` : '--' }}</p>
                    <ul>
                      <li v-for="offer in item.offers" :key="`${offer.platform}-${offer.displaySpec}`">
                        {{ offer.platform }} · {{ offer.displaySpec }} · {{ formatMoney(offer.price) }} · {{ offer.dealTag || '常规' }}
                      </li>
                    </ul>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="一周菜谱" name="menu">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>菜谱参数</h3>
                <el-form label-position="top">
                  <el-form-item label="每餐预算（元）">
                    <el-input-number v-model="menuForm.budgetPerMeal" :min="5" :max="300" />
                  </el-form-item>
                  <el-form-item label="家庭人数">
                    <el-input-number v-model="menuForm.familySize" :min="1" :max="10" />
                  </el-form-item>
                  <el-button type="primary" :loading="generatingMenu" @click="onGenerateMenu">生成菜谱</el-button>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>菜谱结果</h3>
                <el-empty v-if="!weeklyMenu" description="尚未生成" />
                <div v-else class="menu-list">
                  <p class="muted">周预算 {{ formatMoney(weeklyMenu.weekBudget) }} · 预计支出 {{ formatMoney(weeklyMenu.weekEstimated) }}</p>
                  <div class="menu-item" v-for="day in weeklyMenu.weeklyMenu" :key="day.day">
                    <div class="row-between">
                      <strong>{{ day.day }} · {{ day.meal }}</strong>
                      <el-tag :type="day.withinBudget ? 'success' : 'warning'">{{ day.withinBudget ? '预算内' : '超预算' }}</el-tag>
                    </div>
                    <p class="muted">预计 {{ formatMoney(day.estimatedCost) }}</p>
                    <ul>
                      <li v-for="ing in day.ingredients" :key="`${day.day}-${ing.itemName}-${ing.platform}`">
                        {{ ing.itemName }} · {{ ing.platform || '--' }} · {{ ing.displaySpec || '--' }} · {{ ing.price ? formatMoney(ing.price) : '--' }}
                      </li>
                    </ul>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="特价提醒" name="deals">
            <section class="card-panel panel">
              <h3>今日特价 TOP</h3>
              <div class="deal-grid">
                <div class="deal-item" v-for="deal in topDeals" :key="`${deal.platform}-${deal.itemName}-${deal.displaySpec}`">
                  <strong>{{ deal.itemName }}</strong>
                  <p>{{ deal.platform }} · {{ deal.displaySpec }}</p>
                  <p>{{ formatMoney(deal.price) }} · {{ deal.dealTag || '常规' }}</p>
                  <p class="muted">折算 500g：¥{{ deal.unitPrice500g }}</p>
                </div>
              </div>
            </section>
          </el-tab-pane>

          <el-tab-pane label="新鲜度检测" name="freshness">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>拍照识别（规则版）</h3>
                <el-form label-position="top">
                  <el-form-item label="图片名称 / 文件名">
                    <el-input v-model="freshnessForm.imageName" placeholder="例如：tomato_2026_03_12.jpg" />
                  </el-form-item>
                  <el-form-item label="补充描述（可选）">
                    <el-input v-model="freshnessForm.description" type="textarea" :rows="4" placeholder="例如：表面有点发黄，叶片有些软" />
                  </el-form-item>
                  <el-button type="primary" :loading="checkingFreshness" @click="onFreshnessCheck">开始检测</el-button>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>检测记录</h3>
                <el-empty v-if="!freshnessChecks.length" description="暂无检测记录" />
                <div v-else class="fresh-list">
                  <div class="fresh-item" v-for="check in freshnessChecks" :key="check.checkId">
                    <div class="row-between">
                      <strong>{{ check.imageName }}</strong>
                      <el-tag :type="check.freshnessScore >= 80 ? 'success' : check.freshnessScore >= 60 ? 'warning' : 'danger'">
                        {{ check.freshnessLevel }} · {{ check.freshnessScore }}
                      </el-tag>
                    </div>
                    <p>{{ check.summary }}</p>
                    <ul>
                      <li v-for="tip in check.tips" :key="tip">{{ tip }}</li>
                    </ul>
                    <p class="muted">{{ formatTime(check.createdAt) }}</p>
                  </div>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="预算规划" name="budget">
            <section class="grid-two">
              <article class="card-panel panel">
                <h3>家庭预算参数</h3>
                <el-form label-position="top">
                  <el-form-item label="每餐预算（元）">
                    <el-input-number v-model="budgetForm.budgetPerMeal" :min="5" :max="300" />
                  </el-form-item>
                  <el-form-item label="家庭人数">
                    <el-input-number v-model="budgetForm.familySize" :min="1" :max="10" />
                  </el-form-item>
                  <el-form-item label="每日做饭餐次">
                    <el-input-number v-model="budgetForm.mealsPerDay" :min="1" :max="4" />
                  </el-form-item>
                  <el-button type="primary" :loading="generatingBudget" @click="onBuildBudgetPlan">生成预算</el-button>
                </el-form>
              </article>

              <article class="card-panel panel">
                <h3>预算结果</h3>
                <el-empty v-if="!budgetPlan" description="尚未生成预算" />
                <div v-else class="budget-result">
                  <p><strong>日预算：</strong>{{ formatMoney(budgetPlan.dailyBudget) }}</p>
                  <p><strong>周预算：</strong>{{ formatMoney(budgetPlan.weeklyBudget) }}</p>
                  <p><strong>月预算：</strong>{{ formatMoney(budgetPlan.monthlyBudget) }}</p>
                  <p class="muted">分配建议：蔬菜 {{ formatMoney(budgetPlan.splitSuggestion.vegetable) }}，蛋白 {{ formatMoney(budgetPlan.splitSuggestion.protein) }}，主食 {{ formatMoney(budgetPlan.splitSuggestion.staple) }}</p>
                </div>
              </article>
            </section>
          </el-tab-pane>

          <el-tab-pane label="家庭偏好" name="preference">
            <section class="card-panel panel">
              <h3>默认偏好设置</h3>
              <el-form label-position="top" class="pref-form">
                <el-form-item label="默认每餐预算（元）">
                  <el-input-number v-model="preferenceForm.budgetPerMeal" :min="5" :max="300" />
                </el-form-item>
                <el-form-item label="默认家庭人数">
                  <el-input-number v-model="preferenceForm.familySize" :min="1" :max="10" />
                </el-form-item>
                <el-form-item label="饮食偏好备注">
                  <el-input v-model="preferenceForm.dietaryNotes" type="textarea" :rows="3" />
                </el-form-item>
                <el-button type="primary" :loading="savingPreference" @click="onSavePreference">保存偏好</el-button>
              </el-form>
            </section>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-skeleton>
  </section>
</template>

<style scoped>
.grocery-page {
  display: grid;
  gap: 14px;
}

.hero {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  background: radial-gradient(circle at 0% -20%, rgba(16, 185, 129, 0.2), transparent 35%), #fff;
}

.hero h2 {
  margin: 0;
}

.hero p {
  margin: 6px 0 0;
  color: var(--text-muted);
}

.overview {
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  font-size: 1.2rem;
  color: var(--brand);
}

.g-tabs :deep(.el-tabs__header) {
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

.muted {
  margin: 6px 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.hint {
  margin: 8px 0;
  color: #117a4b;
  font-weight: 600;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fff;
  font-size: 0.84rem;
}

.compare-list,
.menu-list,
.fresh-list {
  display: grid;
  gap: 10px;
}

.compare-item,
.menu-item,
.fresh-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}

.compare-item ul,
.menu-item ul,
.fresh-item ul {
  margin: 6px 0 0;
  padding-left: 18px;
}

.row-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.deal-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.deal-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}

.deal-item p {
  margin: 6px 0 0;
}

.budget-result p {
  margin: 8px 0;
}

.pref-form {
  max-width: 520px;
}

@media (max-width: 1180px) {
  .deal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 880px) {
  .grid-two {
    grid-template-columns: 1fr;
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

  .deal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
