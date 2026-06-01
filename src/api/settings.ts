import { http, unwrapAxiosData } from './http'
import type { AppSettings, CameraRoiPayload, RuntimeDebugResult, CameraOption, RoiConfig, Point } from '../types/settings'
import { defaultSettings, defaultRoiPayload, defaultDebugResult, cameraOptions } from '../mock/defaults'
import { logKeypointDebugResult, logKeypointRulesApplied, logRoiToRectConversion, normalizeKeypointIndex, type KeypointLogItem } from '../utils/keypointLogger'

const MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
const DEFAULT_FRAME_WIDTH = Number(import.meta.env.VITE_DEFAULT_FRAME_WIDTH || 1280)
const DEFAULT_FRAME_HEIGHT = Number(import.meta.env.VITE_DEFAULT_FRAME_HEIGHT || 720)

type Rect = [number, number, number, number]

function mapCameraToSettings(camera: any): AppSettings {
  const detectorConfig = camera?.detector_config || {}
  const settings = structuredClone(defaultSettings)
  settings.detect.detector_type = camera?.detector_type || settings.detect.detector_type
  settings.detect.motion_threshold_px = Number(camera?.motion_threshold ?? settings.detect.motion_threshold_px)
  settings.detect.stop_duration_seconds = Number(camera?.stop_seconds ?? settings.detect.stop_duration_seconds)
  settings.detect.target_keypoints = detectorConfig.target_keypoints || settings.detect.target_keypoints
  settings.detect.keypoint_conf_threshold = Number(detectorConfig.keypoint_conf_threshold ?? settings.detect.keypoint_conf_threshold)
  settings.detect.keypoint_vote_mode = detectorConfig.motion_mode || settings.detect.keypoint_vote_mode
  settings.video.target_fps = Number(camera?.fps_limit ?? settings.video.target_fps)
  return settings
}

function polygonToRect(points: Point[], width = DEFAULT_FRAME_WIDTH, height = DEFAULT_FRAME_HEIGHT): Rect | null {
  if (!points.length) return null
  const xs = points.map((p) => p.x <= 1 ? p.x * width : p.x)
  const ys = points.map((p) => p.y <= 1 ? p.y * height : p.y)
  return [
    Math.round(Math.min(...xs)),
    Math.round(Math.min(...ys)),
    Math.round(Math.max(...xs)),
    Math.round(Math.max(...ys))
  ]
}

function rectToRoiPayload(cameraId: string | number, rect?: Rect | null): CameraRoiPayload {
  if (!rect) return { ...structuredClone(defaultRoiPayload), camera_id: cameraId }
  const [x1, y1, x2, y2] = rect
  const points = [
    { x: x1 / DEFAULT_FRAME_WIDTH, y: y1 / DEFAULT_FRAME_HEIGHT },
    { x: x2 / DEFAULT_FRAME_WIDTH, y: y1 / DEFAULT_FRAME_HEIGHT },
    { x: x2 / DEFAULT_FRAME_WIDTH, y: y2 / DEFAULT_FRAME_HEIGHT },
    { x: x1 / DEFAULT_FRAME_WIDTH, y: y2 / DEFAULT_FRAME_HEIGHT }
  ]
  const roi: RoiConfig = {
    id: `roi_${cameraId}`,
    name: '主 ROI（后端单矩形）',
    enabled: true,
    type: 'rectangle',
    color: '#2563eb',
    points,
    keypoint_indexes: []
  }
  return { camera_id: cameraId, roi_filter_mode: 'filter_keypoints', rois: [roi], exclude_zones: [] }
}

