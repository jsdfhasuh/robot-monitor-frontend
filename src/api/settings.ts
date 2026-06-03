import { http, unwrapAxiosData } from './http'
import type {
  AppSettings,
  CameraRoiPayload,
  RuntimeDebugResult,
  CameraOption,
  RoiConfig,
  Point,
  CameraRulePayload,
  CameraStopRule,
  CameraTrackerRule,
  RuleTemplate,
  DetectorType,
  RobotState,
  MovementScore
} from '../types/settings'
import { defaultSettings, defaultRoiPayload, defaultDebugResult, cameraOptions, defaultCameraRule, defaultRuleTemplates } from '../mock/defaults'
import { logKeypointDebugResult, logKeypointRulesApplied, logRoiToRectConversion, normalizeKeypointIndex, type KeypointLogItem } from '../utils/keypointLogger'

const MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))
const DEFAULT_FRAME_WIDTH = Number(import.meta.env.VITE_DEFAULT_FRAME_WIDTH || 1280)
const DEFAULT_FRAME_HEIGHT = Number(import.meta.env.VITE_DEFAULT_FRAME_HEIGHT || 720)
let mockRuleTemplates = structuredClone(defaultRuleTemplates)
const mockCameraRules = new Map<string, CameraRulePayload>()

type Rect = [number, number, number, number]
const movementScoreValues: MovementScore[] = [
  'total_displacement',
  'avg_speed',
  'max_step',
  'net_displacement',
  'keypoint_mean_step',
  'keypoint_max_step',
  'angle_change',
  'raw'
]

function normalizeList(raw: any): any[] {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.items)) return raw.items
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.templates)) return raw.templates
  return []
}

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

