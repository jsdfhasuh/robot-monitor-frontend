import { logger } from './logger'

export interface KeypointLogItem {
  index: number
  name?: string
  x?: number
  y?: number
  confidence?: number
  delta_px?: number
  moving?: boolean
  in_roi?: boolean
}

export interface KeypointDebugLogPayload {
  camera_id?: string | number
  camera_name?: string
  state?: string
  valid_keypoints?: number
  moving_keypoints?: number
  mean_delta_px?: number
  max_delta_px?: number
  triggered_keypoints?: Array<string | number>
  trigger_ratio?: number
  alarm?: boolean
  reason?: string
  keypoints?: KeypointLogItem[]
  roi_filter_mode?: string
  target_keypoints?: number[]
  motion_threshold_px?: number
  stop_seconds?: number
  raw?: unknown
}

export function normalizeKeypointIndex(value: unknown, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function roundNumber(value: unknown, digits = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Number(n.toFixed(digits))
}

function formatTriggered(triggered?: Array<string | number>) {
  if (!triggered || triggered.length === 0) return '无'
  return triggered.map((item) => String(item).startsWith('kp') ? String(item) : `kp${item}`).join(', ')
}

export function summarizeKeypointItems(keypoints: KeypointLogItem[] = []) {
  const valid = keypoints.filter((p) => (p.confidence ?? 1) > 0).length
  const moving = keypoints.filter((p) => p.moving === true || Number(p.delta_px ?? 0) > 0).length
  const maxDelta = keypoints.reduce((max, p) => Math.max(max, Number(p.delta_px ?? 0)), 0)
  const avgDelta = keypoints.length ? keypoints.reduce((sum, p) => sum + Number(p.delta_px ?? 0), 0) / keypoints.length : 0
  return {
    total: keypoints.length,
    valid,
    moving,
    max_delta_px: roundNumber(maxDelta) ?? 0,
    mean_delta_px: roundNumber(avgDelta) ?? 0
  }
}

export function logKeypointDebugResult(payload: KeypointDebugLogPayload) {
  const keypointSummary = summarizeKeypointItems(payload.keypoints || [])
  const state = String(payload.state || 'UNKNOWN').toUpperCase()
  const level = payload.alarm || state === 'STOPPED' || state === 'ERROR' ? 'WARN' : 'INFO'
  const message = `关节点检测结果：${state}，有效 ${payload.valid_keypoints ?? keypointSummary.valid}，运动 ${payload.moving_keypoints ?? keypointSummary.moving}，最大位移 ${payload.max_delta_px ?? keypointSummary.max_delta_px}px`
  const detail = {
    camera_id: payload.camera_id,
    camera_name: payload.camera_name,
    state,
    valid_keypoints: payload.valid_keypoints ?? keypointSummary.valid,
    moving_keypoints: payload.moving_keypoints ?? keypointSummary.moving,
    mean_delta_px: payload.mean_delta_px ?? keypointSummary.mean_delta_px,
    max_delta_px: payload.max_delta_px ?? keypointSummary.max_delta_px,
    triggered_keypoints: payload.triggered_keypoints || [],
    triggered_text: formatTriggered(payload.triggered_keypoints),
    trigger_ratio: payload.trigger_ratio,
    alarm: payload.alarm,
    reason: payload.reason,
    roi_filter_mode: payload.roi_filter_mode,
    target_keypoints: payload.target_keypoints,
    motion_threshold_px: payload.motion_threshold_px,
    stop_seconds: payload.stop_seconds,
    keypoints: payload.keypoints,
    raw: payload.raw
  }
  if (level === 'WARN') logger.warn('keypoint', message, detail)
  else logger.info('keypoint', message, detail)
}

export function logKeypointRulesApplied(cameraId: string | number | undefined, rules: Array<{ index: number; name?: string; enabled?: boolean; motion_threshold_px?: number; confidence_threshold?: number }>) {
  logger.info('keypoint', '关节点规则已应用到前端配置', {
    camera_id: cameraId,
    enabled_count: rules.filter((item) => item.enabled !== false).length,
    disabled_count: rules.filter((item) => item.enabled === false).length,
    rules
  })
}

export function logRoiToRectConversion(cameraId: string | number, polygonPoints: unknown[], rect: [number, number, number, number] | null) {
  logger.info('roi', 'ROI 保存前已转换为后端单矩形格式', {
    camera_id: cameraId,
    polygon_point_count: polygonPoints.length,
    backend_roi: rect,
    note: '当前后端只接收 [x1,y1,x2,y2]，前端多边形 ROI 暂时按外接矩形保存。'
  })
}

export function logRuntimeKeypointSummary(payload: KeypointDebugLogPayload) {
  const state = String(payload.state || 'UNKNOWN').toUpperCase()
  const isAbnormal = state === 'STOPPED' || state === 'ERROR' || payload.alarm === true
  const message = `运行状态关节点摘要：${state}，运动点 ${payload.moving_keypoints ?? 0}，最大位移 ${payload.max_delta_px ?? 0}px`
  const detail = {
    camera_id: payload.camera_id,
    camera_name: payload.camera_name,
    state,
    valid_keypoints: payload.valid_keypoints,
    moving_keypoints: payload.moving_keypoints,
    mean_delta_px: payload.mean_delta_px,
    max_delta_px: payload.max_delta_px,
    reason: payload.reason
  }
  if (isAbnormal) logger.warn('keypoint', message, detail)
  else logger.debug('keypoint', message, detail)
}
