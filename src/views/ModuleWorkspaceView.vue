<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UploadProps, UploadUserFile } from 'element-plus'
import { moduleMap } from '@/config/modules'
import { fetchModuleHistory, fetchModuleTask, runModuleTask } from '@/api/modules'
import AntiFraudGuardianView from '@/views/AntiFraudGuardianView.vue'
import SmartGroceryView from '@/views/SmartGroceryView.vue'
import { useAuthStore } from '@/stores/auth'
import type { ModuleTaskResult } from '@/types/domain'

const route = useRoute()
const auth = useAuthStore()

const scenarioList = [
  '标准流程',
  '加急执行',
  '高安全模式',
  '批量任务',
]

const MAX_SCENARIO_LENGTH = 60
const MAX_INPUT_LENGTH = 6000
const MAX_ATTACHMENTS = 10

const taskForm = reactive({
  scenario: '标准流程',
  inputText: '',
  attachments: [] as string[],
})

const uploadList = ref<UploadUserFile[]>([])
const submitting = ref(false)
const loadingHistory = ref(false)
const latestResult = ref<ModuleTaskResult | null>(null)
const historyList = ref<ModuleTaskResult[]>([])
const errorText = ref('')
const latestTaskId = ref('')
const pollTimer = ref<number | null>(null)
const pollAttempts = ref(0)

const moduleKey = computed(() => String(route.params.moduleKey ?? ''))
const moduleMeta = computed(() => moduleMap.get(moduleKey.value))
const hasAccess = computed(() => auth.user?.enabledModules.includes(moduleKey.value) ?? false)
const isAntiFraudModule = computed(() => moduleKey.value === 'anti-fraud-guardian')
const isSmartGroceryModule = computed(() => moduleKey.value === 'smart-grocery-supermarket')
const isDedicatedModule = computed(() => isAntiFraudModule.value || isSmartGroceryModule.value)

const onUploadChange: UploadProps['onChange'] = (file, files) => {
  uploadList.value = files.slice(-5)
  taskForm.attachments = uploadList.value.map((item) => item.name)
  if (file.status === 'ready') {
    ElMessage.info(`已添加附件：${file.name}`)
  }
}

async function loadHistory() {
  if (!moduleMeta.value || !hasAccess.value || isDedicatedModule.value) {
    return
  }

  loadingHistory.value = true
  errorText.value = ''
  try {
    historyList.value = await fetchModuleHistory(moduleKey.value)
    if (latestTaskId.value) {
      const matched = historyList.value.find((item) => item.taskId === latestTaskId.value)
      if (matched) {
        latestResult.value = matched
        if (matched.status === 'completed' || matched.status === 'failed') {
          stopPolling()
        }
      }
    }
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '历史记录加载失败。'
  } finally {
    loadingHistory.value = false
  }
}

function statusTagType(status: ModuleTaskResult['status']) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'review') return 'warning'
  if (status === 'running') return 'warning'
  return 'info'
}

function stopPolling() {
  if (pollTimer.value !== null) {
    window.clearTimeout(pollTimer.value)
    pollTimer.value = null
  }
  pollAttempts.value = 0
}

function nextPollDelay() {
  return Math.min(2500 + pollAttempts.value * 900, 10000)
}

function scheduleNextPoll() {
  if (!latestTaskId.value) {
    return
  }
  if (pollTimer.value !== null) {
    window.clearTimeout(pollTimer.value)
  }
  pollTimer.value = window.setTimeout(() => {
    void pollLatestTask()
  }, nextPollDelay())
}

async function pollLatestTask() {
  if (!latestTaskId.value || !moduleMeta.value || !hasAccess.value || isDedicatedModule.value) {
    stopPolling()
    return
  }

  try {
    const task = await fetchModuleTask(moduleKey.value, latestTaskId.value)
    latestResult.value = task

    const targetIndex = historyList.value.findIndex((item) => item.taskId === task.taskId)
    if (targetIndex >= 0) {
      historyList.value[targetIndex] = task
    } else {
      historyList.value = [task, ...historyList.value].slice(0, 12)
    }

    if (task.status === 'queued' || task.status === 'running') {
      pollAttempts.value += 1
      scheduleNextPoll()
      return
    }

    stopPolling()
    await loadHistory()
  } catch (error) {
    pollAttempts.value += 1
    errorText.value = error instanceof Error ? error.message : '任务状态刷新失败。'
    if (pollAttempts.value <= 6) {
      scheduleNextPoll()
      return
    }
    stopPolling()
  }
}

function startPolling(taskId: string) {
  latestTaskId.value = taskId
  pollAttempts.value = 0
  scheduleNextPoll()
}

async function submitTask() {
  if (!moduleMeta.value) {
    return
  }

  const scenario = taskForm.scenario.trim()
  const inputText = taskForm.inputText.trim()

  if (!scenario || !inputText) {
    ElMessage.warning('请填写任务输入内容。')
    return
  }
  if (scenario.length > MAX_SCENARIO_LENGTH) {
    ElMessage.warning(`任务场景长度不能超过 ${MAX_SCENARIO_LENGTH} 字符。`)
    return
  }
  if (inputText.length > MAX_INPUT_LENGTH) {
    ElMessage.warning(`任务输入不能超过 ${MAX_INPUT_LENGTH} 字符。`)
    return
  }
  if (taskForm.attachments.length > MAX_ATTACHMENTS) {
    ElMessage.warning(`附件数量不能超过 ${MAX_ATTACHMENTS} 个。`)
    return
  }

  submitting.value = true
  errorText.value = ''

  try {
    const result = await runModuleTask({
      moduleKey: moduleKey.value,
      scenario,
      inputText,
      attachments: taskForm.attachments,
    })

    latestResult.value = result
    await loadHistory()
    if (result.status === 'queued' || result.status === 'running') {
      startPolling(result.taskId)
      ElMessage.success('任务已进入执行队列，系统会自动刷新进度。')
    } else if (result.status === 'review') {
      ElMessage.warning('任务已提交，当前处于待审核状态。')
    } else if (result.status === 'completed') {
      ElMessage.success('任务执行完成。')
    } else {
      ElMessage.warning('任务执行失败，请查看提示。')
    }
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '提交任务失败，请稍后重试。'
    ElMessage.error(errorText.value)
  } finally {
    submitting.value = false
  }
}

