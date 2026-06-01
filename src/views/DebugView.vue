<template>
  <div v-if="settings && roiPayload" class="page-grid">
    <div class="kpi-row">
      <div class="card kpi"><div class="kpi-icon">〽</div><div><div class="small-muted">当前状态</div><div class="kpi-value" style="color:#16a34a">{{ debug.state }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon">✣</div><div><div class="small-muted">有效关节点</div><div class="kpi-value">{{ debug.valid_keypoints }} / 6</div></div></div>
      <div class="card kpi"><div class="kpi-icon">🏃</div><div><div class="small-muted">运动关节点</div><div class="kpi-value">{{ debug.moving_keypoints }} / 6</div></div></div>
      <div class="card kpi"><div class="kpi-icon">≈</div><div><div class="small-muted">平均位移</div><div class="kpi-value">{{ debug.mean_delta_px }} px</div></div></div>
      <div class="card kpi"><div class="kpi-icon">▥</div><div><div class="small-muted">最大位移</div><div class="kpi-value">{{ debug.max_delta_px }} px</div></div></div>
    </div>

    <div class="debug-layout">
      <div>
        <RoiEditor v-model:rois="roiPayload.rois" :active-roi-id="roiPayload.rois[0]?.id || ''" camera-label="相机01" camera-id="cam_001" debug />
        <div class="card" style="margin-top:14px">
          <el-tabs model-value="runtime">
            <el-tab-pane label="关节点规则" name="rules"><KeypointRuleTable v-model="settings.keypoint_rules" /></el-tab-pane>
            <el-tab-pane label="运行调试" name="runtime"><div ref="chartRef" style="height:260px"></div></el-tab-pane>
            <el-tab-pane label="历史趋势" name="history"><el-empty description="后端接入历史数据后显示" /></el-tab-pane>
            <el-tab-pane label="版本对比" name="versions">
              <el-table :data="versions" border><el-table-column prop="version" label="版本" /><el-table-column prop="name" label="版本名称" /><el-table-column prop="time" label="更新时间" /><el-table-column prop="user" label="更新人" /><el-table-column label="操作"><template #default><el-button text type="primary">对比</el-button><el-button text type="primary">应用</el-button></template></el-table-column></el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <div class="page-grid">
        <div class="card">
          <div class="card-title">ROI 过滤模式</div>
          <el-radio-group v-model="settings.detect.roi_filter_mode" class="vertical-radio">
            <el-radio value="disabled">禁用</el-radio>
            <el-radio value="filter_keypoints">只统计 ROI 内关键点</el-radio>
            <el-radio value="filter_bbox">只统计 ROI 内目标框</el-radio>
          </el-radio-group>
        </div>
        <div class="card">
          <div class="card-title">参数试算结果</div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="阈值(px)">{{ settings.detect.motion_threshold_px }}</el-descriptions-item>
            <el-descriptions-item label="触发次数">{{ debug.moving_keypoints }}</el-descriptions-item>
            <el-descriptions-item label="触发关节点"><span style="color:#f59e0b">{{ debug.triggered_keypoints.join(', ') }}</span></el-descriptions-item>
            <el-descriptions-item label="占比">{{ debug.trigger_ratio }}%</el-descriptions-item>
            <el-descriptions-item label="是否告警"><el-tag :type="debug.alarm ? 'danger' : 'success'">{{ debug.alarm ? '是' : '否' }}</el-tag></el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="card"><div class="card-title">判断原因</div><p>{{ debug.reason }}</p></div>
        <div class="card">
          <div class="card-title">配置版本</div>
          <p>当前版本：<b>v2 调高末端阈值</b> <el-tag type="success">已应用</el-tag></p>
          <p class="small-muted">更新时间：2026-06-01 14:32:21</p>
          <div style="display:grid; gap:12px; margin-top:16px">
            <el-button type="primary" @click="testRun">应用参数试算</el-button>
            <el-button type="primary" plain @click="writeCurrentKeypointLog">记录当前关节点日志</el-button>
            <el-button type="primary" plain>保存新版本</el-button>
            <el-button>回滚版本</el-button>
            <el-button type="primary">发布配置</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import RoiEditor from '../components/RoiEditor.vue'
import KeypointRuleTable from '../components/KeypointRuleTable.vue'
import type { AppSettings, CameraRoiPayload, RuntimeDebugResult } from '../types/settings'
import { defaultDebugResult } from '../mock/defaults'
import { getCameraRoi, getSettings, runDebugTest } from '../api/settings'
import { logKeypointDebugResult } from '../utils/keypointLogger'

const settings = ref<AppSettings>()
const roiPayload = ref<CameraRoiPayload>()
const debug = ref<RuntimeDebugResult>({ ...defaultDebugResult })
const chartRef = ref<HTMLDivElement>()
const versions = [
  { version: 'v3', name: '增加排除区域', time: '2026-06-01 09:15:42', user: 'admin' },
  { version: 'v2', name: '调高末端阈值', time: '2026-05-31 14:32:21', user: 'admin' },
  { version: 'v1', name: '默认配置', time: '2026-05-30 10:08:11', user: 'admin' }
]
async function testRun() {
  if (!settings.value || !roiPayload.value) return
  debug.value = await runDebugTest({ settings: settings.value, roi: roiPayload.value })
}

function writeCurrentKeypointLog() {
  if (!settings.value || !roiPayload.value) return
  logKeypointDebugResult({
    camera_id: roiPayload.value.camera_id,
    state: debug.value.state,
    valid_keypoints: debug.value.valid_keypoints,
    moving_keypoints: debug.value.moving_keypoints,
    mean_delta_px: debug.value.mean_delta_px,
    max_delta_px: debug.value.max_delta_px,
    triggered_keypoints: debug.value.triggered_keypoints,
    trigger_ratio: debug.value.trigger_ratio,
    alarm: debug.value.alarm,
    reason: debug.value.reason,
    keypoints: debug.value.keypoints || [],
    roi_filter_mode: settings.value.detect.roi_filter_mode,
    target_keypoints: settings.value.detect.target_keypoints,
    motion_threshold_px: settings.value.detect.motion_threshold_px,
    stop_seconds: settings.value.detect.stop_duration_seconds
  })
}
function initChart() {
  if (!chartRef.value) return
  const chart = echarts.init(chartRef.value)
  const times = Array.from({ length: 20 }, (_, i) => `14:${String(31 + Math.floor(i / 3)).padStart(2,'0')}:${String((i * 10) % 60).padStart(2,'0')}`)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['kp1','kp2','kp3','kp4','kp5','kp6'] },
    grid: { left: 40, right: 20, bottom: 30, top: 44 },
    xAxis: { type: 'category', data: times },
    yAxis: { type: 'value' },
    series: ['kp1','kp2','kp3','kp4','kp5','kp6'].map((name, idx) => ({
      name, type: 'line', smooth: true, data: times.map((_, i) => idx === 3 ? Math.max(1, Math.round(Math.sin(i / 2) * 4 + i / 2 + 2)) : Math.max(1, Math.round(Math.sin(i / 3 + idx) * 2 + 3)) ),
      markLine: idx === 3 ? { data: [{ yAxis: 8, name: '阈值 8px' }] } : undefined
    }))
  })
}
onMounted(async () => { settings.value = await getSettings(); roiPayload.value = await getCameraRoi('cam_001'); setTimeout(initChart) })
</script>
<style scoped>.vertical-radio { display:grid; gap:8px; }</style>
