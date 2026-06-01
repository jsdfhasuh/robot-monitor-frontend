<template>
  <div class="page-grid">
    <div class="kpi-row">
      <div class="card kpi"><div class="kpi-icon">📷</div><div><div class="small-muted">在线摄像头</div><div class="kpi-value">{{ kpi.online_cameras }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon">🤖</div><div><div class="small-muted">运行中机器人</div><div class="kpi-value green">{{ kpi.running_robots }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon danger-bg">⛔</div><div><div class="small-muted">停机机器人</div><div class="kpi-value red">{{ kpi.stopped_robots }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon warn-bg">🔔</div><div><div class="small-muted">当前告警</div><div class="kpi-value orange">{{ kpi.active_alarms }}</div></div></div>
      <div class="card kpi"><div class="kpi-icon">⚙️</div><div><div class="small-muted">检测模式</div><div class="kpi-value text-base">YOLO Pose</div></div></div>
    </div>

    <div class="dashboard-layout">
      <div class="monitor-grid">
        <div v-for="card in cards" :key="card.camera_id" class="video-card card">
          <div class="video-head">
            <div>
              <div class="video-title">{{ card.camera_name }}</div>
              <div class="small-muted">{{ card.line }} / {{ card.robot_name }}</div>
            </div>
            <el-tag :type="stateType(card.state)" effect="dark">{{ card.state }}</el-tag>
          </div>
          <div class="backend-video" :class="card.state.toLowerCase()">
            <img v-if="card.state !== 'OFFLINE'" class="backend-video-img" :src="videoSrc(card)" :alt="card.camera_name" @load="onVideoLoad(card.camera_id)" @error="onVideoError(card.camera_id)" />
            <div v-if="videoErrors[card.camera_id] && card.state !== 'OFFLINE'" class="stream-mask">
              <div>视频流加载失败</div>
              <small>请确认后端已提供 /api/cameras/{{ card.camera_id }}/stream.mjpg</small>
            </div>
            <div class="roi roi-a"></div><div class="roi roi-b"></div>
            <div class="video-toolbar">后端视频流 ｜ {{ card.stream_type || 'mjpeg' }} ｜ {{ card.fps }} FPS</div>
            <div v-if="card.state === 'OFFLINE'" class="offline-mask">摄像头离线</div>
          </div>
          <div class="metric-grid">
            <div><span>FPS</span><b>{{ card.fps }}</b></div>
            <div><span>有效点</span><b>{{ card.valid_keypoints }}</b></div>
            <div><span>运动点</span><b>{{ card.moving_keypoints }}</b></div>
            <div><span>最大位移</span><b>{{ card.max_delta_px }}px</b></div>
          </div>
          <div class="video-foot">
            <span>连续停机：{{ card.stop_duration_seconds }}s</span>
            <span>{{ card.last_update }}</span>
          </div>
        </div>
      </div>

      <div class="card alarm-panel">
        <div class="panel-title-row"><div class="card-title">最近告警</div><el-button size="small" @click="load">刷新</el-button></div>
        <el-timeline>
          <el-timeline-item v-for="alarm in alarms" :key="alarm.id" :timestamp="alarm.time" :type="alarmLevelType(alarm.level)">
            <div class="alarm-item">
              <div><b>{{ alarm.robot_name }}</b> / {{ alarm.type }}</div>
              <div class="small-muted">{{ alarm.reason }}</div>
              <el-tag size="small" :type="alarmStatusType(alarm.status)">{{ statusText(alarm.status) }}</el-tag>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getDashboardOverview } from '../api/platform'
import { getMjpegStreamUrl, getSnapshotUrl } from '../api/stream'
import { logger } from '../utils/logger'
import type { AlarmRecord, DashboardKpi, RobotRuntimeCard } from '../types/platform'
import type { RobotState } from '../types/settings'

const kpi = reactive<DashboardKpi>({ online_cameras: 0, running_robots: 0, stopped_robots: 0, active_alarms: 0 })
const cards = ref<RobotRuntimeCard[]>([])
const alarms = ref<AlarmRecord[]>([])
const videoErrors = reactive<Record<string, boolean>>({})

function videoSrc(card: RobotRuntimeCard) {
  return card.stream_url || (card.stream_type === 'mjpeg' ? getMjpegStreamUrl(card.camera_id) : getSnapshotUrl(card.camera_id))
}
function onVideoLoad(cameraId: string | number) {
  const key = String(cameraId)
  if (videoErrors[key]) logger.info('stream', `摄像头 ${cameraId} 视频流恢复`)
  videoErrors[key] = false
}
function onVideoError(cameraId: string | number) {
  videoErrors[String(cameraId)] = true
  logger.error('stream', `摄像头 ${cameraId} 视频流加载失败`, { url: getMjpegStreamUrl(cameraId) })
}

function stateType(state: RobotState) {
  if (state === 'RUNNING') return 'success'
  if (state === 'STOPPED') return 'danger'
  if (state === 'IDLE') return 'warning'
  return 'info'
}
function alarmLevelType(level: AlarmRecord['level']) { return level === 'critical' ? 'danger' : level === 'warning' ? 'warning' : 'primary' }
function alarmStatusType(status: AlarmRecord['status']) { return status === 'resolved' ? 'success' : status === 'processing' ? 'warning' : 'danger' }
function statusText(status: AlarmRecord['status']) { return status === 'resolved' ? '已处理' : status === 'processing' ? '处理中' : '待处理' }

async function load() {
  try {
    logger.info('system', '加载实时监控数据')
    const data = await getDashboardOverview()
    Object.assign(kpi, data.kpi)
    cards.value = data.cards
    alarms.value = data.alarms
    logger.info('system', '实时监控数据加载完成', { camera_count: data.cards.length, alarm_count: data.alarms.length })
  } catch (error) {
    logger.error('system', '实时监控数据加载失败', error)
  }
}
onMounted(load)
</script>
