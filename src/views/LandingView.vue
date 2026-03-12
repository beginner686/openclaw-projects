<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthModal from '@/components/AuthModal.vue'
import { useAuthStore } from '@/stores/auth'
import { moduleCatalog } from '@/config/modules'

const router = useRouter()
const authStore = useAuthStore()

const authModalRef = ref<InstanceType<typeof AuthModal> | null>(null)
const matrixGridRef = ref<HTMLElement | null>(null)
const imageOnlyModuleKeys = new Set([
  'invoice-recovery-archive',
  'debt-evidence-manager',
  'enterprise-marketing-automation',
  'public-opinion-monitoring',
  'lead-capture-followup',
  'private-domain-operations',
  'data-retrospective-automation',
  'anti-fraud-guardian',
  'personal-invoice-manager',
])

const imageModules = computed(() =>
  moduleCatalog.filter((item) => imageOnlyModuleKeys.has(item.moduleKey)),
)

const handleAction = (type: 'login' | 'register') => {
  if (authStore.isAuthenticated) {
    router.push({ name: 'customer' })
  } else {
    authModalRef.value?.open(type)
  }
}

// -------------------------------------
// Vercel-style 探照灯物理效果核心逻辑
// 当鼠标在卡片容器内滑动时，捕获相对每个物理卡片的坐标！
// -------------------------------------
const handleMouseMove = (e: MouseEvent) => {
  if (!matrixGridRef.value) return
  // 获取容器内每一个带 'spotlight-card' class 的 DOM
  const cards = matrixGridRef.value.querySelectorAll('.spotlight-card')
  
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect()
    // 计算光标相对于卡片自身的 left 和 top
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 将相对坐标设为该内部元素的 CSS Variable，CSS 拿到再做 mask
    ;(card as HTMLElement).style.setProperty('--mouse-x', `${x}px`)
    ;(card as HTMLElement).style.setProperty('--mouse-y', `${y}px`)
  })
}
</script>

<template>
  <div class="landing-page dark-abyss">
    <!-- 极暗深邃网格 & 巨型极光光源 -->
    <div class="abyss-grid"></div>
    <div class="abyss-aurora aurora-1"></div>
    <div class="abyss-aurora aurora-2"></div>
    <div class="abyss-aurora aurora-3"></div>

    <!-- 顶部极简导航栏 -->
    <header class="hacker-nav">
      <div class="logo">
        <img src="../assets/clawpilot_logo.png" alt="ClawPilot" class="cyber-logo-img" />
        <span class="logo-text">ClawPilot AI</span>
      </div>
      <div class="nav-actions">
        <template v-if="authStore.isAuthenticated">
          <button class="nav-btn cyber-outline-btn dashboard-btn" @click="handleAction('login')">
            进入控制台
          </button>
        </template>
        <template v-else>
          <button class="nav-btn cyber-ghost-btn" @click="handleAction('login')">登录</button>
          <button class="nav-btn cyber-glow-btn" @click="handleAction('register')">
            即刻接入
          </button>
        </template>
      </div>
    </header>

    <!-- 主视觉巨幕 (The Hero Theater) -->
    <main class="hero-theater">
      <div class="hero-content">
        <div class="status-pill-wrapper">
          <div class="status-pill">
            <span class="pulse-dot"></span>
            <span class="pill-text">Engine Online · 9 核心模块就绪</span>
          </div>
        </div>
        
        <h1 class="hero-title">
          超越产能极限，<br />
          <span class="text-holographic">唤醒 </span>你的数字分身矩阵。
        </h1>
        
        <p class="hero-subtitle">
          抛硬币决定不了企业的生死，但数据和自动化可以。<br class="hidden-mobile" />
          全天候线索抓取、自动复盘与发票追踪，以前所有未见的方式接管你的疲惫。
        </p>

        <div class="hero-actions">
          <button class="cyber-mega-btn" @click="handleAction('register')">
            <span class="btn-text">无缝启动引擎</span>
            <div class="btn-shimmer-sweep"></div>
          </button>
        </div>
      </div>
    </main>

    <!-- 物理探照灯阵列 (The Arsenal) -->
    <section class="arsenal-section" id="arsenal">
      <div class="arsenal-header">
        <h2 class="arsenal-title">核心重型武器库</h2>
        <p class="arsenal-subtitle">按需装备你的企业架构，从私域池到发票库彻底摆脱人力束缚。</p>
      </div>

      <!-- ！！核心光标探路容器 ！！ -->
      <div class="arsenal-grid" ref="matrixGridRef" @mousemove="handleMouseMove">
        
        <div 
          v-for="item in imageModules" 
          :key="item.moduleKey" 
          class="spotlight-card"
        >
          <!-- 底层的高光发散层，随鼠标位置改变遮罩透明度 -->
          <div class="spotlight-glow"></div>
          <!-- 边框的高亮层 -->
          <div class="spotlight-border"></div>
          
          <div class="card-content">
            <div class="card-head">
              <div class="card-icon">
                <img v-if="item.moduleKey === 'invoice-recovery-archive'" src="../assets/module_invoice.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'debt-evidence-manager'" src="../assets/module_evidence.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'enterprise-marketing-automation'" src="../assets/module_marketing.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'public-opinion-monitoring'" src="../assets/module_public_sentiment.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'lead-capture-followup'" src="../assets/module_leads.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'private-domain-operations'" src="../assets/module_private_domain.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'data-retrospective-automation'" src="../assets/module_data_review.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'anti-fraud-guardian'" src="../assets/module_anti_fraud.png" class="custom-card-icon" />
                <img v-else-if="item.moduleKey === 'personal-invoice-manager'" src="../assets/module_personal_ticket.png" class="custom-card-icon" />
                <el-icon v-else><component :is="item.icon" /></el-icon>
              </div>
              <span class="card-blueprint-tag">{{ item.category === 'enterprise' ? 'Enterprise' : 'Personal' }}</span>
            </div>
            <h3 class="card-title">{{ item.name }}</h3>
            <p class="card-desc">{{ item.description }}</p>
            <div v-if="item.status === 'beta'" class="card-beta-mark">BETA</div>
          </div>
        </div>

      </div>
    </section>

    <!-- 终极黑客拦截栏 (Deep Impact Footer) -->
    <section class="deep-impact-section">
      <div class="horizon-line"></div>
      <div class="impact-content">
        <h2 class="impact-title">未来，就此降临。</h2>
        <p class="impact-subtitle">即刻注册体验，开始统治你的工作流。</p>
        <button class="cyber-mega-btn variant-white" @click="handleAction('register')">
          <span class="btn-text">获取极密权限</span>
          <div class="btn-shimmer-sweep"></div>
        </button>
      </div>
      <div class="horizon-glow"></div>
    </section>

    <footer class="abyss-footer">
      <div class="footer-brand">
        <img src="../assets/clawpilot_logo.png" alt="ClawPilot" class="cyber-logo-img mini" />
        <span>ClawPilot System</span>
      </div>
      <p class="copyright">V1.0.0 © 2026</p>
    </footer>

    <!-- 全局鉴权弹窗 (维持原有逻辑，仅调整暗色系或默认色) -->
    <AuthModal ref="authModalRef" />
  </div>