watch(moduleKey, () => {
  stopPolling()
  taskForm.inputText = ''
  taskForm.attachments = []
  uploadList.value = []
  latestResult.value = null
  latestTaskId.value = ''
  pollAttempts.value = 0
  void loadHistory()
})

onMounted(() => {
  void loadHistory()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <section class="page-container">
    <header class="card-panel module-head" v-if="moduleMeta">
      <div>
        <h2 class="section-title">{{ moduleMeta.name }}</h2>
        <p class="section-subtitle">{{ moduleMeta.description }}</p>
      </div>
      <div class="head-tags">
        <el-tag>{{ moduleMeta.category === 'enterprise' ? '企业服务' : '个人服务' }}</el-tag>
        <el-tag :type="moduleMeta.status === 'active' ? 'success' : 'warning'">{{ moduleMeta.status }}</el-tag>
        <el-tag type="info">移动端支持: {{ moduleMeta.mobileSupported ? '是' : '否' }}</el-tag>
      </div>
    </header>

    <el-alert
      v-if="!hasAccess"
      type="warning"
      show-icon
      :closable="false"
      title="当前账号未开通该业务，请在客户中心查看权限。"
    />

    <AntiFraudGuardianView v-if="moduleMeta && hasAccess && isAntiFraudModule" />

    <SmartGroceryView v-if="moduleMeta && hasAccess && isSmartGroceryModule" />

    <div class="module-grid" v-if="moduleMeta && hasAccess && !isDedicatedModule">
      <section class="card-panel task-form-panel">
        <h3>任务配置</h3>
        <el-form label-position="top">
          <el-form-item label="执行场景">
            <el-select v-model="taskForm.scenario" placeholder="请选择执行场景">
              <el-option v-for="scenario in scenarioList" :key="scenario" :label="scenario" :value="scenario" />
            </el-select>
          </el-form-item>

          <el-form-item label="任务输入">
            <el-input
              v-model="taskForm.inputText"
              type="textarea"
              :rows="6"
              placeholder="请输入任务内容、规则或说明，例如：请对本周营销数据做复盘并输出 PDF 报告。"
            />
          </el-form-item>

          <el-form-item label="附件上传（演示）">
            <el-upload
              drag
              action="#"
              :auto-upload="false"
              :file-list="uploadList"
              :on-change="onUploadChange"
              multiple
            >
              <div class="upload-content">
                <p>拖拽文件到此处，或点击上传</p>
                <p class="upload-tip">仅做前台演示，不会真实上传服务器</p>
              </div>
            </el-upload>
          </el-form-item>

          <el-button type="primary" :loading="submitting" @click="submitTask">提交任务</el-button>
        </el-form>
      </section>

      <section class="right-column">
        <article class="card-panel result-panel">
          <h3>执行结果</h3>
          <el-empty v-if="!latestResult" description="提交任务后在这里展示最新结果" />
          <div v-else class="result-content">
            <el-tag :type="statusTagType(latestResult.status)">
              {{ latestResult.status }}
            </el-tag>
            <p>{{ latestResult.summary }}</p>
            <p class="muted">更新时间：{{ latestResult.updatedAt }}</p>
            <el-link v-if="latestResult.reportUrl" :href="latestResult.reportUrl || '#'" type="primary">下载结果报告</el-link>
            <el-alert
              v-if="latestResult.errorMessage"
              type="error"
              show-icon
              :closable="false"
              :title="latestResult.errorMessage"
            />
          </div>
        </article>

        <article class="card-panel history-panel">
          <h3>任务历史</h3>
          <el-skeleton :loading="loadingHistory" animated :rows="4">
            <template #default>
              <el-empty v-if="!historyList.length" description="暂无历史任务" />
              <div v-else class="history-list">
                <div class="history-item" v-for="item in historyList" :key="item.taskId">
                  <div class="row-between">
                    <strong>{{ item.taskId }}</strong>
                    <el-tag :type="statusTagType(item.status)">
                      {{ item.status }}
                    </el-tag>
                  </div>
                  <p>{{ item.summary }}</p>
                  <p class="muted">{{ item.updatedAt }}</p>
                </div>
              </div>
            </template>
          </el-skeleton>
        </article>
      </section>
    </div>

    <el-alert v-if="errorText" :title="errorText" type="error" :closable="false" show-icon />
  </section>
</template>

<style scoped>
.module-head {
  padding: 14px;
  display: grid;
  gap: 10px;
}

.head-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.module-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

.task-form-panel,
.result-panel,
.history-panel {
  padding: 14px;
}

.task-form-panel h3,
.result-panel h3,
.history-panel h3 {
  margin: 0 0 12px;
}

.right-column {
  display: grid;
  gap: 12px;
}

.result-content {
  display: grid;
  gap: 10px;
}

.result-content p {
  margin: 0;
}

.muted {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.upload-content {
  text-align: center;
  color: var(--text-muted);
}

.upload-content p {
  margin: 0;
}

.upload-tip {
  margin-top: 6px;
  font-size: 0.82rem;
}

.history-list {
  display: grid;
  gap: 8px;
}

.history-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px;
}

.row-between {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.history-item p {
  margin: 8px 0 0;
}

@media (max-width: 980px) {
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>


