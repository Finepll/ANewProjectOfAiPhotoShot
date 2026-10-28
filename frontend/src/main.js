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

// 全局捕获代码异常。
// 用 addEventListener 而不是直接给 window.onerror 赋值：
// 赋值会覆盖掉别处（监控 SDK、调试工具）已注册的处理器，且同一个属性只能挂一个。
window.addEventListener('error', (event) => {
  logError(`前端全局异常：${event.message}`, {
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  })
})
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
