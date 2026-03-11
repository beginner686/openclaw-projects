<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const form = reactive({
  account: 'demo@openclaw.ai',
  password: '123456',
  remember: true,
})

async function onSubmit() {
  loading.value = true
  try {
    await auth.login(form)
    ElMessage.success('登录成功，欢迎回来。')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/customer'
    await router.push(redirect)
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后再试。'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-hero">
      <p class="badge">OpenClaw Front Portal</p>
      <h1>小龙虾 AI 自动化前台入口</h1>
      <p>
        一个账号统一访问 15 个自动化业务场景，支持桌面与移动端流畅切换。
      </p>
      <ul>
        <li>演示账号: demo@openclaw.ai</li>
        <li>演示密码: 123456</li>
      </ul>
    </div>

    <el-form class="auth-form card-panel" :model="form" label-position="top" @submit.prevent="onSubmit">
      <h2>登录账号</h2>
      <p>登录后可进入客户中心并访问已开通业务。</p>

      <el-form-item label="账号（邮箱或手机号）">
        <el-input v-model="form.account" placeholder="请输入账号" autocomplete="username" />
      </el-form-item>

      <el-form-item label="密码">
        <el-input
          v-model="form.password"
          placeholder="请输入密码"
          type="password"
          show-password
          autocomplete="current-password"
        />
      </el-form-item>

      <div class="row-inline">
        <el-checkbox v-model="form.remember">记住登录状态</el-checkbox>
        <RouterLink to="/register">没有账号？立即注册</RouterLink>
      </div>

      <el-button class="submit-btn" type="primary" :loading="loading" @click="onSubmit">进入平台</el-button>
    </el-form>
  </section>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 24px;
  padding: clamp(16px, 4vw, 42px);
  align-items: center;
}

.auth-hero {
  color: var(--text-strong);
}

.badge {
  display: inline-block;
  margin: 0;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.65);
  color: var(--brand-deep);
  font-size: 0.8rem;
  font-weight: 600;
}

.auth-hero h1 {
  margin: 14px 0 10px;
  font-size: clamp(1.7rem, 5vw, 2.5rem);
}

.auth-hero p {
  margin: 0;
  color: var(--text-muted);
  max-width: 480px;
}

.auth-hero ul {
  margin: 18px 0 0;
  padding-left: 18px;
  color: var(--text-muted);
}

.auth-form {
  padding: 22px;
}

.auth-form h2 {
  margin: 0;
}

.auth-form p {
  margin: 8px 0 18px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.row-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.submit-btn {
  width: 100%;
  height: 42px;
}

@media (max-width: 900px) {
  .auth-page {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 14px;
  }
}
</style>
