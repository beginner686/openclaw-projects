<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const visible = ref(false)
const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)

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
    :width="460"
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="modal-title">接入 ClawPilot</div>
    </template>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="登录" name="login">
        <el-form :model="loginForm" label-position="top" @submit.prevent="onLoginSubmit">
          <el-form-item label="账号">
            <el-input v-model="loginForm.account" placeholder="邮箱或手机号" autocomplete="username" />
          </el-form-item>

          <el-form-item label="密码">
            <el-input
              v-model="loginForm.password"
              type="password"
              show-password
              autocomplete="current-password"
              @keyup.enter="onLoginSubmit"
            />
          </el-form-item>

          <el-form-item>
            <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          </el-form-item>

          <el-button type="primary" :loading="loading" class="submit-btn" @click="onLoginSubmit">
            登录
          </el-button>
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
            <el-input v-model="registerForm.password" type="password" show-password placeholder="至少 6 位" />
          </el-form-item>

          <el-form-item label="确认密码">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              show-password
              placeholder="再次输入确认"
              @keyup.enter="onRegisterSubmit"
            />
          </el-form-item>

          <el-button type="primary" :loading="loading" class="submit-btn" @click="onRegisterSubmit">
            注册并进入
          </el-button>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<style scoped>
.modal-title {
  font-size: 18px;
  font-weight: 600;
}

.submit-btn {
  width: 100%;
}
</style>
