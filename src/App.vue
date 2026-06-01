<template>
  <el-container class="app-shell">
    <el-aside width="240px" class="app-aside">
      <div class="brand">🤖 机器人运行监控平台</div>
      <el-menu :default-active="activeMenu" router class="side-menu">
        <el-menu-item index="/dashboard">实时监控</el-menu-item>
        <el-menu-item index="/debug/keypoints">标定与调试</el-menu-item>
        <el-menu-item index="/cameras">摄像头管理</el-menu-item>
        <el-menu-item index="/tasks">检测任务</el-menu-item>
        <el-menu-item index="/alarms">告警中心</el-menu-item>
        <el-menu-item index="/config-versions">配置版本</el-menu-item>
      </el-menu>
      <div class="aside-footer">前后端分离容器版</div>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <div>{{ pageTitle }}</div>
        <div class="header-right">
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LogDrawer from './components/LogDrawer.vue'
import { logger } from './utils/logger'
const route = useRoute()
const router = useRouter()
const logDrawerVisible = ref(false)
const titleMap: Record<string, string> = {
  '/dashboard': '实时监控 / 机器人运行状态',
  '/debug/keypoints': '标定与调试 / 关节点调试与 ROI 标定',
  '/cameras': '摄像头管理 / RTSP 与机器人绑定',
  '/tasks': '检测任务 / YOLO Pose 规则',
  '/alarms': '告警中心 / 停机与离线记录',
  '/config-versions': '配置版本 / 发布与回滚',
  '/settings': '系统设置 / ROI 配置'
}
const pageTitle = computed(() => titleMap[route.path] || '机器人运行监控平台')
const activeMenu = computed(() => route.path === '/settings' ? '' : route.path)
function openSettings() {
  router.push('/settings')
}

watch(() => route.path, (path) => {
  logger.info('router', `进入页面：${path}`)
}, { immediate: true })
</script>