</template>

<style scoped>
/* =========================================
   THE ULTIMATE DARK ABYSS THEME (究极黑客暗黑主题)
   ========================================= */

.landing-page.dark-abyss {
  background-color: #000000;
  color: #ffffff;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  /* 平滑全站滚动 */
  scroll-behavior: smooth; 
}

/* 1. 视差底图：超细暗黑网格 */
.abyss-grid {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(circle at center 0%, rgba(0,0,0,1) 0%, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at center 0%, rgba(0,0,0,1) 0%, transparent 80%);
  z-index: 0;
  pointer-events: none;
}

/* 巨型模糊光晕 (Auroras) */
.abyss-aurora {
  position: fixed;
  border-radius: 50%;
  filter: blur(140px);
  z-index: 0;
  opacity: 0.35;
  pointer-events: none;
}
.aurora-1 {
  width: 60vw; height: 60vh;
  background: #4f46e5; /* 靛青蓝 */
  top: -20vh; left: -10vw;
  animation: aurora-float 20s infinite alternate ease-in-out;
}
.aurora-2 {
  width: 50vw; height: 50vh;
  background: #d946ef; /* 赛博紫 */
  bottom: -20vh; right: -10vw;
  animation: aurora-float 25s infinite alternate-reverse ease-in-out;
}
.aurora-3 {
  width: 40vw; height: 40vh;
  background: #10b981; /* 翡翠绿 */
  top: 40vh; left: 30vw;
  opacity: 0.2;
  animation: aurora-float 30s infinite alternate ease-in-out;
}

/* ==================
   HEADER 极客导航
   ================== */
.hacker-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 6%;
  position: relative;
  z-index: 100;
  background: transparent;
}
.logo { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.cyber-logo-img {
  width: 36px; height: 36px;
  border-radius: 8px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.4)) drop-shadow(0 0 20px rgba(14, 165, 233, 0.2));
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.3s;
}
.cyber-logo-img:hover {
  transform: scale(1.1) rotate(5deg);
  filter: drop-shadow(0 0 15px rgba(79, 70, 229, 0.8)) drop-shadow(0 0 30px rgba(14, 165, 233, 0.6));
}
.cyber-logo-img.mini { width: 24px; height: 24px; filter: drop-shadow(0 0 5px rgba(79, 70, 229, 0.5)); }

