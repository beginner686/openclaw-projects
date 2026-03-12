<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import {
  fetchModuleSettings,
  updateModuleSettings,
  type ModuleSettings,
  type ModuleSettingsConfig,
} from '@/api/admin'

interface ModuleSettingsForm {
  executionMode: 'auto' | 'manual' | 'hybrid'
  maxConcurrency: number
  timeoutSeconds: number
  retryLimit: number
  alertEnabled: boolean
  alertChannels: string[]
  webhookUrl: string
  notifyEmailsText: string
  allowCustomerView: boolean
  allowExport: boolean
  focusChecksText: string
  riskSignalsText: string
  failSignalsText: string
  nextActionsText: string
  dataSource: string
  dashboardPath: string
  remarks: string
}

const route = useRoute()
const loading = ref(true)
const saving = ref(false)
const settings = ref<ModuleSettings | null>(null)
const form = ref<ModuleSettingsForm>(createEmptyForm())

const moduleKey = computed(() => String(route.params.moduleKey ?? ''))

const MODE_OPTIONS = [
  { value: 'hybrid', label: '混合模式（推荐）' },
  { value: 'auto', label: '全自动模式' },
  { value: 'manual', label: '人工确认模式' },
] as const

const CHANNEL_OPTIONS = [
  { value: 'site', label: '站内通知' },
  { value: 'email', label: '邮件通知' },
  { value: 'webhook', label: 'Webhook 回调' },
] as const

function createEmptyForm(): ModuleSettingsForm {
  return {
    executionMode: 'hybrid',
    maxConcurrency: 3,
    timeoutSeconds: 180,
    retryLimit: 1,
    alertEnabled: true,
    alertChannels: ['site'],
    webhookUrl: '',
    notifyEmailsText: '',
    allowCustomerView: true,
    allowExport: true,
    focusChecksText: '',
    riskSignalsText: '',
    failSignalsText: '',
    nextActionsText: '',
    dataSource: 'openclaw',
    dashboardPath: '',
    remarks: '',
  }
}

function toMultiLineText(values: string[]) {
  return (values ?? []).join('\n')
}

function toStringArray(text: string) {
  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50)
}

function applyConfigToForm(config: ModuleSettingsConfig) {
  form.value = {
    executionMode: config.execution.mode,
    maxConcurrency: config.execution.maxConcurrency,
    timeoutSeconds: config.execution.timeoutSeconds,
    retryLimit: config.execution.retryLimit,
    alertEnabled: config.alerts.enabled,
    alertChannels: [...(config.alerts.channels ?? ['site'])],
    webhookUrl: config.alerts.webhookUrl ?? '',
    notifyEmailsText: toMultiLineText(config.alerts.emails ?? []),
    allowCustomerView: config.visibility.allowCustomerView,
    allowExport: config.visibility.allowExport,
    focusChecksText: toMultiLineText(config.rule.focusChecks),
    riskSignalsText: toMultiLineText(config.rule.riskSignals),
    failSignalsText: toMultiLineText(config.rule.failSignals),
    nextActionsText: toMultiLineText(config.rule.nextActions),
    dataSource: config.integrations.dataSource ?? 'openclaw',
    dashboardPath: config.integrations.dashboardPath ?? `/admin/module/${moduleKey.value}`,
    remarks: config.remarks ?? '',
  }
}

function buildConfigFromForm(): ModuleSettingsConfig {
  return {
    execution: {
      mode: form.value.executionMode,
      maxConcurrency: form.value.maxConcurrency,
      timeoutSeconds: form.value.timeoutSeconds,
      retryLimit: form.value.retryLimit,
    },
    alerts: {
      enabled: form.value.alertEnabled,
      channels: form.value.alertChannels.length ? form.value.alertChannels : ['site'],
      webhookUrl: form.value.webhookUrl.trim(),
      emails: toStringArray(form.value.notifyEmailsText),
    },
    visibility: {
      allowCustomerView: form.value.allowCustomerView,
      allowExport: form.value.allowExport,
    },
    rule: {
      focusChecks: toStringArray(form.value.focusChecksText),
      riskSignals: toStringArray(form.value.riskSignalsText),
      failSignals: toStringArray(form.value.failSignalsText),
      nextActions: toStringArray(form.value.nextActionsText),
    },
    integrations: {
      dataSource: form.value.dataSource.trim() || 'openclaw',
      dashboardPath: form.value.dashboardPath.trim() || `/admin/module/${moduleKey.value}`,
      moduleCategory: settings.value?.moduleCategory ?? '',
    },
    remarks: form.value.remarks.trim(),
  }
}

function formatTime(iso: string | null) {
  if (!iso) return '未保存过'
  return iso.slice(0, 19).replace('T', ' ')
}

