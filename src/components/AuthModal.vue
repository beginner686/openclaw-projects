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
const activeTab = ref('login') // 'login' | 'register'
const loading = ref(false)
const modalRef = ref<HTMLElement | null>(null)

const loginForm = reactive({
  account: 'admin@openclaw.local',
  password: '123456',
  remember: true,
})

const registerForm = reactive({
  name: '',
  contact: '',
  password: '',
  confirmPassword: '',
})

// 暴露给外部调用的方法
const open = (tab: 'login' | 'register' = 'login') => {
  activeTab.value = tab
  visible.value = true
}

defineExpose({ open })

const handleClose = () => {
  visible.value = false
  // 清空注册表单数据防泄漏
  registerForm.name = ''
  registerForm.contact = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
}

// 物理探照灯核心算法
const handleMouseMove = (e: MouseEvent) => {
  if (!modalRef.value) return
  const rect = modalRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  modalRef.value.style.setProperty('--mouse-x', `${x}px`)
  modalRef.value.style.setProperty('--mouse-y', `${y}px`)
}

// 登录处理
const onLoginSubmit = async () => {
  if (!loginForm.account || !loginForm.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(loginForm)
    ElMessage.success('登录成功，欢迎回来。')
    visible.value = false
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/app/customer'
    const normalizedRedirect = redirect === '/customer' ? '/app/customer' : redirect
    await router.push(normalizedRedirect)
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后再试。'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

// 注册处理
const onRegisterSubmit = async () => {
  if (!registerForm.name.trim() || !registerForm.contact.trim() || !registerForm.password) {
    ElMessage.warning('请完整填写注册信息。')
    return
  }
  if (registerForm.password.length < 6) {
    ElMessage.warning('密码至少 6 位。')
    return
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致。')
    return
  }

  loading.value = true
  try {
    await auth.register({
      name: registerForm.name.trim(),
      contact: registerForm.contact.trim(),
      password: registerForm.password,
    })
    ElMessage.success('注册成功，已为你自动登录。')
    visible.value = false
    await router.push({ name: 'customer' })
  } catch (error) {
    const message = error instanceof Error ? error.message : '注册失败，请稍后再试。'
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
    @close="handleClose"
    class="auth-modal-dialog"
    custom-class="auth-modal-dialog"
  >
    <div class="spotlight-modal" ref="modalRef" @mousemove="handleMouseMove">
      <!-- 内部物理黑体空间屏障，收缩 1px 从而显露父元素的旋转彩条底色 -->
      <div class="modal-inner-surface">
        <!-- 鼠标随动的内嵌探照光晕 -->
        <div class="mouse-flare"></div>

        <!-- 悬浮在右上角的金属关闭舱门 -->
        <div class="close-btn" @click="handleClose">
          <el-icon :size="18"><Close /></el-icon>
        </div>

        <div class="modal-inner-content">
          <div class="auth-header">
            <h2 class="auth-title">接入 ClawPilot</h2>
            <p class="auth-subtitle">唤醒您的私有自动化节点</p>
          </div>

          <el-tabs v-model="activeTab" class="auth-tabs">
            <el-tab-pane label="授权登入" name="login">
              <el-form :model="loginForm" label-position="top" @submit.prevent="onLoginSubmit">
                <el-form-item label="核心通令 (账号)">
                  <el-input v-model="loginForm.account" placeholder="输入邮箱或手机号" autocomplete="username" />
                </el-form-item>

                <el-form-item label="物理密钥 (密码)">
                  <el-input
                    v-model="loginForm.password"
                    placeholder="输入密码"
                    type="password"
                    show-password
                    autocomplete="current-password"
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

            <el-tab-pane label="建立档案" name="register">
              <el-form :model="registerForm" label-position="top" @submit.prevent="onRegisterSubmit">
                <el-form-item label="代号 (姓名)">
                  <el-input v-model="registerForm.name" placeholder="请输入姓名" />
                </el-form-item>

                <el-form-item label="终端地址 (联系方式)">
                  <el-input v-model="registerForm.contact" placeholder="邮箱或手机号" />
                </el-form-item>

                <el-form-item label="设定密钥">
                  <el-input v-model="registerForm.password" type="password" show-password placeholder="至少 6 位安全字符" />
                </el-form-item>

                <el-form-item label="验证密钥">
                  <el-input
                    v-model="registerForm.confirmPassword"
                    type="password"
                    show-password
                    placeholder="再次输入以确认"
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
/* =========================================
   强制解构 ElDialog 保护壳，使本体透明
   ========================================= */
.auth-modal-dialog,
.el-dialog.auth-modal-dialog,
.el-dialog.auth-modal {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 20px !important;
  --el-dialog-bg-color: transparent !important;
  --el-dialog-box-shadow: none !important;
  /* 修复白色抖动/外溢现象 */
  border: none !important;
}
.el-dialog.auth-modal-dialog .el-dialog__header,
.el-dialog.auth-modal .el-dialog__header {
  display: none !important;
}
.el-dialog.auth-modal-dialog .el-dialog__body,
.el-dialog.auth-modal .el-dialog__body {
  padding: 0 !important;
  background: transparent !important;
}

/* 全方位压制弹窗底层蒙版，使用毛玻璃渲染真实的高级质感 */
.el-overlay {
  background: rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(12px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(160%) !important;
}
</style>

<style scoped>
/* =========================================
   RAYCAST / VERCEL TIER SPOTLIGHT MODAL
   （极致的旋转射线和深度微观质感）
   ========================================= */

/* 1. 外层：带有旋转射线渐变底图的容器 */
.spotlight-modal {
  position: relative;
  width: 100%;
  border-radius: 20px;
  /* 留出真正的 1 像素内边距给子元素去挡住大部分的底图，最终只露出 1 像素的边框线 */
  padding: 1px; 
  background-color: #1a1a1a; /* 提供一个基本暗层用于 fallback */
  overflow: hidden;
  box-shadow: 0 40px 80px -10px rgba(0,0,0,0.8), 0 0 40px rgba(99,102,241,0.1);
}

/* 动量雷达射线扫光作为伪元素底图 */
.spotlight-modal::before {
  content: '';
  position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
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

/* 2. 内部覆盖层：阻挡中间绝大多数底图，留白 1px 漏出旋转边框 */
.modal-inner-surface {
  position: relative;
  z-index: 1;
  border-radius: 19px; /* 比外壳少 1px */
  background-color: rgba(10, 10, 10, 0.95);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1),
              inset 0 -1px 1px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

/* 3. 内置物理指针光源散发 */
.mouse-flare {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  z-index: 2;
  opacity: 0; transition: opacity 0.4s ease;
  background: radial-gradient(
    600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
    rgba(255,255,255,0.05), 
    transparent 40%
  );
}
.modal-inner-surface:hover .mouse-flare {
  opacity: 1;
}

/* =========================================
   内胆具体业务 UI 层
   ========================================= */
.modal-inner-content {
  position: relative;
  z-index: 10;
  padding: 48px 40px 40px;
  background: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
}

.close-btn {
  position: absolute;
  top: 20px; right: 20px;
  color: #64748b; cursor: pointer;
  z-index: 20; padding: 6px; 
  border-radius: 50%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex; align-items: center; justify-content: center;
}
.close-btn:hover { 
  color: #fff; transform: rotate(90deg) scale(1.1); 
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.2);
}

.auth-header {
  text-align: center; margin-bottom: 32px;
}
.auth-title {
  margin: 0; font-size: 1.7rem; color: #ffffff;
  font-weight: 800; letter-spacing: -0.5px;
  text-shadow: 0 4px 15px rgba(0,0,0,0.5);
}
.auth-subtitle {
  margin: 8px 0 0; color: #94a3b8; font-size: 0.95rem;
}

/* =========================================
   精细定制 Element Plus 深色金属感输入组件
   ========================================= */
:deep(.el-tabs__nav-wrap::after) {
  height: 1px; background-color: rgba(255,255,255,0.08);
}
:deep(.el-tabs__item) {
  color: #64748b; font-size: 1.05rem; transition: color 0.3s;
}
:deep(.el-tabs__item:hover) { color: #cbd5e1; }
:deep(.el-tabs__item.is-active) {
  color: #ffffff; font-weight: 600; text-shadow: 0 0 10px rgba(255,255,255,0.3);
}
:deep(.el-tabs__active-bar) { background-color: #ffffff; box-shadow: 0 0 10px #fff; }

:deep(.el-form-item__label) {
  color: #e2e8f0; font-weight: 500; padding-bottom: 8px; font-size: 0.9rem;
}

:deep(.el-input__wrapper) {
  background-color: rgba(20,20,20,0.8);
  box-shadow: 0 1px 3px rgba(0,0,0,0.6) inset, 0 0 0 1px rgba(255,255,255,0.1) inset;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
:deep(.el-input__wrapper:hover) {
  background-color: rgba(30,30,30,0.9);
  box-shadow: 0 1px 3px rgba(0,0,0,0.8) inset, 0 0 0 1px rgba(255,255,255,0.2) inset;
}
:deep(.el-input__wrapper.is-focus) {
  background-color: rgba(20,20,20,1);
  box-shadow: 0 0 0 1px #8b5cf6 inset, 0 0 15px rgba(139, 92, 246, 0.4) !important;
}
:deep(.el-input__inner) { color: #f8fafc; height: 44px; font-size: 1.05rem; }
:deep(.el-checkbox__label) { color: #94a3b8; }
:deep(.el-checkbox__inner) { background-color: transparent; border-color: rgba(255,255,255,0.2); }

/* =========================================
   硅谷级提交按钮爆炸式悬浮
   ========================================= */
.cyber-submit-btn {
  width: 100%; height: 52px; margin-top: 10px;
  font-size: 1.1rem; font-weight: 700; color: #0f172a;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  border-radius: 12px; border: none;
  box-shadow: 0 0 20px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,1);
  transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
  position: relative; overflow: hidden; cursor: pointer;
  display: flex; justify-content: center; align-items: center;
}
.cyber-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cyber-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,1);
}
.btn-shimmer {
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
  transform: skewX(-25deg); animation: swoop 2.5s infinite ease-in-out;
  z-index: 1; pointer-events: none; mix-blend-mode: overlay;
}
.btn-text { position: relative; z-index: 2; }

@keyframes swoop {
  0% { left: -100%; } 15% { left: 200%; } 100% { left: 200%; }
}
@keyframes border-spin {
  100% { transform: rotate(360deg); }
}
</style>
