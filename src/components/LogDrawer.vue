<template>
  <el-drawer v-model="visible" title="前端运行日志" size="720px" append-to-body>
    <template #default>
      <div class="log-toolbar">
        <el-segmented v-model="levelFilter" :options="levelOptions" size="small" />
        <el-input v-model="keyword" clearable placeholder="搜索模块 / 内容" style="width:220px" />
        <el-button size="small" @click="handleCopy">复制</el-button>
        <el-button size="small" @click="downloadFrontendLogs">导出</el-button>
        <el-button size="small" type="danger" plain @click="logger.clear()">清空</el-button>
      </div>

      <el-alert
        title="这里记录浏览器侧日志：页面异常、API 请求、视频流加载、WebSocket 状态、关节点检测摘要、ROI 转换与参数试算。Nginx 和后端日志仍在各自容器里查看。"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom:12px"
      />

      <el-empty v-if="filteredLogs.length === 0" description="暂无日志" />
      <div v-else class="log-list">
        <div v-for="item in filteredLogs" :key="item.id" class="log-item" :class="item.level.toLowerCase()">
          <div class="log-line">
            <span class="log-time">{{ item.time }}</span>
            <el-tag size="small" :type="levelType(item.level)">{{ item.level }}</el-tag>
            <span class="log-module">{{ item.module }}</span>
            <span class="log-message">{{ item.message }}</span>
          </div>
          <pre v-if="item.detail" class="log-detail">{{ formatDetail(item.detail) }}</pre>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { copyFrontendLogs, downloadFrontendLogs, logger, type LogLevel } from '../utils/logger'

const visible = defineModel<boolean>({ default: false })
const keyword = ref('')
const levelFilter = ref('ALL')
const levelOptions = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR']

const filteredLogs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return logger.list.filter((item) => {
    const levelOk = levelFilter.value === 'ALL' || item.level === levelFilter.value
    const text = `${item.module} ${item.message} ${formatDetail(item.detail)}`.toLowerCase()
    return levelOk && (!kw || text.includes(kw))
  })
})

function levelType(level: LogLevel) {
  if (level === 'ERROR') return 'danger'
  if (level === 'WARN') return 'warning'
  if (level === 'INFO') return 'primary'
  return 'info'
}

function formatDetail(detail: unknown) {
  if (!detail) return ''
  try { return typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2) } catch { return String(detail) }
}

async function handleCopy() {
  await copyFrontendLogs()
  ElMessage.success('前端日志已复制')
}
</script>
