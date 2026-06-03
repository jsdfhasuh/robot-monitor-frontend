<template>
  <el-container class="app-shell">
    <el-aside width="240px" class="app-aside">
      <div class="brand">🤖 机器人运行监控平台</div>
      <el-menu :default-active="activeMenu" router class="side-menu">
        <el-menu-item index="/dashboard">实时监控</el-menu-item>
        <el-menu-item index="/debug/keypoints">标定与调试</el-menu-item>
        <el-menu-item index="/rules">规则面板</el-menu-item>
        <el-menu-item index="/cameras">摄像头管理</el-menu-item>
        <el-menu-item index="/tasks">检测任务</el-menu-item>
        <el-menu-item index="/alarms">告警中心</el-menu-item>
        <el-menu-item index="/models">模型管理</el-menu-item>
        <el-menu-item index="/config-versions">配置版本</el-menu-item>
        <el-menu-item index="/system">系统诊断</el-menu-item>
      </el-menu>
      <div class="aside-footer">前后端分离容器版</div>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <div>{{ pageTitle }}</div>
        <div class="header-right">
          <el-tooltip :content="backendTooltip" placement="bottom">
            <el-tag class="backend-status" :type="backendTagType" effect="light" @click="refreshBackendStatus">
              <span class="status-dot" :class="backendStatusClass"></span>
              {{ backendStatusText }}
            </el-tag>
          </el-tooltip>
          <el-badge :value="12"><span>🔔</span></el-badge>
          <el-tooltip content="前端运行日志" placement="bottom">
            <el-button circle class="settings-entry" @click="logDrawerVisible = true">📋</el-button>
          </el-tooltip>
          <el-tooltip content="系统设置" placement="bottom">
            <el-button circle class="settings-entry" @click="openSettings">⚙️</el-button>
          </el-tooltip>
          <el-avatar size="small">A</el-avatar>
          <span>admin</span>
        </div>
      </el-header>
      <el-main class="app-main"><router-view /></el-main>
    </el-container>
    <LogDrawer v-model="logDrawerVisible" />
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogDrawer from './components/LogDrawer.vue'
import { checkBackendConnection } from './api/platform'
import { logger } from './utils/logger'
import type { SystemHealth } from './types/platform'
const route = useRoute()
const router = useRouter()
const logDrawerVisible = ref(false)
const backendHealth = ref<SystemHealth>({ status: 'checking', message: '正在检测后端连接' })
const backendChecking = ref(false)
const backendCheckedAt = ref('')
let backendTimer: number | undefined
const titleMap: Record<string, string> = {
  '/dashboard': '实时监控 / 机器人运行状态',
  '/debug/keypoints': '标定与调试 / 关节点调试与 ROI 标定',
  '/rules': '规则面板 / 停机判断与模板',
  '/cameras': '摄像头管理 / RTSP 与机器人绑定',
  '/tasks': '检测任务 / YOLO Pose 规则',
  '/alarms': '告警中心 / 停机与离线记录',
  '/models': '模型管理 / 上传与绑定',
  '/config-versions': '配置版本 / 发布与回滚',
  '/system': '系统诊断 / 后端与 Worker',
  '/settings': '系统设置 / ROI 配置'
}
const pageTitle = computed(() => titleMap[route.path] || '机器人运行监控平台')
const activeMenu = computed(() => route.path === '/settings' ? '' : route.path)
const backendStatus = computed(() => backendChecking.value ? 'checking' : String(backendHealth.value.status || '').toLowerCase())
const backendStatusText = computed(() => {
  if (backendStatus.value === 'checking') return '后端检测中'
  if (backendStatus.value === 'mock') return 'Mock 模式'
  return backendHealth.value.ok ? '后端正常' : '后端异常'
})
const backendTagType = computed(() => {
  if (backendStatus.value === 'mock') return 'warning'
  if (backendStatus.value === 'checking') return 'info'
  return backendHealth.value.ok ? 'success' : 'danger'
})
const backendStatusClass = computed(() => ({
  ok: backendHealth.value.ok && backendStatus.value !== 'mock' && backendStatus.value !== 'checking',
  mock: backendStatus.value === 'mock',
  error: !backendHealth.value.ok && backendStatus.value !== 'checking',
  checking: backendStatus.value === 'checking'
}))
const backendTooltip = computed(() => {
  const message = backendHealth.value.message || backendHealth.value.status || '无状态信息'
  return backendCheckedAt.value ? `${message}；最近检测：${backendCheckedAt.value}` : message
})
function openSettings() {
  router.push('/settings')
}
async function refreshBackendStatus() {
  if (backendChecking.value) return
  backendChecking.value = true
  const health = await checkBackendConnection()
  backendHealth.value = health
  backendCheckedAt.value = new Date().toLocaleTimeString()
  backendChecking.value = false
  if (health.ok) logger.info('system', `后端连接状态：${health.status || 'ok'}`, health)
  else logger.error('system', '后端连接异常', health)
}

watch(() => route.path, (path) => {
  logger.info('router', `进入页面：${path}`)
}, { immediate: true })

onMounted(() => {
  refreshBackendStatus()
  backendTimer = window.setInterval(refreshBackendStatus, 30000)
})
onUnmounted(() => {
  if (backendTimer) window.clearInterval(backendTimer)
})
</script>