function normalizeKeypoints(raw: any): KeypointLogItem[] {
  const list = Array.isArray(raw?.keypoints) ? raw.keypoints : Array.isArray(raw?.result?.keypoints) ? raw.result.keypoints : []
  const deltas = raw?.keypoint_deltas || raw?.deltas || raw?.tracker?.keypoint_deltas || {}
  const movingIndexes = new Set((raw?.triggered_keypoints || raw?.rule_detail?.triggered_keypoints || []).map((item: any) => Number(String(item).replace(/^kp/, ''))))
  return list.map((item: any, fallbackIndex: number) => {
    const index = normalizeKeypointIndex(item.index ?? item.id ?? item.kp_index ?? fallbackIndex, fallbackIndex)
    const deltaValue = item.delta_px ?? item.delta ?? item.displacement ?? deltas[index] ?? deltas[`kp${index}`]
    const confidence = item.confidence ?? item.conf ?? item.score
    return {
      index,
      name: item.name || `kp${index}`,
      x: item.x ?? item[0],
      y: item.y ?? item[1],
      confidence: confidence === undefined ? undefined : Number(confidence),
      delta_px: deltaValue === undefined ? undefined : Number(deltaValue),
      moving: item.moving ?? movingIndexes.has(index),
      in_roi: item.in_roi ?? item.inside_roi
    }
  })
}

function mapDebugResult(raw: any, context?: { camera_id?: string | number; settings?: AppSettings; roi?: CameraRoiPayload }): RuntimeDebugResult {
  const tracker = raw?.tracker || {}
  const rule = raw?.rule_detail || {}
  const keypoints = normalizeKeypoints(raw)
  const moving = Number(raw?.moving_keypoints ?? rule.moving_keypoints ?? keypoints.filter((p) => p.moving).length ?? 0)
  const result: RuntimeDebugResult = {
    state: String(raw?.state || raw?.status || 'UNKNOWN').toUpperCase() as RuntimeDebugResult['state'],
    valid_keypoints: Number(raw?.valid_keypoints ?? keypoints.length ?? 0),
    moving_keypoints: moving,
    mean_delta_px: Number(raw?.mean_delta_px ?? raw?.motion_score ?? tracker.avg_speed ?? 0),
    max_delta_px: Number(raw?.max_delta_px ?? tracker.total_displacement ?? raw?.motion_score ?? 0),
    triggered_keypoints: raw?.triggered_keypoints || rule.triggered_keypoints || [],
    trigger_ratio: Number(raw?.trigger_ratio ?? 0),
    alarm: Boolean(raw?.alarm ?? rule.alarm ?? false),
    reason: raw?.reason || rule.reason || '后端未返回判断原因',
    keypoints,
    raw
  }
  logKeypointDebugResult({
    camera_id: context?.camera_id,
    state: result.state,
    valid_keypoints: result.valid_keypoints,
    moving_keypoints: result.moving_keypoints,
    mean_delta_px: result.mean_delta_px,
    max_delta_px: result.max_delta_px,
    triggered_keypoints: result.triggered_keypoints,
    trigger_ratio: result.trigger_ratio,
    alarm: result.alarm,
    reason: result.reason,
    keypoints,
    roi_filter_mode: context?.settings?.detect.roi_filter_mode || context?.roi?.roi_filter_mode,
    target_keypoints: context?.settings?.detect.target_keypoints,
    motion_threshold_px: context?.settings?.detect.motion_threshold_px,
    stop_seconds: context?.settings?.detect.stop_duration_seconds,
    raw
  })
  return result
}

export async function getSettings(): Promise<AppSettings> {
  if (MOCK) { await wait(); return structuredClone(defaultSettings) }
  const cameras = unwrapAxiosData<any[]>(await http.get('/cameras'))
  return mapCameraToSettings(cameras?.[0])
}

