export type DetectorType = 'motion' | 'yolo_object' | 'yolo_pose' | 'hybrid'
export type RoiType = 'polygon' | 'rectangle'
export type RoiFilterMode = 'disabled' | 'filter_keypoints' | 'filter_bbox'
export type RobotState = 'RUNNING' | 'IDLE' | 'STOPPED' | 'OFFLINE' | 'ERROR'

export interface Point {
  x: number
  y: number
}

export interface KeypointRule {
  index: number
  name: string
  enabled: boolean
  motion_threshold_px: number
  confidence_threshold: number
}

export interface RoiConfig {
  id: string
  name: string
  enabled: boolean
  type: RoiType
  color: string
  points: Point[]
  keypoint_indexes: number[]
}

export interface CameraRoiPayload {
  camera_id: string | number
  roi_filter_mode: RoiFilterMode
  rois: RoiConfig[]
  exclude_zones: RoiConfig[]
}

export interface DetectSettings {
  detector_type: DetectorType
  stop_duration_seconds: number
  recover_duration_seconds: number
  motion_threshold_px: number
  keypoint_conf_threshold: number
  keypoint_vote_mode: 'mean' | 'max' | 'majority'
  roi_filter_mode: RoiFilterMode
  target_keypoints: number[]
}

export interface VideoSettings {
  frame_width: number
  frame_height: number
  target_fps: number
  codec: string
  bitrate_kbps: number
  i_frame_interval: number
}

export interface AlarmSettings {
  alarm_enabled: boolean
  alarm_level: 'info' | 'warning' | 'critical'
  alarm_delay_seconds: number
  alarm_hold_seconds: number
  sound_enabled: boolean
  email_enabled: boolean
}

export interface LogSettings {
  log_level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'
  retention_days: number
  max_file_size_mb: number
  compress_enabled: boolean
}

export interface AppSettings {
  detect: DetectSettings
  video: VideoSettings
  alarm: AlarmSettings
  log: LogSettings
  keypoint_rules: KeypointRule[]
}

export interface RuntimeKeypointDetail {
  index: number
  name?: string
  x?: number
  y?: number
  confidence?: number
  delta_px?: number
  moving?: boolean
  in_roi?: boolean
}

export interface RuntimeDebugResult {
  state: RobotState
  valid_keypoints: number
  moving_keypoints: number
  mean_delta_px: number
  max_delta_px: number
  triggered_keypoints: string[]
  trigger_ratio: number
  alarm: boolean
  reason: string
  keypoints?: RuntimeKeypointDetail[]
  raw?: unknown
}

export interface CameraOption {
  id: string | number
  name: string
  line: string
}
