import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/global.css'
import App from './App.vue'
import { router } from './router'
import { installGlobalErrorLogger, logger } from './utils/logger'

installGlobalErrorLogger()
logger.info('app', '前端应用启动')

createApp(App).use(createPinia()).use(router).use(ElementPlus).mount('#app')