function mapBackendSettings(raw: any): AppSettings {
  const source = raw?.settings || raw || {}
  const settings = structuredClone(defaultSettings)
  const detect = source.detect || {}
  const detectorConfig = source.detector_config || {}
  const video = source.video || {}
  settings.detect.detector_type = detect.detector_type || source.detector_type || settings.detect.detector_type
  settings.detect.motion_threshold_px = Number(detect.motion_threshold ?? detect.motion_threshold_px ?? source.motion_threshold ?? settings.detect.motion_threshold_px)
  settings.detect.stop_duration_seconds = Number(detect.stop_duration_seconds ?? source.stop_seconds ?? settings.detect.stop_duration_seconds)
  settings.detect.target_keypoints = detectorConfig.target_keypoints || detect.target_keypoints || settings.detect.target_keypoints
  settings.detect.keypoint_conf_threshold = Number(detectorConfig.keypoint_conf_threshold ?? detect.keypoint_conf_threshold ?? settings.detect.keypoint_conf_threshold)
  settings.detect.keypoint_vote_mode = detectorConfig.motion_mode || detect.keypoint_vote_mode || settings.detect.keypoint_vote_mode
  settings.video.target_fps = Number(video.target_fps ?? source.fps_limit ?? settings.video.target_fps)
  settings.video.frame_width = Number(video.frame_width ?? settings.video.frame_width)
  settings.video.frame_height = Number(video.frame_height ?? settings.video.frame_height)
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

function mapBackendRoi(cameraId: string | number, raw: any): CameraRoiPayload {
  if (!raw) return { ...structuredClone(defaultRoiPayload), camera_id: cameraId }
  const rois = Array.isArray(raw.rois) ? raw.rois : []
  const excludeZones = Array.isArray(raw.exclude_zones) ? raw.exclude_zones : []
  return {
    camera_id: raw.camera_id ?? cameraId,
    numeric_camera_id: raw.numeric_camera_id,
    image_width: raw.image_width,
    image_height: raw.image_height,
    roi_filter_mode: raw.roi_filter_mode || 'filter_keypoints',
    rois: rois.map((roi: any, index: number) => ({
      id: roi.id || `roi_${index + 1}`,
      name: roi.name || `roi_${index + 1}`,
      enabled: roi.enabled !== false,
      type: roi.type || 'polygon',
      color: roi.color || ['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea'][index % 5],
      points: Array.isArray(roi.points) ? roi.points : [],
      keypoint_indexes: roi.keypoint_indexes || []
    })),
    exclude_zones: excludeZones.map((roi: any, index: number) => ({
      id: roi.id || `exclude_${index + 1}`,
      name: roi.name || `exclude_${index + 1}`,
      enabled: roi.enabled !== false,
      type: roi.type || 'polygon',
      color: roi.color || '#64748b',
      points: Array.isArray(roi.points) ? roi.points : [],
      keypoint_indexes: roi.keypoint_indexes || []
    })),
    pixel_roi: raw.pixel_roi || null
  }
}

function mapDetectorType(value: any): DetectorType {
  const type = String(value || defaultCameraRule.detector_type)
  return ['motion', 'aruco', 'yolo', 'yolo_pose'].includes(type) ? type as DetectorType : defaultCameraRule.detector_type
}

function mapRobotState(value: any): RobotState {
  const state = String(value || 'UNKNOWN').toUpperCase()
  return ['RUNNING', 'IDLE', 'STOPPED', 'OFFLINE', 'UNKNOWN'].includes(state) ? state as RobotState : 'UNKNOWN'
}

function mapStopRule(raw: any): CameraStopRule {
  const source = raw || {}
  return {
    motion_threshold: Number(source.motion_threshold ?? defaultCameraRule.rule.motion_threshold),
    stop_seconds: Number(source.stop_seconds ?? defaultCameraRule.rule.stop_seconds),
    unknown_seconds: Number(source.unknown_seconds ?? defaultCameraRule.rule.unknown_seconds),
    confirm_frames: Number(source.confirm_frames ?? defaultCameraRule.rule.confirm_frames),
    status_hold_seconds: Number(source.status_hold_seconds ?? defaultCameraRule.rule.status_hold_seconds)
  }
}

function mapTrackerRule(raw: any): CameraTrackerRule {
  const source = raw || {}
  const movementScore = String(source.movement_score || defaultCameraRule.tracker.movement_score)
  return {
    movement_score: movementScoreValues.includes(movementScore as MovementScore) ? movementScore as MovementScore : defaultCameraRule.tracker.movement_score,
    window_seconds: Number(source.window_seconds ?? defaultCameraRule.tracker.window_seconds),
    min_step_px: Number(source.min_step_px ?? defaultCameraRule.tracker.min_step_px)
  }
}

function mapCameraRule(cameraId: string | number, raw: any): CameraRulePayload {
  const source = raw?.rule && raw?.tracker ? raw : raw?.data || raw || {}
  const current = source.current || {}
  return {
    camera_id: source.camera_id ?? cameraId,
    numeric_camera_id: source.numeric_camera_id === undefined ? undefined : Number(source.numeric_camera_id),
    detector_type: mapDetectorType(source.detector_type),
    rule: mapStopRule(source.rule),
    tracker: mapTrackerRule(source.tracker),
    current: {
      status: mapRobotState(current.status || source.status),
      message: current.message || source.message || '暂无实时规则状态',
      motion_distance: Number(current.motion_distance ?? source.motion_distance ?? 0),
      rule_detail: current.rule_detail || {},
      tracker: current.tracker || {}
    },
    config_version: Number(source.config_version ?? 0),
    updated_at: source.updated_at || ''
  }
}

function mapRuleTemplate(raw: any): RuleTemplate {
  return {
    id: raw?.id ?? raw?.template_id ?? `tpl_${Date.now()}`,
    name: raw?.name || '未命名规则模板',
    description: raw?.description || '',
    detector_type: mapDetectorType(raw?.detector_type),
    rule: mapStopRule(raw?.rule),
    tracker: mapTrackerRule(raw?.tracker),
    created_at: raw?.created_at,
    updated_at: raw?.updated_at
  }
}

function buildSettingsPayload(payload: AppSettings, cameraId?: string | number) {
  return {
    ...(cameraId ? { camera_id: cameraId } : {}),
    detect: {
      detector_type: payload.detect.detector_type,
      motion_threshold: payload.detect.motion_threshold_px,
      stop_duration_seconds: payload.detect.stop_duration_seconds
    },
    detector_config: {
      model_family: 'yolo11_pose',
      input_size: payload.video.frame_width || 640,
      num_keypoints: payload.keypoint_rules.length,
      class_count: 1,
      target_keypoints: payload.detect.target_keypoints,
      motion_mode: payload.detect.keypoint_vote_mode,
      keypoint_conf_threshold: payload.detect.keypoint_conf_threshold,
      providers: ['CPUExecutionProvider']
    },
    video: {
      target_fps: payload.video.target_fps
    }
  }
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
  try {
    const data = unwrapAxiosData<any>(await http.get('/settings'))
    return mapBackendSettings(data)
  } catch {
    const cameras = unwrapAxiosData<any[]>(await http.get('/cameras'))
    return mapCameraToSettings(cameras?.[0])
  }
}

export async function saveSettings(payload: AppSettings): Promise<void> {
  if (MOCK) { await wait(); logKeypointRulesApplied('mock', payload.keypoint_rules); console.log('[mock] save settings', payload); return }
  logKeypointRulesApplied('global', payload.keypoint_rules)
  await http.post('/settings/save', buildSettingsPayload(payload))
}

export async function applySettings(payload: AppSettings): Promise<void> {
  if (MOCK) { await wait(); return }
  logKeypointRulesApplied('global', payload.keypoint_rules)
  await http.post('/settings/apply', buildSettingsPayload(payload))
}

export async function resetSettings(): Promise<AppSettings> {
  if (MOCK) { await wait(); return structuredClone(defaultSettings) }
  const data = unwrapAxiosData<any>(await http.post('/settings/reset'))
  return mapBackendSettings(data)
}

export async function getCameras(): Promise<CameraOption[]> {
  if (MOCK) { await wait(); return cameraOptions }
  const cameras = unwrapAxiosData<any[]>(await http.get('/cameras'))
  return (Array.isArray(cameras) ? cameras : []).map((c) => ({ id: c.id, numeric_id: c.numeric_id, name: c.name || `Camera ${c.id}`, line: c.line || c.area || '-' }))
}

export async function getCameraRoi(cameraId: string | number): Promise<CameraRoiPayload> {
  if (MOCK) { await wait(); return { ...structuredClone(defaultRoiPayload), camera_id: cameraId } }
  try {
    const data = unwrapAxiosData<any>(await http.get(`/cameras/${cameraId}/roi`))
    const mapped = mapBackendRoi(cameraId, data)
    return mapped.rois.length ? mapped : { ...structuredClone(defaultRoiPayload), camera_id: cameraId }
  } catch {
    const cameras = unwrapAxiosData<any[]>(await http.get('/cameras'))
    const camera = cameras.find((c) => String(c.id) === String(cameraId) || String(c.numeric_id) === String(cameraId))
    return rectToRoiPayload(cameraId, camera?.roi || camera?.pixel_roi || null)
  }
}

export async function saveCameraRoi(cameraId: string | number, payload: CameraRoiPayload): Promise<void> {
  if (MOCK) { await wait(); console.log('[mock] save roi', cameraId, payload); return }
  const firstRoi = payload.rois.find((r) => r.enabled && r.points.length) || payload.rois.find((r) => r.points.length)
  const roi = firstRoi ? polygonToRect(firstRoi.points, payload.image_width || DEFAULT_FRAME_WIDTH, payload.image_height || DEFAULT_FRAME_HEIGHT) : null
  logRoiToRectConversion(cameraId, firstRoi?.points || [], roi)
  await http.post(`/cameras/${cameraId}/roi`, {
    camera_id: cameraId,
    image_width: payload.image_width || DEFAULT_FRAME_WIDTH,
    image_height: payload.image_height || DEFAULT_FRAME_HEIGHT,
    rois: payload.rois,
    exclude_zones: payload.exclude_zones,
    pixel_roi: roi
  })
}

function mockRuleForCamera(cameraId: string | number): CameraRulePayload {
  const key = String(cameraId)
  const cached = mockCameraRules.get(key)
  if (cached) return structuredClone(cached)
  const camera = cameraOptions.find((item) => String(item.id) === key || String(item.numeric_id) === key)
  const rule = structuredClone(defaultCameraRule)
  rule.camera_id = camera?.id ?? cameraId
  rule.numeric_camera_id = camera?.numeric_id
  mockCameraRules.set(key, structuredClone(rule))
  return rule
}

function buildRuleSavePayload(payload: CameraRulePayload | { rule: CameraStopRule; tracker: CameraTrackerRule }) {
  return {
    rule: mapStopRule(payload.rule),
    tracker: mapTrackerRule(payload.tracker)
  }
}

function buildTemplatePayload(payload: Omit<RuleTemplate, 'id'> & { id?: string | number }) {
  return {
    name: payload.name,
    description: payload.description,
    detector_type: payload.detector_type,
    rule: mapStopRule(payload.rule),
    tracker: mapTrackerRule(payload.tracker)
  }
}

export async function getCameraRule(cameraId: string | number): Promise<CameraRulePayload> {
  if (MOCK) { await wait(); return mockRuleForCamera(cameraId) }
  const data = unwrapAxiosData<any>(await http.get(`/cameras/${cameraId}/rule`))
  return mapCameraRule(cameraId, data)
}

export async function saveCameraRule(cameraId: string | number, payload: CameraRulePayload): Promise<CameraRulePayload> {
  if (MOCK) {
    await wait()
    const next = {
      ...structuredClone(payload),
      camera_id: cameraId,
      config_version: Number(payload.config_version || 0) + 1,
      updated_at: new Date().toISOString()
    }
    mockCameraRules.set(String(cameraId), structuredClone(next))
    console.log('[mock] save camera rule', cameraId, next)
    return next
  }
  const data = unwrapAxiosData<any>(await http.put(`/cameras/${cameraId}/rule`, buildRuleSavePayload(payload)))
  return mapCameraRule(cameraId, data?.rule || data?.tracker ? data : { ...payload, ...data })
}

export async function copyCameraRule(sourceCameraId: string | number, targetCameraIds: Array<string | number>): Promise<void> {
  if (MOCK) {
    await wait()
    const source = mockRuleForCamera(sourceCameraId)
    targetCameraIds.forEach((cameraId) => {
      mockCameraRules.set(String(cameraId), {
        ...structuredClone(source),
        camera_id: cameraId,
        config_version: Number(source.config_version || 0) + 1,
        updated_at: new Date().toISOString()
      })
    })
    console.log('[mock] copy camera rule', sourceCameraId, targetCameraIds)
    return
  }
  await http.post(`/cameras/${sourceCameraId}/rule/copy`, { target_camera_ids: targetCameraIds })
}

export async function getRuleTemplates(): Promise<RuleTemplate[]> {
  if (MOCK) { await wait(); return structuredClone(mockRuleTemplates) }
  const data = unwrapAxiosData<any>(await http.get('/rule-templates'))
  return normalizeList(data).map(mapRuleTemplate)
}

export async function createRuleTemplate(payload: Omit<RuleTemplate, 'id'> & { id?: string | number }): Promise<RuleTemplate> {
  if (MOCK) {
    await wait()
    const template: RuleTemplate = {
      ...buildTemplatePayload(payload),
      id: `tpl_${Date.now()}`,
      created_at: new Date().toISOString()
    }
    mockRuleTemplates.unshift(template)
    return structuredClone(template)
  }
  const data = unwrapAxiosData<any>(await http.post('/rule-templates', buildTemplatePayload(payload)))
  return mapRuleTemplate(data)
}

export async function updateRuleTemplate(templateId: string | number, payload: Omit<RuleTemplate, 'id'> & { id?: string | number }): Promise<RuleTemplate> {
  if (MOCK) {
    await wait()
    const index = mockRuleTemplates.findIndex((item) => String(item.id) === String(templateId))
    const template: RuleTemplate = {
      ...buildTemplatePayload(payload),
      id: templateId,
      created_at: mockRuleTemplates[index]?.created_at,
      updated_at: new Date().toISOString()
    }
    if (index >= 0) mockRuleTemplates[index] = template
    else mockRuleTemplates.unshift(template)
    return structuredClone(template)
  }
  const data = unwrapAxiosData<any>(await http.put(`/rule-templates/${templateId}`, buildTemplatePayload(payload)))
  return mapRuleTemplate(data)
}

export async function deleteRuleTemplate(templateId: string | number): Promise<void> {
  if (MOCK) {
    await wait()
    mockRuleTemplates = mockRuleTemplates.filter((item) => String(item.id) !== String(templateId))
    return
  }
  await http.delete(`/rule-templates/${templateId}`)
}

export async function applyRuleTemplate(templateId: string | number, cameraIds: Array<string | number>): Promise<void> {
  if (MOCK) {
    await wait()
    const template = mockRuleTemplates.find((item) => String(item.id) === String(templateId))
    if (!template) return
    cameraIds.forEach((cameraId) => {
      const current = mockRuleForCamera(cameraId)
      mockCameraRules.set(String(cameraId), {
        ...current,
        detector_type: template.detector_type,
        rule: structuredClone(template.rule),
        tracker: structuredClone(template.tracker),
        config_version: Number(current.config_version || 0) + 1,
        updated_at: new Date().toISOString()
      })
    })
    return
  }
  await http.post(`/rule-templates/${templateId}/apply`, { camera_ids: cameraIds })
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
    const data = unwrapAxiosData<any>(await http.post('/debug/keypoints/evaluate', {
      camera_id: cameraId,
      settings: {
        motion_threshold: payload.settings.detect.motion_threshold_px,
        stop_duration_seconds: payload.settings.detect.stop_duration_seconds
      }
    }))
    return mapDebugResult(data, { camera_id: cameraId, settings: payload.settings, roi: payload.roi })
  } catch {
    try {
      const data = unwrapAxiosData<any>(await http.get('/debug/keypoints', { params: { camera_id: cameraId } }))
      return mapDebugResult(data, { camera_id: cameraId, settings: payload.settings, roi: payload.roi })
    } catch {
      const data = unwrapAxiosData<any>(await http.get(`/cameras/${cameraId}/last-result`))
      return mapDebugResult(data, { camera_id: cameraId, settings: payload.settings, roi: payload.roi })
    }
  }
}
