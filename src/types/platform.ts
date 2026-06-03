import type { RobotState, DetectorType, RoiFilterMode } from './settings'

export interface DashboardKpi {
  online_cameras: number
  running_robots: number
  stopped_robots: number
  active_alarms: number
}

export interface RobotRuntimeCard {
  camera_id: string | number
  numeric_camera_id?: number
  camera_name: string
  robot_id: string
  robot_name: string
  line: string
  state: RobotState
  fps: number
  valid_keypoints: number
  moving_keypoints: number
  mean_delta_px: number
  max_delta_px: number
  stop_duration_seconds: number
  last_update: string
  stream_url?: string
  snapshot_url?: string
  stream_type?: 'mjpeg' | 'hls' | 'webrtc'
}


export interface AlarmRecord {
  id: string
  camera_id?: string | number
  time: string
  camera_name: string
  robot_name: string
  type: 'STOPPED' | 'OFFLINE' | 'UNKNOWN' | 'RECOVERED'
  level: 'info' | 'warning' | 'critical'
  duration_seconds: number
  status: 'pending' | 'processing' | 'resolved'
  reason: string
  snapshot_url?: string
  annotated_snapshot_url?: string
  recovery_snapshot_url?: string
  recovery_annotated_url?: string
  clip_url?: string
  handled?: boolean
  false_alarm?: boolean
  remark?: string
}

export interface CameraRecord {
  id: string | number
  numeric_id?: number
  name: string
  area?: string
  line: string
  location?: string
  robot_id: string
  robot_name: string
  rtsp_url: string
  rtsp_url_masked?: string
  enabled: boolean
  status: 'online' | 'offline' | 'error'
  runtime_state?: RobotState
  last_online: string
  fps_limit?: number
  roi?: [number, number, number, number] | null
  stream_urls?: {
    mjpeg?: string
    mjpeg_annotated?: string
    snapshot?: string
  }
  detector_type?: DetectorType
  detector_config?: Record<string, any>
  motion_threshold?: number
  stop_seconds?: number
  config_version?: number
}

export interface DetectTaskRecord {
  id: string | number
  name: string
  camera_id: string | number
  numeric_id?: number
  camera_name: string
  robot_id: string
  robot_name: string
  detector_type: DetectorType
  roi_filter_mode: RoiFilterMode
  target_keypoints: number[]
  stop_seconds: number
  motion_threshold_px: number
  enabled: boolean
  status: 'running' | 'paused' | 'error'
}

export interface ConfigVersionRecord {
  id: string | number
  version: string
  name: string
  description: string
  created_at: string
  created_by: string
  applied: boolean
  detector_type: DetectorType
  roi_count: number
  keypoint_count: number
}

export interface ModelRecord {
  id: number
  name: string
  file_name: string
  file_path: string
  model_type: DetectorType
  model_family?: string
  input_size?: number
  class_count?: number
  num_keypoints?: number
  labels?: string[] | null
  metadata?: Record<string, unknown> | null
  file_exists?: boolean
  size_bytes?: number
}

export interface WorkerStatusRecord {
  camera_id: string | number
  numeric_camera_id?: number
  camera_name?: string
  running?: boolean
  state?: RobotState
  fps?: number
  last_error?: string
  rtsp_connected?: boolean
  updated_at?: string
  raw?: unknown
}

export interface SystemHealth {
  ok?: boolean
  status?: string
  message?: string
  version?: string
  raw?: unknown
}

export interface SystemDiagnostics {
  health?: SystemHealth
  self_check?: Record<string, unknown>
  detectors?: unknown[]
  streams?: unknown
  storage?: Record<string, unknown>
  workers?: WorkerStatusRecord[]
}
