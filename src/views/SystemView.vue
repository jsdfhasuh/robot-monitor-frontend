<template>
  <div class="page-grid">
    <div class="card page-toolbar">
      <div><div class="card-title">系统诊断</div><div class="small-muted">查看后端健康、自检、检测器、视频缓存、存储和 Worker 状态。</div></div>
      <el-button type="primary" @click="load">刷新</el-button>
    </div>

    <div class="kpi-row">
      <div class="card kpi"><div class="kpi-icon">✓</div><div><div class="small-muted">后端健康</div><div class="kpi-value text-base">{{ diagnostics.health?.status || (diagnostics.health?.ok ? 'ok' : 'unknown') }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon">▶</div><div><div class="small-muted">Worker</div><div class="kpi-value">{{ diagnostics.workers?.length || 0 }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon">◉</div><div><div class="small-muted">运行中</div><div class="kpi-value green">{{ runningWorkers }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon">▣</div><div><div class="small-muted">检测器</div><div class="kpi-value">{{ diagnostics.detectors?.length || 0 }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon">⛁</div><div><div class="small-muted">存储</div><div class="kpi-value text-base">{{ storageText }}</div></div></div>
    </div>

    <div class="card">
      <div class="card-title">Worker 诊断</div>
      <el-table :data="diagnostics.workers || []" stripe>
        <el-table-column prop="camera_id" label="摄像头" min-width="140" />
        <el-table-column prop="camera_name" label="名称" min-width="180" />
        <el-table-column label="运行" width="90"><template #default="{ row }"><el-tag :type="row.running ? 'success' : 'info'">{{ row.running ? '运行' : '停止' }}</el-tag></template></el-table-column>
        <el-table-column prop="state" label="状态" width="110" />
        <el-table-column prop="fps" label="FPS" width="90" />
        <el-table-column label="RTSP" width="110"><template #default="{ row }"><el-tag :type="row.rtsp_connected === false ? 'danger' : 'success'">{{ row.rtsp_connected === false ? '断开' : '正常' }}</el-tag></template></el-table-column>
        <el-table-column prop="last_error" label="错误" min-width="260" show-overflow-tooltip />
      </el-table>
    </div>

    <div class="diagnostics-grid">
      <div class="card"><div class="card-title">系统自检</div><pre class="json-box">{{ pretty(diagnostics.self_check) }}</pre></div>
      <div class="card"><div class="card-title">视频缓存</div><pre class="json-box">{{ pretty(diagnostics.streams) }}</pre></div>
      <div class="card"><div class="card-title">存储容量</div><pre class="json-box">{{ pretty(diagnostics.storage) }}</pre></div>
      <div class="card"><div class="card-title">检测器</div><pre class="json-box">{{ pretty(diagnostics.detectors) }}</pre></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { getSystemDiagnostics } from '../api/platform'
import type { SystemDiagnostics } from '../types/platform'

const diagnostics = reactive<SystemDiagnostics>({})
const runningWorkers = computed(() => (diagnostics.workers || []).filter((worker) => worker.running).length)
const storageText = computed(() => {
  const storage = diagnostics.storage || {}
  const used = storage.used_gb || storage.used || storage.total_size
  return used ? String(used) : '-'
})
function pretty(value: unknown) {
  if (!value) return '-'
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
async function load() {
  const data = await getSystemDiagnostics()
  Object.assign(diagnostics, data)
}
onMounted(load)
</script>

<style scoped>
.diagnostics-grid { display: grid; grid-template-columns: repeat(2, minmax(320px, 1fr)); gap: 14px; }
.json-box { margin: 0; padding: 12px; background: #0f172a; color: #e2e8f0; border-radius: 8px; min-height: 180px; max-height: 360px; overflow: auto; white-space: pre-wrap; }
@media (max-width: 1280px) { .diagnostics-grid { grid-template-columns: 1fr; } }
</style>
