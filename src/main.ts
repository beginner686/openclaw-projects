import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import { pinia } from './stores'
import { router } from './router'
import './style.css'

async function bootstrap() {
  const useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true'
  if (useMock) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)
  app.mount('#app')
}

void bootstrap()
