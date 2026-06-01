import type { RobotState, DetectorType, RoiFilterMode } from './settings'

export interface DashboardKpi {
  online_cameras: number
  running_robots: number
  stopped_robots: number
  active_alarms: number
}

export interface RobotRuntimeCard {
  camera_id: string | number
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
  time: string
  camera_name: string
  robot_name: string
  type: 'STOPPED' | 'OFFLINE' | 'ERROR' | 'RECOVERED'
  level: 'info' | 'warning' | 'critical'
  duration_seconds: number
  status: 'pending' | 'processing' | 'resolved'
  reason: string
  snapshot_url?: string
}

export interface CameraRecord {
  id: string | number
  name: string
  line: string
  robot_id: string
  robot_name: string
  rtsp_url: string
  enabled: boolean
  status: 'online' | 'offline' | 'error'
  last_online: string
  fps_limit?: number
  roi?: [number, number, number, number] | null
  detector_type?: DetectorType
  detector_config?: Record<string, any>
  motion_threshold?: number
  stop_seconds?: number
  config_version?: number
}

export interface DetectTaskRecord {
  id: string | number
  name: string
  camera_id: string | number | number
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
