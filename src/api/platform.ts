import { http, unwrapAxiosData } from './http'
import type { AlarmRecord, CameraRecord, ConfigVersionRecord, DashboardKpi, DetectTaskRecord, RobotRuntimeCard } from '../types/platform'
import { alarmRecords, cameraRecords, configVersions, dashboardKpi, detectTasks, runtimeCards } from '../mock/platform'
import { logRuntimeKeypointSummary } from '../utils/keypointLogger'

const MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

function mapState(state: any): RobotRuntimeCard['state'] {
  const s = String(state || 'UNKNOWN').toUpperCase()
  if (['RUNNING', 'IDLE', 'STOPPED', 'OFFLINE', 'ERROR'].includes(s)) return s as RobotRuntimeCard['state']
  if (s === 'STOP') return 'STOPPED'
  if (s === 'ONLINE') return 'RUNNING'
  return 'OFFLINE'
}

function mapCamera(item: any): CameraRecord {
  return {
    id: item.id,
    name: item.name || `Camera ${item.id}`,
    line: item.line || item.area || item.workshop || '-',
    robot_id: item.robot_id || String(item.id),
    robot_name: item.robot_name || item.name || `机器人${item.id}`,
    rtsp_url: item.rtsp_url || '',
    enabled: item.enabled !== false,
    status: item.status || (item.enabled === false ? 'offline' : 'online'),
    last_online: item.last_online || item.last_update_at || item.updated_at || '-',
    fps_limit: item.fps_limit,
    roi: item.roi || null,
    detector_type: item.detector_type,
    detector_config: item.detector_config || {},
    motion_threshold: item.motion_threshold,
    stop_seconds: item.stop_seconds,
    config_version: item.config_version
  }
}

function mapRuntime(item: any, cameras: CameraRecord[] = []): RobotRuntimeCard {
  const cameraId = item.camera_id ?? item.id
  const camera = cameras.find((c) => String(c.id) === String(cameraId))
  const tracker = item.tracker || {}
  const rule = item.rule_detail || {}
  const runtime = {
    camera_id: cameraId,
    camera_name: item.camera_name || camera?.name || `Camera ${cameraId}`,
    robot_id: item.robot_id || camera?.robot_id || String(cameraId),
    robot_name: item.robot_name || camera?.robot_name || camera?.name || `机器人${cameraId}`,
    line: item.line || camera?.line || '-',
    state: mapState(item.state || item.status),
    fps: Number(item.fps ?? item.fps_actual ?? tracker.fps ?? 0),
    valid_keypoints: Number(item.valid_keypoints ?? item.keypoint_count ?? item.keypoints?.length ?? 0),
    moving_keypoints: Number(item.moving_keypoints ?? rule.moving_keypoints ?? 0),
    mean_delta_px: Number(item.mean_delta_px ?? item.motion_score ?? tracker.avg_speed ?? 0),
    max_delta_px: Number(item.max_delta_px ?? tracker.total_displacement ?? item.motion_score ?? 0),
    stop_duration_seconds: Number(item.stop_duration_seconds ?? item.stop_seconds_current ?? item.duration_seconds ?? 0),
    last_update: item.last_update || item.last_update_at || item.updated_at || '-',
    stream_type: 'mjpeg' as const
  }
  logRuntimeKeypointSummary({
    camera_id: runtime.camera_id,
    camera_name: runtime.camera_name,
    state: runtime.state,
    valid_keypoints: runtime.valid_keypoints,
    moving_keypoints: runtime.moving_keypoints,
    mean_delta_px: runtime.mean_delta_px,
    max_delta_px: runtime.max_delta_px,
    reason: item.reason || rule.reason || item.rule_reason
  })
  return runtime
}

function mapEvent(item: any): AlarmRecord {
  const type = String(item.event_type || item.type || '').toUpperCase()
  return {
    id: String(item.id),
    time: item.start_time || item.created_at || item.time || '-',
    camera_name: item.camera_name || `Camera ${item.camera_id ?? ''}`,
    robot_name: item.robot_name || item.camera_name || `机器人${item.camera_id ?? ''}`,
    type: type.includes('OFFLINE') ? 'OFFLINE' : type.includes('ERROR') ? 'ERROR' : type.includes('RECOVER') ? 'RECOVERED' : 'STOPPED',
    level: item.level || (type.includes('STOP') ? 'critical' : 'warning'),
    duration_seconds: Number(item.duration_seconds ?? 0),
    status: item.status === 'closed' || item.status === 'resolved' ? 'resolved' : item.status === 'processing' ? 'processing' : 'pending',
    reason: item.remark || item.reason || item.rule_reason || item.message || item.event_type || '事件记录',
    snapshot_url: item.snapshot_path || item.annotated_image_path
  }
}

async function safeGetCamerasForMapping() {
  try { return await getCameraRecords() } catch { return [] }
}

