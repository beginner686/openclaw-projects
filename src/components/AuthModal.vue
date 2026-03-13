<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const visible = ref(false)
const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)
const modalRef = ref<HTMLElement | null>(null)

const loginForm = reactive({
  account: 'demo@openclaw.ai',
  password: '123456',
  remember: true,
})

const registerForm = reactive({
  name: '',
  contact: '',
  password: '',
  confirmPassword: '',
  role: 'customer' as 'customer' | 'admin',
})

function open(tab: 'login' | 'register' = 'login') {
  activeTab.value = tab
  visible.value = true
}

defineExpose({ open })

function resetRegisterForm() {
  registerForm.name = ''
  registerForm.contact = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
  registerForm.role = 'customer'
}

function handleClose() {
  visible.value = false
  resetRegisterForm()
}

function handleMouseMove(e: MouseEvent) {
  if (!modalRef.value) return
  const rect = modalRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  modalRef.value.style.setProperty('--mouse-x', `${x}px`)
  modalRef.value.style.setProperty('--mouse-y', `${y}px`)
}

async function onLoginSubmit() {
  if (!loginForm.account.trim() || !loginForm.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(loginForm)
    ElMessage.success('登录成功')
    visible.value = false
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const normalizedRedirect = redirect === '/customer' ? '/app/customer' : redirect
    const fallbackPath = auth.isAdmin ? '/admin' : '/app/customer'
    await router.push(normalizedRedirect || fallbackPath)
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

async function onRegisterSubmit() {
  if (!registerForm.name.trim() || !registerForm.contact.trim() || !registerForm.password) {
    ElMessage.warning('请完整填写注册信息')
    return
  }
  if (registerForm.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    await auth.register({
      name: registerForm.name.trim(),
      contact: registerForm.contact.trim(),
      password: registerForm.password,
      role: registerForm.role,
    })
    ElMessage.success('注册成功，已自动登录')
    visible.value = false
    await router.push(auth.isAdmin ? '/admin' : '/app/customer')
  } catch (error) {
    const message = error instanceof Error ? error.message : '注册失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :width="440"
    :show-close="false"
    destroy-on-close
    append-to-body
    modal-class="auth-modal-overlay"
    class="auth-modal-dialog"
    @close="handleClose"
  >
    <div ref="modalRef" class="spotlight-modal" @mousemove="handleMouseMove">
      <div class="modal-inner-surface">
        <div class="mouse-flare"></div>

        <div class="close-btn" @click="handleClose">
          <el-icon :size="18"><Close /></el-icon>
        </div>

        <div class="modal-inner-content">
          <div class="auth-header">
            <h2 class="auth-title">接入 ClawPilot</h2>
            <p class="auth-subtitle">唤醒您的私有自动化节点</p>
          </div>

          <el-tabs v-model="activeTab" class="auth-tabs">
            <el-tab-pane label="登录" name="login">
              <el-form :model="loginForm" label-position="top" @submit.prevent="onLoginSubmit">
                <el-form-item label="账号">
                  <el-input v-model="loginForm.account" autocomplete="username" placeholder="输入邮箱或手机号" />
                </el-form-item>

                <el-form-item label="密码">
                  <el-input
                    v-model="loginForm.password"
                    autocomplete="current-password"
                    placeholder="输入密码"
                    show-password
                    type="password"
                    @keyup.enter="onLoginSubmit"
                  />
                </el-form-item>

                <div class="row-inline">
                  <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
                </div>

                <button class="cyber-submit-btn" :disabled="loading" type="button" @click="onLoginSubmit">
                  <span class="btn-text">{{ loading ? '连接中...' : '建立连接' }}</span>
                  <div class="btn-shimmer"></div>
                </button>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="注册" name="register">
              <el-form :model="registerForm" label-position="top" @submit.prevent="onRegisterSubmit">
                <el-form-item label="姓名">
                  <el-input v-model="registerForm.name" placeholder="请输入姓名" />
                </el-form-item>

                <el-form-item label="联系方式">
                  <el-input v-model="registerForm.contact" placeholder="邮箱或手机号" />
                </el-form-item>

                <el-form-item label="账号类型">
                  <el-radio-group v-model="registerForm.role">
                    <el-radio value="customer">客户</el-radio>
                    <el-radio value="admin">管理员</el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="密码">
                  <el-input v-model="registerForm.password" placeholder="至少 6 位安全字符" show-password type="password" />
                </el-form-item>

                <el-form-item label="确认密码">
                  <el-input
                    v-model="registerForm.confirmPassword"
                    placeholder="再次输入以确认"
                    show-password
                    type="password"
                    @keyup.enter="onRegisterSubmit"
                  />
                </el-form-item>

                <button class="cyber-submit-btn" :disabled="loading" type="button" @click="onRegisterSubmit">
                  <span class="btn-text">{{ loading ? '注册中...' : '生成访问权限' }}</span>
                  <div class="btn-shimmer"></div>
                </button>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style>
.el-dialog.auth-modal-dialog {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 20px !important;
  --el-dialog-bg-color: transparent !important;
  --el-dialog-box-shadow: none !important;
  border: none !important;
}

.el-dialog.auth-modal-dialog .el-dialog__header {
  display: none !important;
}

.el-dialog.auth-modal-dialog .el-dialog__body {
  padding: 0 !important;
  background: transparent !important;
}

.auth-modal-overlay {
  background: rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(12px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
}
</style>

<style scoped>
.spotlight-modal {
  position: relative;
  width: 100%;
  border-radius: 20px;
  padding: 1px;
  background-color: #1a1a1a;
  overflow: hidden;
  box-shadow: 0 40px 80px -10px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.1);
}

.spotlight-modal::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    transparent 260deg,
    rgba(99, 102, 241, 0.4) 290deg,
    #8b5cf6 320deg,
    #ffffff 360deg
  );
  animation: border-spin 4s linear infinite;
  z-index: 0;
}

.modal-inner-surface {
  position: relative;
  z-index: 1;
  border-radius: 19px;
  background-color: rgba(10, 10, 10, 0.95);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.1),
    inset 0 -1px 1px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.mouse-flare {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.4s ease;
  background: radial-gradient(
    600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255, 255, 255, 0.05),
    transparent 40%
  );
}

.modal-inner-surface:hover .mouse-flare {
  opacity: 1;
}

.modal-inner-content {
  position: relative;
  z-index: 10;
  padding: 48px 40px 40px;
  background: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  color: #64748b;
  cursor: pointer;
  z-index: 20;
  padding: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
  transform: rotate(90deg) scale(1.1);
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-title {
  margin: 0;
  font-size: 1.7rem;
  color: #ffffff;
  font-weight: 800;
  letter-spacing: -0.5px;
  text-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
}

.auth-subtitle {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 0.95rem;
}

.row-inline {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.08);
}

:deep(.el-tabs__item) {
  color: #64748b;
  font-size: 1.05rem;
  transition: color 0.3s;
}

:deep(.el-tabs__item:hover) {
  color: #cbd5e1;
}

:deep(.el-tabs__item.is-active) {
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

:deep(.el-tabs__active-bar) {
  background-color: #ffffff;
  box-shadow: 0 0 10px #fff;
}

:deep(.el-form-item__label) {
  color: #e2e8f0;
  font-weight: 500;
  padding-bottom: 8px;
  font-size: 0.9rem;
}

:deep(.el-input__wrapper) {
  background-color: rgba(20, 20, 20, 0.8);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.6) inset,
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.el-input__wrapper:hover) {
  background-color: rgba(30, 30, 30, 0.9);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.8) inset,
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
}

