import { http, unwrapAxiosData } from './http'
import type {
  AlarmRecord,
  CameraRecord,
  ConfigVersionRecord,
  DashboardKpi,
  DetectTaskRecord,
  ModelRecord,
  RobotRuntimeCard,
  SystemDiagnostics,
  SystemHealth,
  WorkerStatusRecord
} from '../types/platform'
import { alarmRecords, cameraRecords, configVersions, dashboardKpi, detectTasks, runtimeCards } from '../mock/platform'
import { logRuntimeKeypointSummary } from '../utils/keypointLogger'

const MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
export const isMockMode = MOCK
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

function normalizeList(raw: any): any[] {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.statuses)) return raw.statuses
  if (Array.isArray(raw?.cameras)) return raw.cameras
  return []
}

function resolveCameraId(item: any) {
  return item.id ?? item.camera_id ?? item.cameraId
}

function resolveNumericCameraId(item: any): number | undefined {
  const value = item.numeric_id ?? item.numeric_camera_id ?? item.camera_numeric_id
  return value === undefined || value === null ? undefined : Number(value)
}

function apiCameraId(camera: CameraRecord | DetectTaskRecord | string | number) {
  if (typeof camera === 'string' || typeof camera === 'number') return camera
  const item = camera as CameraRecord & DetectTaskRecord
  return item.numeric_id ?? item.camera_id ?? item.id
}

function mapState(state: any): RobotRuntimeCard['state'] {
  const s = String(state || 'UNKNOWN').toUpperCase()
  if (['RUNNING', 'IDLE', 'STOPPED', 'OFFLINE', 'UNKNOWN'].includes(s)) return s as RobotRuntimeCard['state']
  if (s === 'STOP') return 'STOPPED'
  if (s === 'ONLINE') return 'RUNNING'
  if (s === 'ERROR') return 'UNKNOWN'
  return 'UNKNOWN'
}

function mapCamera(item: any): CameraRecord {
  const id = resolveCameraId(item)
  return {
    id,
    numeric_id: resolveNumericCameraId(item),
    name: item.name || `Camera ${id}`,
    area: item.area || item.workshop,
    line: item.line || item.area || item.workshop || '-',
    location: item.location,
    robot_id: item.robot_id || String(id),
    robot_name: item.robot_name || item.name || `机器人${id}`,
    rtsp_url: item.rtsp_url || '',
    rtsp_url_masked: item.rtsp_url_masked,
    enabled: item.enabled !== false,
    status: item.status || (item.enabled === false ? 'offline' : 'online'),
    runtime_state: item.runtime_state ? mapState(item.runtime_state) : undefined,
    last_online: item.last_online || item.last_online_at || item.last_update_at || item.updated_at || '-',
    fps_limit: item.fps_limit,
    roi: item.roi || item.pixel_roi || null,
    stream_urls: item.stream_urls,
    detector_type: item.detector_type,
    detector_config: item.detector_config || {},
    motion_threshold: item.motion_threshold,
    stop_seconds: item.stop_seconds,
    config_version: item.config_version
  }
}

