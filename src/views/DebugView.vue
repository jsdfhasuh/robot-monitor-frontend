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
        <div class="card" style="margin-bottom:14px">
          <el-form label-width="90px">
            <el-form-item label="摄像头">
              <el-select v-model="cameraId" style="width:100%" @change="loadCameraDebug">
                <el-option v-for="camera in cameras" :key="camera.id" :label="camera.name" :value="camera.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="绘制底图">
              <div class="roi-tool-row">
                <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="handleLocalImageChange">
                  <el-button>导入本地图片</el-button>
                </el-upload>
                <el-button v-if="localImageUrl" plain @click="clearLocalImage">使用后端截图</el-button>
                <span v-if="localImageName" class="small-muted">{{ localImageName }} · {{ localImageSizeText }}</span>
              </div>
            </el-form-item>
            <el-form-item label="当前 ROI">
              <div class="roi-tool-row">
                <el-select v-model="activeRoiId" style="width:220px">
                  <el-option v-for="roi in roiPayload.rois" :key="roi.id" :label="roi.name" :value="roi.id" />
                </el-select>
                <el-button type="primary" plain @click="addRoi">新增 ROI</el-button>
                <el-button type="danger" plain @click="deleteRoi">删除 ROI</el-button>
                <el-button @click="undoPoint">撤销点</el-button>
                <el-button @click="clearActive">清空当前</el-button>
                <el-button type="primary" @click="saveRoi">保存 ROI</el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
        <RoiEditor
          v-model:rois="roiPayload.rois"
          :active-roi-id="activeRoiId"
          :camera-label="selectedCameraLabel"
          :camera-id="String(cameraId)"
          :snapshot-url="localImageUrl || undefined"
          debug
          @image-size="onRoiImageSize"
        />
        <div class="card" style="margin-top:14px">
          <el-tabs model-value="runtime">
            <el-tab-pane label="关节点规则" name="rules"><KeypointRuleTable v-model="settings.keypoint_rules" /></el-tab-pane>
            <el-tab-pane label="运行调试" name="runtime"><div ref="chartRef" style="height:260px"></div></el-tab-pane>
            <el-tab-pane label="历史趋势" name="history"><el-empty description="后端接入历史数据后显示" /></el-tab-pane>
            <el-tab-pane label="版本对比" name="versions">
              <el-table :data="versions" border><el-table-column prop="version" label="版本" /><el-table-column prop="name" label="版本名称" /><el-table-column prop="created_at" label="更新时间" /><el-table-column prop="created_by" label="更新人" /><el-table-column label="操作"><template #default><el-button text type="primary">对比</el-button><el-button text type="primary">应用</el-button></template></el-table-column></el-table>
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
          <p>当前版本：<b>{{ activeVersion?.version || '-' }} {{ activeVersion?.name || '' }}</b> <el-tag v-if="activeVersion" type="success">已应用</el-tag></p>
          <p class="small-muted">更新时间：{{ activeVersion?.created_at || '-' }}</p>
          <div style="display:grid; gap:12px; margin-top:16px">
            <el-button type="primary" @click="testRun">应用参数试算</el-button>
            <el-button type="primary" plain @click="writeCurrentKeypointLog">记录当前关节点日志</el-button>
            <el-button type="primary" plain @click="saveCurrentSettings">保存参数</el-button>
            <el-button @click="loadVersions">刷新版本</el-button>
            <el-button type="primary" @click="publishCurrentSettings">发布配置</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, type UploadFile } from 'element-plus'
import RoiEditor from '../components/RoiEditor.vue'
import KeypointRuleTable from '../components/KeypointRuleTable.vue'
import type { AppSettings, CameraOption, CameraRoiPayload, RoiConfig, RuntimeDebugResult } from '../types/settings'
import type { ConfigVersionRecord } from '../types/platform'
import { defaultDebugResult } from '../mock/defaults'
import { applySettings, getCameraRoi, getCameras, getSettings, runDebugTest, saveCameraRoi, saveSettings } from '../api/settings'
import { getConfigVersions } from '../api/platform'
import { logKeypointDebugResult } from '../utils/keypointLogger'