:deep(.el-input__wrapper.is-focus) {
  background-color: rgba(20, 20, 20, 1);
  box-shadow:
    0 0 0 1px #8b5cf6 inset,
    0 0 15px rgba(139, 92, 246, 0.4) !important;
}

:deep(.el-input__inner) {
  color: #f8fafc;
  height: 44px;
  font-size: 1.05rem;
}

:deep(.el-checkbox__label) {
  color: #94a3b8;
}

:deep(.el-checkbox__inner) {
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.el-radio__label) {
  color: #cbd5e1;
}

.cyber-submit-btn {
  width: 100%;
  height: 52px;
  margin-top: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  border-radius: 12px;
  border: none;
  box-shadow:
    0 0 20px rgba(255, 255, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    filter 0.2s;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cyber-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cyber-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 10px 30px rgba(255, 255, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  transform: skewX(-25deg);
  animation: swoop 2.5s infinite ease-in-out;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: overlay;
}

.btn-text {
  position: relative;
  z-index: 2;
}

@keyframes swoop {
  0% {
    left: -100%;
  }
  15% {
    left: 200%;
  }
  100% {
    left: 200%;
  }
}

@keyframes border-spin {
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 560px) {
  .modal-inner-content {
    padding: 40px 18px 24px;
  }
}
</style>
