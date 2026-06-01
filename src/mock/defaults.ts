import type { AppSettings, CameraOption, CameraRoiPayload, RuntimeDebugResult } from '../types/settings'

export const cameraOptions: CameraOption[] = [
  { id: 'cam_001', name: 'CAM01 - 产线1_机械臂', line: '产线1' },
  { id: 'cam_002', name: 'CAM02 - 产线1_末端夹具', line: '产线1' },
  { id: 'cam_003', name: 'CAM03 - 产线2_机器人', line: '产线2' }
]

export const defaultSettings: AppSettings = {
  detect: {
    detector_type: 'yolo_pose',
    stop_duration_seconds: 5,
    recover_duration_seconds: 3,
    motion_threshold_px: 8,
    keypoint_conf_threshold: 0.5,
    keypoint_vote_mode: 'majority',
    roi_filter_mode: 'filter_keypoints',
    target_keypoints: [1, 2, 3, 4]
  },
  video: {
    frame_width: 1920,
    frame_height: 1080,
    target_fps: 25,
    codec: 'H.264',
    bitrate_kbps: 4096,
    i_frame_interval: 50
  },
  alarm: {
    alarm_enabled: true,
    alarm_level: 'warning',
    alarm_delay_seconds: 3,
    alarm_hold_seconds: 30,
    sound_enabled: true,
    email_enabled: false
  },
  log: {
    log_level: 'INFO',
    retention_days: 30,
    max_file_size_mb: 100,
    compress_enabled: true
  },
  keypoint_rules: [
    { index: 0, name: 'base', enabled: true, motion_threshold_px: 15, confidence_threshold: 0.5 },
    { index: 1, name: 'shoulder', enabled: true, motion_threshold_px: 12, confidence_threshold: 0.5 },
    { index: 2, name: 'elbow', enabled: true, motion_threshold_px: 12, confidence_threshold: 0.5 },
    { index: 3, name: 'wrist', enabled: true, motion_threshold_px: 10, confidence_threshold: 0.5 },
    { index: 4, name: 'tool_head', enabled: true, motion_threshold_px: 10, confidence_threshold: 0.5 },
    { index: 5, name: 'fixture', enabled: false, motion_threshold_px: 15, confidence_threshold: 0.5 }
  ]
}

export const defaultRoiPayload: CameraRoiPayload = {
  camera_id: 'cam_001',
  roi_filter_mode: 'filter_keypoints',
  rois: [
    {
      id: 'roi_robot_area',
      name: 'robot_area',
      enabled: true,
      type: 'polygon',
      color: '#2563eb',
      points: [
        { x: 0.18, y: 0.18 },
        { x: 0.76, y: 0.14 },
        { x: 0.82, y: 0.58 },
        { x: 0.66, y: 0.9 },
        { x: 0.25, y: 0.82 },
        { x: 0.12, y: 0.45 }
      ],
      keypoint_indexes: [0, 1, 2, 3, 4]
    },
    {
      id: 'roi_tool_area',
      name: 'tool_area',
      enabled: true,
      type: 'polygon',
      color: '#16a34a',
      points: [
        { x: 0.25, y: 0.43 },
        { x: 0.4, y: 0.43 },
        { x: 0.43, y: 0.64 },
        { x: 0.3, y: 0.7 },
        { x: 0.22, y: 0.57 }
      ],
      keypoint_indexes: [4, 5]
    },
    {
      id: 'roi_fixture_area',
      name: 'fixture_area',
      enabled: true,
      type: 'polygon',
      color: '#dc2626',
      points: [
        { x: 0.08, y: 0.75 },
        { x: 0.28, y: 0.72 },
        { x: 0.34, y: 0.9 },
        { x: 0.12, y: 0.96 }
      ],
      keypoint_indexes: [5]
    }
  ],
  exclude_zones: []
}

export const defaultDebugResult: RuntimeDebugResult = {
  state: 'RUNNING',
  valid_keypoints: 4,
  moving_keypoints: 3,
  mean_delta_px: 6.8,
  max_delta_px: 12.4,
  triggered_keypoints: ['kp4', 'kp3'],
  trigger_ratio: 3.1,
  alarm: false,
  reason: '仅 kp4 在 2 帧内位移超过阈值，但未持续达到告警条件。',
  keypoints: [
    { index: 0, name: 'base', x: 612, y: 548, confidence: 0.94, delta_px: 0.8, moving: false, in_roi: true },
    { index: 1, name: 'shoulder', x: 650, y: 240, confidence: 0.91, delta_px: 2.1, moving: false, in_roi: true },
    { index: 2, name: 'elbow', x: 940, y: 285, confidence: 0.88, delta_px: 6.3, moving: true, in_roi: true },
    { index: 3, name: 'wrist', x: 970, y: 500, confidence: 0.92, delta_px: 12.4, moving: true, in_roi: true },
    { index: 4, name: 'tool_head', x: 928, y: 585, confidence: 0.86, delta_px: 8.6, moving: true, in_roi: true },
    { index: 5, name: 'fixture', x: 1040, y: 590, confidence: 0.42, delta_px: 1.2, moving: false, in_roi: false }
  ]
}