const settings = ref<AppSettings>()
const roiPayload = ref<CameraRoiPayload>()
const debug = ref<RuntimeDebugResult>({ ...defaultDebugResult })
const chartRef = ref<HTMLDivElement>()
const cameras = ref<CameraOption[]>([])
const cameraId = ref<string | number>('cam_001')
const versions = ref<ConfigVersionRecord[]>([])
const activeRoiId = ref('')
const localImageUrl = ref('')
const localImageName = ref('')
const localImageWidth = ref(0)
const localImageHeight = ref(0)
const selectedCameraLabel = computed(() => cameras.value.find((camera) => String(camera.id) === String(cameraId.value))?.name || String(cameraId.value))
const activeVersion = computed(() => versions.value.find((version) => version.applied))
const activeRoi = computed(() => roiPayload.value?.rois.find((roi) => roi.id === activeRoiId.value))
const localImageSizeText = computed(() => localImageWidth.value && localImageHeight.value ? `${localImageWidth.value} × ${localImageHeight.value}` : '-')

async function loadCameraDebug() {
  clearLocalImage()
  roiPayload.value = await getCameraRoi(cameraId.value)
  activeRoiId.value = roiPayload.value.rois[0]?.id || ''
  await testRun()
}
function revokeLocalImage() {
  if (localImageUrl.value) URL.revokeObjectURL(localImageUrl.value)
}
function clearLocalImage() {
  revokeLocalImage()
  localImageUrl.value = ''
  localImageName.value = ''
  localImageWidth.value = 0
  localImageHeight.value = 0
}
function handleLocalImageChange(file: UploadFile) {
  const raw = file.raw
  if (!raw) return
  if (!raw.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  revokeLocalImage()
  localImageUrl.value = URL.createObjectURL(raw)
  localImageName.value = raw.name
}
function onRoiImageSize(size: { width: number; height: number }) {
  if (!roiPayload.value) return
  roiPayload.value.image_width = size.width
  roiPayload.value.image_height = size.height
  if (localImageUrl.value) {
    localImageWidth.value = size.width
    localImageHeight.value = size.height
  }
}
function addRoi() {
  if (!roiPayload.value) return
  const id = `roi_${Date.now()}`
  const colors = ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea']
  const roi: RoiConfig = { id, name: `roi_${roiPayload.value.rois.length + 1}`, enabled: true, type: 'polygon', color: colors[roiPayload.value.rois.length % colors.length], points: [], keypoint_indexes: [] }
  roiPayload.value.rois.push(roi)
  activeRoiId.value = id
}
function deleteRoi() {
  if (!roiPayload.value) return
  roiPayload.value.rois = roiPayload.value.rois.filter((roi) => roi.id !== activeRoiId.value)
  activeRoiId.value = roiPayload.value.rois[0]?.id || ''
}
function undoPoint() { activeRoi.value?.points.pop() }
function clearActive() { if (activeRoi.value) activeRoi.value.points = [] }
async function saveRoi() {
  if (!roiPayload.value) return
  await saveCameraRoi(cameraId.value, roiPayload.value)
  ElMessage.success('ROI 已保存')
}
async function testRun() {
  if (!settings.value || !roiPayload.value) return
  debug.value = await runDebugTest({ settings: settings.value, roi: roiPayload.value })
}
async function loadVersions() { versions.value = await getConfigVersions() }
async function saveCurrentSettings() { if (!settings.value) return; await saveSettings(settings.value); ElMessage.success('参数已保存') }
async function publishCurrentSettings() { if (!settings.value) return; await applySettings(settings.value); ElMessage.success('配置已发布') }

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
onMounted(async () => {
  cameras.value = await getCameras()
  cameraId.value = cameras.value[0]?.id || cameraId.value
  settings.value = await getSettings()
  roiPayload.value = await getCameraRoi(cameraId.value)
  activeRoiId.value = roiPayload.value.rois[0]?.id || ''
  await loadVersions()
  setTimeout(initChart)
})
onUnmounted(clearLocalImage)
</script>
<style scoped>
.vertical-radio { display:grid; gap:8px; }
.roi-tool-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
</style>