function mapRuntime(item: any, cameras: CameraRecord[] = []): RobotRuntimeCard {
  const cameraId = item.camera_id ?? item.id
  const numericCameraId = item.numeric_camera_id ?? item.numeric_id
  const camera = cameras.find((c) => String(c.id) === String(cameraId) || String(c.numeric_id) === String(cameraId) || String(c.numeric_id) === String(numericCameraId))
  const tracker = item.tracker || {}
  const rule = item.rule || item.rule_detail || {}
  const runtime: RobotRuntimeCard = {
    camera_id: cameraId ?? camera?.id ?? numericCameraId,
    numeric_camera_id: numericCameraId === undefined ? camera?.numeric_id : Number(numericCameraId),
    camera_name: item.camera_name || camera?.name || `Camera ${cameraId ?? numericCameraId}`,
    robot_id: item.robot_id || camera?.robot_id || String(cameraId ?? numericCameraId),
    robot_name: item.robot_name || camera?.robot_name || camera?.name || `机器人${cameraId ?? numericCameraId}`,
    line: item.line || camera?.line || '-',
    state: mapState(item.state || item.status),
    fps: Number(item.fps ?? item.fps_actual ?? tracker.fps ?? 0),
    valid_keypoints: Number(item.valid_keypoints ?? item.keypoint_count ?? item.keypoints?.length ?? 0),
    moving_keypoints: Number(item.moving_keypoints ?? rule.moving_keypoints ?? 0),
    mean_delta_px: Number(item.mean_delta_px ?? item.mean_delta ?? item.motion_score ?? tracker.avg_speed ?? 0),
    max_delta_px: Number(item.max_delta_px ?? item.max_delta ?? tracker.total_displacement ?? item.motion_score ?? 0),
    stop_duration_seconds: Number(item.stop_duration_seconds ?? item.stop_seconds_current ?? item.duration_seconds ?? 0),
    last_update: item.last_update || item.last_update_at || item.updated_at || '-',
    stream_url: camera?.stream_urls?.mjpeg_annotated || camera?.stream_urls?.mjpeg,
    snapshot_url: camera?.stream_urls?.snapshot,
    stream_type: 'mjpeg'
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
  const rawType = String(item.event_type || item.type || '').toUpperCase()
  const rawStatus = String(item.status || '').toUpperCase()
  const handled = Boolean(item.handled)
  const status: AlarmRecord['status'] =
    rawStatus === 'RECOVERED' || rawStatus === 'CLOSED' || rawStatus === 'RESOLVED' || handled
      ? 'resolved'
      : rawStatus === 'PROCESSING'
        ? 'processing'
        : 'pending'
  return {
    id: String(item.id),
    camera_id: item.camera_id,
    time: item.start_time || item.created_at || item.time || '-',
    camera_name: item.camera_name || `Camera ${item.camera_id ?? ''}`,
    robot_name: item.robot_name || item.camera_name || `机器人${item.camera_id ?? ''}`,
    type: rawStatus === 'RECOVERED' || rawType.includes('RECOVER') ? 'RECOVERED' : rawType.includes('OFFLINE') ? 'OFFLINE' : rawType.includes('UNKNOWN') ? 'UNKNOWN' : 'STOPPED',
    level: item.level || (rawType.includes('STOP') ? 'critical' : 'warning'),
    duration_seconds: Number(item.duration_seconds ?? 0),
    status,
    reason: item.reason || item.rule_reason || item.message || item.event_type || item.remark || '事件记录',
    snapshot_url: item.snapshot_url || item.snapshot_path || item.annotated_image_path,
    annotated_snapshot_url: item.annotated_snapshot_url,
    recovery_snapshot_url: item.recovery_snapshot_url,
    recovery_annotated_url: item.recovery_annotated_url,
    clip_url: item.clip_url,
    handled,
    false_alarm: Boolean(item.false_alarm),
    remark: item.remark || ''
  }
}

function mapWorker(item: any, fallbackKey?: string): WorkerStatusRecord {
  return {
    camera_id: item.camera_id ?? item.id ?? fallbackKey ?? '',
    numeric_camera_id: item.numeric_camera_id ?? item.numeric_id,
    camera_name: item.camera_name || item.name,
    running: Boolean(item.running ?? item.is_running),
    state: item.state || item.status ? mapState(item.state || item.status) : undefined,
    fps: Number(item.fps ?? item.fps_actual ?? 0),
    last_error: item.last_error || item.error,
    rtsp_connected: item.rtsp_connected ?? item.connected,
    updated_at: item.updated_at || item.last_update_at,
    raw: item
  }
}

function mapWorkers(raw: any): WorkerStatusRecord[] {
  if (Array.isArray(raw)) return raw.map((item) => mapWorker(item))
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([key, value]) => mapWorker(value || {}, key))
  }
  return []
}

function mapModel(item: any): ModelRecord {
  return {
    id: Number(item.id),
    name: item.name || item.file_name || `model_${item.id}`,
    file_name: item.file_name || '',
    file_path: item.file_path || '',
    model_type: item.model_type || 'yolo_pose',
    model_family: item.model_family,
    input_size: item.input_size,
    class_count: item.class_count,
    num_keypoints: item.num_keypoints,
    labels: item.labels,
    metadata: item.metadata,
    file_exists: item.file_exists,
    size_bytes: item.size_bytes
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
    http.get('/runtime/status').then((r) => unwrapAxiosData<any>(r)).catch(() => []),
    safeGetCamerasForMapping(),
    getAlarmRecords().catch(() => [])
  ])
  const rawList = normalizeList(statusRes)
  const cards = rawList.length
    ? rawList.map((item: any) => mapRuntime(item, cameras))
    : cameras.map((camera) => mapRuntime({ camera_id: camera.id, numeric_camera_id: camera.numeric_id, state: camera.runtime_state || (camera.status === 'online' ? 'RUNNING' : 'OFFLINE'), fps: camera.fps_limit }, cameras))
  const kpi: DashboardKpi = {
    online_cameras: cameras.filter((c) => c.status === 'online' && c.enabled).length,
    running_robots: cards.filter((c) => c.state === 'RUNNING').length,
    stopped_robots: cards.filter((c) => c.state === 'STOPPED').length,
    active_alarms: events.filter((e) => e.status !== 'resolved').length
  }
  return { kpi, cards, alarms: events.slice(0, 8) }
}

