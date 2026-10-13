import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import 'element-plus/dist/index.css'
import './style.css'

import App from './App.vue'
import router from './router'
import { logError } from './utils/log'

// 全局捕获代码异常
window.onerror = function (message, source, lineno, colno, error) {
  logError(`前端全局异常：${message}`, { source, lineno, colno, stack: error?.stack })
}
// 捕获 Promise 异步报错（axios 请求失败等）
window.addEventListener('unhandledrejection', (event) => {
  logError(`异步Promise异常：${event.reason}`)
})

const app = createApp(App)

// Element Plus 图标全量注册，模板里可直接 <component :is="'User'" />
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
