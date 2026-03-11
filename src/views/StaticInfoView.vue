<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageMap = {
  help: {
    title: '帮助中心',
    text: [
      '1. 先在左侧选择业务模块，再填写任务输入并提交。',
      '2. 任务执行结果会显示在右侧结果区，同时写入历史列表。',
      '3. 手机端建议优先使用简化场景与短文本输入。',
    ],
  },
  contact: {
    title: '联系我们',
    text: [
      '商务合作：bd@openclaw.ai',
      '技术支持：support@openclaw.ai',
      '工作时间：周一至周日 09:00 - 21:00',
    ],
  },
  terms: {
    title: '服务条款',
    text: [
      '平台提供自动化流程能力，用户需确保提交数据合法合规。',
      '任务结果仅用于业务辅助决策，不构成法律或财务承诺。',
      '如需企业级 SLA，请联系商务签订增值协议。',
    ],
  },
  privacy: {
    title: '隐私政策',
    text: [
      '仅在完成服务所需范围内处理用户数据。',
      '默认启用最小权限原则，用户仅可访问自身数据。',
      '支持按账号发起数据导出与删除申请。',
    ],
  },
} as const

const pageKey = computed(() => route.meta.pageKey ?? 'help')
const pageData = computed(() => pageMap[pageKey.value])
</script>

<template>
  <section class="page-container">
    <article class="card-panel info-page">
      <h2 class="section-title">{{ pageData.title }}</h2>
      <p v-for="line in pageData.text" :key="line">{{ line }}</p>
    </article>
  </section>
</template>

<style scoped>
.info-page {
  padding: 16px;
  display: grid;
  gap: 10px;
}

.info-page p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}
</style>
