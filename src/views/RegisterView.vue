<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)

const form = reactive({
  name: '',
  contact: '',
  password: '',
  confirmPassword: '',
})

async function onSubmit() {
  if (!form.name.trim() || !form.contact.trim() || !form.password) {
    ElMessage.warning('请完整填写注册信息。')
    return
  }

  if (form.password.length < 6) {
    ElMessage.warning('密码至少 6 位。')
    return
  }

  if (form.password !== form.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致。')
    return
  }

  loading.value = true
  try {
    await auth.register({
      name: form.name.trim(),
      contact: form.contact.trim(),
      password: form.password,
    })
    ElMessage.success('注册成功，已为你自动登录。')
    await router.push('/customer')
  } catch (error) {
    const message = error instanceof Error ? error.message : '注册失败，请稍后再试。'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-page">
    <div class="auth-hero">
      <p class="badge">Create Account</p>
      <h1>创建你的前台账号</h1>
      <p>注册后将自动分配基础业务权限，可在客户中心查看开通模块与任务状态。</p>
    </div>

    <el-form class="auth-form card-panel" :model="form" label-position="top" @submit.prevent="onSubmit">
      <h2>注册</h2>
      <p>建议使用常用邮箱或手机号，便于后续接收任务提醒。</p>

      <el-form-item label="姓名">
        <el-input v-model="form.name" placeholder="请输入姓名" />
      </el-form-item>

      <el-form-item label="联系方式（邮箱或手机号）">
        <el-input v-model="form.contact" placeholder="请输入联系方式" />
      </el-form-item>

      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
      </el-form-item>

      <el-form-item label="确认密码">
        <el-input v-model="form.confirmPassword" type="password" show-password placeholder="请再次输入密码" />
      </el-form-item>

      <div class="row-inline">
        <RouterLink to="/login">已有账号，去登录</RouterLink>
      </div>

      <el-button class="submit-btn" type="primary" :loading="loading" @click="onSubmit">立即创建</el-button>
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

.auth-hero h1 {
  margin: 14px 0 10px;
  font-size: clamp(1.7rem, 5vw, 2.5rem);
}

.auth-hero p {
  margin: 0;
  color: var(--text-muted);
  max-width: 480px;
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
  justify-content: flex-end;
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