export async function getCameraRecords(): Promise<CameraRecord[]> {
  if (MOCK) { await wait(); return structuredClone(cameraRecords) }
  const data = unwrapAxiosData<any>(await http.get('/cameras'))
  return normalizeList(data).map(mapCamera)
}

export async function saveCameraRecord(payload: CameraRecord): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] save camera', payload); return }
  const body = {
    name: payload.name,
    rtsp_url: payload.rtsp_url,
    area: payload.area,
    line: payload.line,
    robot_id: payload.robot_id,
    robot_name: payload.robot_name,
    enabled: payload.enabled,
    fps_limit: payload.fps_limit ?? 3,
    detector_type: payload.detector_type || 'motion',
    detector_config: payload.detector_config || {},
    motion_threshold: payload.motion_threshold ?? 5,
    stop_seconds: payload.stop_seconds ?? 30
  }
  if (payload.id || payload.numeric_id) await http.put(`/cameras/${payload.numeric_id ?? payload.id}`, body)
  else await http.post('/cameras', body)
}

export async function deleteCameraRecord(payload: CameraRecord): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.delete(`/cameras/${payload.numeric_id ?? payload.id}`)
}

export async function testCameraConnection(camera: CameraRecord | string | number): Promise<{ ok: boolean; message: string }> {
  if (MOCK) { await wait(500); return { ok: String(apiCameraId(camera)) !== 'cam_004', message: String(apiCameraId(camera)) === 'cam_004' ? '连接失败：RTSP 超时' : '连接成功，已获取到视频帧' } }
  const res = await http.post(`/cameras/${apiCameraId(camera)}/test`)
  const data = unwrapAxiosData<any>(res)
  return { ok: data?.connected !== false, message: data?.message || (data?.connected === false ? '连接失败' : '连接成功') }
}

export async function getWorkerStatuses(): Promise<WorkerStatusRecord[]> {
  if (MOCK) {
    await wait()
    return detectTasks.map((task) => ({ camera_id: task.camera_id, camera_name: task.camera_name, running: task.status === 'running', state: task.status === 'running' ? 'RUNNING' : 'UNKNOWN', fps: 0 }))
  }
  const data = unwrapAxiosData<any>(await http.get('/system/workers'))
  return mapWorkers(data)
}

export async function getDetectTasks(): Promise<DetectTaskRecord[]> {
  if (MOCK) { await wait(); return structuredClone(detectTasks) }
  const [cameras, workers] = await Promise.all([getCameraRecords(), getWorkerStatuses().catch(() => [])])
  return cameras.map((camera) => {
    const worker = workers.find((item) => String(item.camera_id) === String(camera.id) || String(item.numeric_camera_id) === String(camera.numeric_id))
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
      status: worker?.running || camera.runtime_state === 'RUNNING' ? 'running' : worker?.last_error ? 'error' : 'paused',
      numeric_id: camera.numeric_id
    } as DetectTaskRecord
  })
}

export async function saveDetectTask(payload: DetectTaskRecord): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] save task', payload); return }
  await http.put(`/cameras/${apiCameraId(payload)}`, {
    enabled: payload.enabled,
    detector_type: payload.detector_type,
    detector_config: { target_keypoints: payload.target_keypoints, motion_mode: 'mean' },
    motion_threshold: payload.motion_threshold_px,
    stop_seconds: payload.stop_seconds
  })
}

export async function startDetectTask(camera: DetectTaskRecord | CameraRecord | string | number): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.post(`/cameras/${apiCameraId(camera)}/start`)
}

export async function stopDetectTask(camera: DetectTaskRecord | CameraRecord | string | number): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.post(`/cameras/${apiCameraId(camera)}/stop`)
}