export async function saveSettings(payload: AppSettings): Promise<void> {
  if (MOCK) { await wait(); logKeypointRulesApplied('mock', payload.keypoint_rules); console.log('[mock] save settings', payload); return }
  const cameras = unwrapAxiosData<any[]>(await http.get('/cameras'))
  const camera = cameras?.[0]
  if (!camera?.id) return
  logKeypointRulesApplied(camera.id, payload.keypoint_rules)
  await http.put(`/cameras/${camera.id}`, {
    detector_type: payload.detect.detector_type,
    detector_config: {
      model_family: 'yolo11_pose',
      input_size: 640,
      num_keypoints: payload.keypoint_rules.length,
      class_count: 1,
      target_keypoints: payload.detect.target_keypoints,
      motion_mode: payload.detect.keypoint_vote_mode,
      keypoint_conf_threshold: payload.detect.keypoint_conf_threshold,
      providers: ['CPUExecutionProvider']
    },
    motion_threshold: payload.detect.motion_threshold_px,
    stop_seconds: payload.detect.stop_duration_seconds,
    fps_limit: payload.video.target_fps
  })
}

export async function applySettings(payload: AppSettings): Promise<void> {
  await saveSettings(payload)
}

export async function resetSettings(): Promise<AppSettings> {
  if (MOCK) { await wait(); return structuredClone(defaultSettings) }
  return structuredClone(defaultSettings)
}

export async function getCameras(): Promise<CameraOption[]> {
  if (MOCK) { await wait(); return cameraOptions }
  const cameras = unwrapAxiosData<any[]>(await http.get('/cameras'))
  return (Array.isArray(cameras) ? cameras : []).map((c) => ({ id: c.id, name: c.name || `Camera ${c.id}`, line: c.line || c.area || '-' }))
}

export async function getCameraRoi(cameraId: string | number): Promise<CameraRoiPayload> {
  if (MOCK) { await wait(); return { ...structuredClone(defaultRoiPayload), camera_id: cameraId } }
  const cameras = unwrapAxiosData<any[]>(await http.get('/cameras'))
  const camera = cameras.find((c) => String(c.id) === String(cameraId))
  return rectToRoiPayload(cameraId, camera?.roi || null)
}

export async function saveCameraRoi(cameraId: string | number, payload: CameraRoiPayload): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] save roi', cameraId, payload); return }
  const firstRoi = payload.rois.find((r) => r.enabled && r.points.length) || payload.rois.find((r) => r.points.length)
  const roi = firstRoi ? polygonToRect(firstRoi.points) : null
  logRoiToRectConversion(cameraId, firstRoi?.points || [], roi)
  await http.put(`/cameras/${cameraId}`, { roi })
}

export async function runDebugTest(payload: { settings: AppSettings; roi: CameraRoiPayload }): Promise<RuntimeDebugResult> {
  const cameraId = payload.roi.camera_id
  if (MOCK) {
    await wait(500)
    const result = structuredClone(defaultDebugResult)
    logKeypointDebugResult({
      camera_id: cameraId,
      state: result.state,
      valid_keypoints: result.valid_keypoints,
      moving_keypoints: result.moving_keypoints,
      mean_delta_px: result.mean_delta_px,
      max_delta_px: result.max_delta_px,
      triggered_keypoints: result.triggered_keypoints,
      trigger_ratio: result.trigger_ratio,
      alarm: result.alarm,
      reason: result.reason,
      roi_filter_mode: payload.settings.detect.roi_filter_mode,
      target_keypoints: payload.settings.detect.target_keypoints,
      motion_threshold_px: payload.settings.detect.motion_threshold_px,
      stop_seconds: payload.settings.detect.stop_duration_seconds,
      keypoints: result.keypoints || []
    })
    return result
  }
  try {
    const data = unwrapAxiosData<any>(await http.post(`/cameras/${cameraId}/debug-detect`, {}))
    return mapDebugResult(data, { camera_id: cameraId, settings: payload.settings, roi: payload.roi })
  } catch {
    const data = unwrapAxiosData<any>(await http.get(`/cameras/${cameraId}/last-result`))
    return mapDebugResult(data, { camera_id: cameraId, settings: payload.settings, roi: payload.roi })
  }
}