.logo-text { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.5px; }

.nav-actions { display: flex; gap: 16px; align-items: center; }
.nav-btn {
  background: transparent; border: none; font-size: 0.95rem; font-weight: 600; cursor: pointer;
  transition: all 0.2s; color: #94a3b8; outline: none; padding: 10px 24px; border-radius: 999px;
}
.cyber-ghost-btn:hover { color: #ffffff; }
.cyber-outline-btn { border: 1px solid rgba(255,255,255,0.2); color: #ffffff; }
.cyber-outline-btn:hover { background: rgba(255,255,255,0.05); }

/* 原生高光按钮 */
.cyber-glow-btn {
  background: #ffffff; color: #000000;
  box-shadow: 0 0 20px rgba(255,255,255,0.3);
}
.cyber-glow-btn:hover {
  transform: translateY(-2px); box-shadow: 0 0 30px rgba(255,255,255,0.5);
}


/* ==================
   HERO 史诗帷幕
   ================== */
.hero-theater {
  position: relative;
  z-index: 10;
  padding: 12vh 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-content {
  max-width: 1000px;
}

/* 引擎心跳胶囊 */
.status-pill-wrapper { margin-bottom: 40px; animation: reveal-up 1s ease-out; }
.status-pill {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 20px; border-radius: 999px;
  background: rgba(255,255,255,0.03); 
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
}
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #10b981;
  box-shadow: 0 0 10px #10b981, 0 0 20px #10b981;
  animation: heart-beat 2s infinite;
}
.pill-text { font-size: 0.85rem; color: #cbd5e1; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }

/* 磁暴镭射标题 */
.hero-title {
  font-size: clamp(3rem, 7vw, 5.5rem);
  line-height: 1.1; font-weight: 900;
  letter-spacing: -2px; margin: 0 0 32px;
  animation: reveal-up 1s ease-out 0.1s both;
  color: #ffffff;
}
.text-holographic {
  background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(255,255,255,0.2);
}

.hero-subtitle {
  font-size: clamp(1.1rem, 2.5vw, 1.3rem);
  color: #94a3b8; line-height: 1.8; max-width: 760px;
  margin: 0 auto 50px; font-weight: 400;
  animation: reveal-up 1s ease-out 0.2s both;
}

/* 赛博巨大召唤钮 */
.hero-actions { animation: reveal-up 1s ease-out 0.3s both; }
.cyber-mega-btn {
  position: relative; overflow: hidden;
  background: #ffffff; color: #000;
  border: none; border-radius: 999px;
  height: 64px; padding: 0 48px;
  font-size: 1.2rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 0 30px rgba(255,255,255,0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}
.cyber-mega-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 0 50px rgba(255,255,255,0.4);
}
.btn-text { position: relative; z-index: 2; }
.btn-shimmer-sweep {
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent);
  transform: skewX(-20deg); animation: swoop 3s infinite; z-index: 1;
}

/* ==================
   ARSENAL (物理探照灯矩阵) 
   ================== */
.arsenal-section {
  position: relative; z-index: 10;
  padding: 160px 5% 100px; max-width: 1400px; margin: 0 auto;
}
.arsenal-header { text-align: center; margin-bottom: 80px; }
.arsenal-title {
  font-size: clamp(2.2rem, 4vw, 3rem); font-weight: 800;
  margin: 0 0 20px; letter-spacing: -1px;
}
.arsenal-subtitle { color: #94a3b8; font-size: 1.15rem; max-width: 600px; margin: 0 auto;}

.arsenal-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;
  /* 允许卡片捕捉鼠标 */
}

/* --- THE SPOTLIGHT CARD (魔法所在) --- */
.spotlight-card {
  position: relative;
  background-color: rgba(255, 255, 255, 0.02); /* 极暗的底色 */
  border-radius: 20px;
  height: 240px; /* 固定物理块高度 */
  cursor: default;
  /* 默认隐藏高亮遮罩，只在内部计算 */
  overflow: hidden; 
}
.spotlight-card::before {
  /* 固定底色边线 */
  content: ''; position: absolute; inset: 0;
  border-radius: 20px; padding: 1px;
  background: rgba(255,255,255,0.06); 
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  pointer-events: none;
}

/* 面板漂浮动画 */
.spotlight-card:hover { transform: translateY(-4px); }

/* --- 核心光栅 1：边框扫光层 --- */
.spotlight-border {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 20px;
  opacity: 0; transition: opacity 0.3s; z-index: 2; pointer-events: none;
  /* 使用从 script 传入的 --mouse-x, --mouse-y 进行光环渲染 */
  background: radial-gradient(
    600px circle at var(--mouse-x) var(--mouse-y), 
    rgba(255,255,255,1), 
    transparent 40%
  );
  /* 巧妙应用 mask，只显示边框1px宽度区域 */
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  padding: 1px; /* 控制发光边框厚度 */
}

/* --- 核心光栅 2：内部底光模糊层 --- */
.spotlight-glow {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 20px;
  opacity: 0; transition: opacity 0.3s; z-index: 1; pointer-events: none;
  background: radial-gradient(
    800px circle at var(--mouse-x) var(--mouse-y), 
    rgba(255,255,255,0.04), 
    transparent 40%
  );
}

.spotlight-card:hover .spotlight-border, 
.spotlight-card:hover .spotlight-glow { opacity: 1; }

/* 卡片真实内容 */
.card-content {
  position: absolute; inset: 1px; /* 避开1px边框 */
  background-color: #050505; /* 纯黑内胆 */
  border-radius: 19px; padding: 32px 28px; z-index: 5;
  display: flex; flex-direction: column;
}

.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-icon {
  font-size: 26px; color: #ffffff;
  background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: center; align-items: center;
  width: 52px; height: 52px;
  overflow: hidden;
}

/* 神级去黑底与增幅光晕 */
.custom-card-icon {
  width: 160%; height: 160%;
  object-fit: contain;
  mix-blend-mode: screen; /* 像素级过滤一切黑色值 (#000000 -> 透明) */
  filter: contrast(120%) brightness(1.2) drop-shadow(0 0 8px rgba(99, 102, 241, 0.6));
}

.card-blueprint-tag {
  font-size: 0.75rem; font-weight: 600; font-family: monospace;
  color: #64748b; text-transform: uppercase; letter-spacing: 1px;
}

.card-title { font-size: 1.2rem; font-weight: 700; color: #f8fafc; margin: 0 0 12px; }
.card-desc { font-size: 0.95rem; color: #64748b; line-height: 1.6; margin: 0; flex: 1; }
.card-beta-mark {
  position: absolute; bottom: 32px; right: 28px;
  font-family: monospace; font-size: 0.7rem; color: #d946ef;
  background: rgba(217, 70, 239, 0.1); padding: 4px 8px; border-radius: 4px;
}

/* --- 信任背书横幅 (Deep Dark Marquee) --- */
.trust-banner {
  width: 100%; /* 这里直接加个暗色带子 */
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 0;
  overflow: hidden;
  position: relative;
  z-index: 20;
}
.marquee-track {
  display: flex;
  align-items: center;
  gap: 32px;
  width: max-content;
  animation: scroll-left 40s linear infinite;
}
.marquee-item {
  font-size: 0.95rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}
.marquee-separator {
  color: #334155;
}

/* ==================
   DEEP IMPACT FOOTER
   ================== */
.deep-impact-section {
  position: relative; padding: 180px 0; text-align: center;
  background: black; z-index: 10;
  overflow: hidden;
}
.horizon-line {
  position: absolute; top: 0; left: 0; width: 100%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}
.horizon-glow {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 60%; height: 200px;
  background: radial-gradient(ellipse at top, rgba(255,255,255,0.1), transparent 70%);
  pointer-events: none;
}
.impact-content { position: relative; z-index: 5; }
.impact-title { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; margin: 0 0 20px; letter-spacing: -2px; }
.impact-subtitle { font-size: 1.2rem; color: #94a3b8; margin: 0 auto 50px; }

/* 按钮变态色 */
.variant-white { background: #ffffff; color: #000; box-shadow: 0 0 50px rgba(255,255,255,0.2); }
.variant-white:hover { box-shadow: 0 0 80px rgba(255,255,255,0.5); }

/* 底栏版权 */
.abyss-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 40px 6%; border-top: 1px solid rgba(255,255,255,0.05); background: #000;
  position: relative; z-index: 10;
}
.footer-brand { display: flex; align-items: center; gap: 10px; color: #64748b; font-weight: 600; font-size: 0.95rem; }
.copyright { margin: 0; color: #475569; font-size: 0.85rem; font-family: monospace; }


/* ==================
   ANIMATIONS
   ================== */
@keyframes aurora-float {
  0% { transform: scale(1) translate(0,0); }
  100% { transform: scale(1.2) translate(8vw, 10vh); }
}
@keyframes reveal-up {
  0% { opacity: 0; transform: translateY(40px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes heart-beat {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.9); }
}
@keyframes swoop {
  0% { left: -100%; } 20% { left: 200%; } 100% { left: 200%; }
}
@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (max-width: 768px) {
  .hero-theater { padding-top: 8vh; }
  .abyss-aurora { filter: blur(80px); }
  .hidden-mobile { display: none; }
  .arsenal-grid { grid-template-columns: 1fr; }
  .arsenal-section { padding-top: 100px; }
  .abyss-footer { flex-direction: column; gap: 20px; }
}
</style>