export async function getAlarmRecords(params: Record<string, any> = {}): Promise<AlarmRecord[]> {
  if (MOCK) { await wait(); return structuredClone(alarmRecords) }
  const data = unwrapAxiosData<any>(await http.get('/events', { params }))
  return normalizeList(data).map(mapEvent)
}

export async function getEventFrames(eventId: string | number): Promise<any[]> {
  if (MOCK) { await wait(); return [] }
  const data = unwrapAxiosData<any>(await http.get(`/events/${eventId}/frames`))
  return normalizeList(data)
}

export async function resolveAlarm(alarmId: string, remark = '前端标记处理'): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] resolve alarm', alarmId); return }
  await http.put(`/events/${alarmId}/handle`, { remark })
}

export async function closeAlarm(alarmId: string, remark = '前端手动关闭'): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.put(`/events/${alarmId}/close`, { remark })
}

export async function markFalseAlarm(alarmId: string, falseAlarm: boolean, remark = ''): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.put(`/events/${alarmId}/false-alarm`, { false_alarm: falseAlarm, remark })
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

export async function getModels(): Promise<ModelRecord[]> {
  if (MOCK) { await wait(); return [] }
  const data = unwrapAxiosData<any>(await http.get('/models'))
  return normalizeList(data).map(mapModel)
}

export async function registerModel(payload: Partial<ModelRecord> & { file_name: string }): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.post('/models/register', payload)
}

export async function bindModelToCamera(payload: { camera_id: number; model_id: number; extra_config?: Record<string, unknown> }): Promise<void> {
  if (MOCK) { await wait(); return }
  await http.post('/models/bind-camera', payload)
}

export async function uploadModel(formData: FormData): Promise<ModelRecord> {
  if (MOCK) { await wait(); return { id: Date.now(), name: 'mock_model', file_name: 'mock.onnx', file_path: './models/mock.onnx', model_type: 'yolo_pose' } }
  const data = unwrapAxiosData<any>(await http.post('/models/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }))
  return mapModel(data)
}

export async function testModelImage(modelId: number, formData: FormData): Promise<any> {
  if (MOCK) { await wait(); return {} }
  return unwrapAxiosData(await http.post(`/models/${modelId}/test-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }))
}

export async function getSystemHealth(): Promise<SystemHealth> {
  if (MOCK) { await wait(); return { ok: true, status: 'ok', message: 'mock' } }
  const data = unwrapAxiosData<any>(await http.get('/system/health'))
  return { ok: data?.ok ?? true, status: data?.status, message: data?.message, version: data?.version, raw: data }
}

export async function checkBackendConnection(timeout = Number(import.meta.env.VITE_API_TIMEOUT || 15000)): Promise<SystemHealth> {
  if (MOCK) {
    await wait(80)
    return { ok: true, status: 'mock', message: '当前为 Mock 模式，未检测真实后端。' }
  }
  try {
    const data = unwrapAxiosData<any>(await http.get('/system/health', { timeout }))
    const status = String(data?.status || '').toLowerCase()
    const healthyStatus = !status || ['ok', 'healthy', 'up', 'running'].includes(status)
    const ok = data?.ok === false ? false : healthyStatus
    return {
      ok,
      status: data?.status || (ok ? 'ok' : 'error'),
      message: data?.message || (ok ? '后端连接正常' : '后端健康检查异常'),
      version: data?.version,
      raw: data
    }
  } catch (error: any) {
    return {
      ok: false,
      status: 'error',
      message: error?.message || '后端连接失败',
      raw: error
    }
  }
}

export async function getSystemDiagnostics(): Promise<SystemDiagnostics> {
  if (MOCK) {
    await wait()
    return { health: { ok: true, status: 'ok', message: 'mock' }, workers: await getWorkerStatuses() }
  }
  const [health, selfCheck, detectors, streams, storage, workers] = await Promise.all([
    getSystemHealth().catch((error) => ({ ok: false, message: String(error) })),
    http.get('/system/self-check').then((r) => unwrapAxiosData<Record<string, unknown>>(r)).catch(() => undefined),
    http.get('/system/detectors').then((r) => unwrapAxiosData<unknown[]>(r)).catch(() => undefined),
    http.get('/system/streams').then((r) => unwrapAxiosData<unknown>(r)).catch(() => undefined),
    http.get('/system/storage').then((r) => unwrapAxiosData<Record<string, unknown>>(r)).catch(() => undefined),
    getWorkerStatuses().catch(() => [])
  ])
  return { health, self_check: selfCheck, detectors, streams, storage, workers }
}