export async function getDashboardOverview(): Promise<{ kpi: DashboardKpi; cards: RobotRuntimeCard[]; alarms: AlarmRecord[] }> {
  if (MOCK) {
    await wait()
    return { kpi: structuredClone(dashboardKpi), cards: structuredClone(runtimeCards), alarms: structuredClone(alarmRecords) }
  }
  const [statusRes, cameras, events] = await Promise.all([
    http.get('/status').then((r) => unwrapAxiosData<any>(r)).catch(() => []),
    safeGetCamerasForMapping(),
    getAlarmRecords().catch(() => [])
  ])
  const rawList = Array.isArray(statusRes) ? statusRes : Array.isArray(statusRes?.items) ? statusRes.items : Array.isArray(statusRes?.statuses) ? statusRes.statuses : Array.isArray(statusRes?.cameras) ? statusRes.cameras : []
  const cards = rawList.length ? rawList.map((item: any) => mapRuntime(item, cameras)) : cameras.map((camera) => mapRuntime({ camera_id: camera.id, state: camera.status === 'online' ? 'RUNNING' : 'OFFLINE', fps: camera.fps_limit }, cameras))
  const kpi: DashboardKpi = {
    online_cameras: cameras.filter((c) => c.status === 'online' && c.enabled).length,
    running_robots: cards.filter((c: RobotRuntimeCard) => c.state === 'RUNNING').length,
    stopped_robots: cards.filter((c: RobotRuntimeCard) => c.state === 'STOPPED').length,
    active_alarms: events.filter((e) => e.status !== 'resolved').length
  }
  return { kpi, cards, alarms: events.slice(0, 8) }
}

export async function getCameraRecords(): Promise<CameraRecord[]> {
  if (MOCK) { await wait(); return structuredClone(cameraRecords) }
  const data = unwrapAxiosData<any[]>(await http.get('/cameras'))
  return (Array.isArray(data) ? data : []).map(mapCamera)
}

export async function saveCameraRecord(payload: CameraRecord): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] save camera', payload); return }
  const body = {
    name: payload.name,
    rtsp_url: payload.rtsp_url,
    enabled: payload.enabled,
    fps_limit: payload.fps_limit ?? 3,
    roi: payload.roi ?? null,
    detector_type: payload.detector_type || 'motion',
    detector_config: payload.detector_config || {},
    motion_threshold: payload.motion_threshold ?? 5,
    stop_seconds: payload.stop_seconds ?? 30
  }
  if (payload.id) await http.put(`/cameras/${payload.id}`, body)
  else await http.post('/cameras', body)
}

export async function testCameraConnection(cameraId: string | number): Promise<{ ok: boolean; message: string }> {
  if (MOCK) { await wait(500); return { ok: String(cameraId) !== 'cam_004', message: String(cameraId) === 'cam_004' ? '连接失败：RTSP 超时' : '连接成功，已获取到视频帧' } }
  const res = await http.post(`/cameras/${cameraId}/test`)
  return res.data?.ok !== undefined ? { ok: res.data.ok, message: res.data.message || '' } : { ok: true, message: '测试完成' }
}

export async function getDetectTasks(): Promise<DetectTaskRecord[]> {
  if (MOCK) { await wait(); return structuredClone(detectTasks) }
  const [cameras, workersRaw] = await Promise.all([
    getCameraRecords(),
    http.get('/system/workers').then((r) => unwrapAxiosData<any>(r)).catch(() => ({}))
  ])
  const workers = workersRaw || {}
  return cameras.map((camera) => {
    const worker = workers[String(camera.id)] || workers[camera.id as any] || {}
    return {
      id: camera.id,
      name: `${camera.name} 检测任务`,
      camera_id: camera.id,
      camera_name: camera.name,
      robot_id: camera.robot_id,
      robot_name: camera.robot_name,
      detector_type: camera.detector_type || 'motion',
      roi_filter_mode: 'filter_keypoints',
      target_keypoints: camera.detector_config?.target_keypoints || [],
      stop_seconds: camera.stop_seconds ?? 30,
      motion_threshold_px: camera.motion_threshold ?? 5,
      enabled: camera.enabled,
      status: worker.running || camera.enabled ? 'running' : worker.last_error ? 'error' : 'paused'
    }
  })
}

export async function saveDetectTask(payload: DetectTaskRecord): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] save task', payload); return }
  await http.put(`/cameras/${payload.camera_id}`, {
    enabled: payload.enabled,
    detector_type: payload.detector_type,
    detector_config: { target_keypoints: payload.target_keypoints, motion_mode: 'mean' },
    motion_threshold: payload.motion_threshold_px,
    stop_seconds: payload.stop_seconds
  })
}

export async function startDetectTask(cameraId: string | number): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.post(`/cameras/${cameraId}/start`)
}

export async function stopDetectTask(cameraId: string | number): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.post(`/cameras/${cameraId}/stop`)
}

export async function getAlarmRecords(): Promise<AlarmRecord[]> {
  if (MOCK) { await wait(); return structuredClone(alarmRecords) }
  const data = unwrapAxiosData<any[]>(await http.get('/events'))
  return (Array.isArray(data) ? data : []).map(mapEvent)
}

export async function resolveAlarm(alarmId: string): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] resolve alarm', alarmId); return }
  await http.put(`/events/${alarmId}/close`, {})
}

export async function getConfigVersions(): Promise<ConfigVersionRecord[]> {
  if (MOCK) { await wait(); return structuredClone(configVersions) }
  return [
    { id: 'export', version: '导出', name: '当前配置导出', description: '当前后端提供 /api/config/export，可下载当前配置备份。', created_at: '-', created_by: 'system', applied: true, detector_type: 'yolo_pose', roi_count: 0, keypoint_count: 0 },
    { id: 'import', version: '导入', name: '配置文件导入', description: '当前后端提供 /api/config/import，可从文件恢复配置。', created_at: '-', created_by: 'system', applied: false, detector_type: 'yolo_pose', roi_count: 0, keypoint_count: 0 }
  ]
}

export async function exportConfig(): Promise<any> {
  if (MOCK) { await wait(); return {} }
  return unwrapAxiosData(await http.get('/config/export'))
}

export async function importConfig(payload: any): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.post('/config/import', payload)
}

export async function applyConfigVersion(_versionId: string | number): Promise<void> { await exportConfig() }
export async function rollbackConfigVersion(_versionId: string | number): Promise<void> { await exportConfig() }