async function loadSettings() {
  loading.value = true
  try {
    const data = await fetchModuleSettings(moduleKey.value)
    settings.value = data
    applyConfigToForm(data.config)
  } catch {
    ElMessage.error('加载模块设置失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  if (!settings.value) return
  applyConfigToForm(settings.value.config)
  ElMessage.success('已重置为当前已加载配置')
}

async function saveSettings() {
  saving.value = true
  try {
    const data = await updateModuleSettings(moduleKey.value, buildConfigFromForm())
    settings.value = data
    applyConfigToForm(data.config)
    ElMessage.success('模块设置已保存')
  } catch {
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

watch(() => route.params.moduleKey, loadSettings)
onMounted(loadSettings)
</script>

<template>
  <div class="module-settings">
    <div class="page-header">
      <div>
        <h2 class="page-title">模块设置</h2>
        <p class="page-desc">
          配置当前子后台的执行策略、预警通道和规则参数。保存后仅影响该模块数据，不会影响其他模块。
        </p>
      </div>
      <div class="meta">
        <div>来源：{{ settings?.source === 'saved' ? '已保存配置' : '系统默认配置' }}</div>
        <div>最近更新：{{ formatTime(settings?.updatedAt ?? null) }}</div>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated />

    <template v-else>
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="提示：每个模块设置单独保存并隔离，不会覆盖其他模块配置。"
        class="tip"
      />

      <el-form label-position="top" class="settings-form">
        <section class="card">
          <h3>执行策略</h3>
          <div class="form-grid">
            <el-form-item label="执行模式">
              <el-select v-model="form.executionMode">
                <el-option
                  v-for="item in MODE_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="并发任务上限">
              <el-input-number v-model="form.maxConcurrency" :min="1" :max="20" />
            </el-form-item>

            <el-form-item label="超时秒数">
              <el-input-number v-model="form.timeoutSeconds" :min="30" :max="3600" />
            </el-form-item>

            <el-form-item label="失败重试次数">
              <el-input-number v-model="form.retryLimit" :min="0" :max="10" />
            </el-form-item>
          </div>
        </section>

        <section class="card">
          <h3>预警通知</h3>
          <el-form-item>
            <el-switch
              v-model="form.alertEnabled"
              inline-prompt
              active-text="启用"
              inactive-text="关闭"
            />
          </el-form-item>

          <el-form-item label="通知通道">
            <el-checkbox-group v-model="form.alertChannels">
              <el-checkbox
                v-for="item in CHANNEL_OPTIONS"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <div class="form-grid">
            <el-form-item label="Webhook 地址">
              <el-input v-model="form.webhookUrl" placeholder="https://example.com/webhook" />
            </el-form-item>
            <el-form-item label="邮件通知列表（每行一个）">
              <el-input
                v-model="form.notifyEmailsText"
                type="textarea"
                :rows="4"
                placeholder="ops@example.com"
              />
            </el-form-item>
          </div>
        </section>

        <section class="card">
          <h3>模块可见性</h3>
          <div class="switch-row">
            <span>允许客户查看该模块任务结果</span>
            <el-switch v-model="form.allowCustomerView" />
          </div>
          <div class="switch-row">
            <span>允许导出报告</span>
            <el-switch v-model="form.allowExport" />
          </div>
        </section>

        <section class="card">
          <h3>规则配置</h3>
          <div class="form-grid two-cols">
            <el-form-item label="重点检查项（每行一个）">
              <el-input v-model="form.focusChecksText" type="textarea" :rows="5" />
            </el-form-item>
            <el-form-item label="风险信号词（每行一个）">
              <el-input v-model="form.riskSignalsText" type="textarea" :rows="5" />
            </el-form-item>
            <el-form-item label="失败信号词（每行一个）">
              <el-input v-model="form.failSignalsText" type="textarea" :rows="5" />
            </el-form-item>
            <el-form-item label="后续动作（每行一个）">
              <el-input v-model="form.nextActionsText" type="textarea" :rows="5" />
            </el-form-item>
          </div>
        </section>

        <section class="card">
          <h3>系统接入信息</h3>
          <div class="form-grid">
            <el-form-item label="数据源标识">
              <el-input v-model="form.dataSource" />
            </el-form-item>
            <el-form-item label="模块后台路径">
              <el-input v-model="form.dashboardPath" />
            </el-form-item>
          </div>
          <el-form-item label="备注">
            <el-input
              v-model="form.remarks"
              type="textarea"
              :rows="4"
              placeholder="可填写模块负责人、对接说明、上线注意事项等。"
            />
          </el-form-item>
        </section>
      </el-form>

      <div class="actions">
        <el-button @click="resetForm">重置</el-button>
        <el-button type="primary" :loading="saving" @click="saveSettings">保存设置</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.module-settings {
  max-width: 1000px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 1.1rem;
}

.page-desc {
  margin: 6px 0 0;
  color: var(--text-muted, #666);
  font-size: 0.88rem;
}

.meta {
  min-width: 220px;
  text-align: right;
  font-size: 0.82rem;
  color: var(--text-muted, #666);
  line-height: 1.8;
}

.tip {
  margin-bottom: 16px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  padding: 16px;
  background: var(--bg-panel, #fff);
  border: 1px solid var(--line, #e8eaed);
  border-radius: 10px;
}

.card h3 {
  margin: 0 0 12px;
  font-size: 0.98rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px 14px;
}

.two-cols {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
</style>
