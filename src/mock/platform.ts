import type { AlarmRecord, CameraRecord, ConfigVersionRecord, DashboardKpi, DetectTaskRecord, RobotRuntimeCard } from '../types/platform'

export const dashboardKpi: DashboardKpi = {
  online_cameras: 3,
  running_robots: 2,
  stopped_robots: 1,
  active_alarms: 2
}

export const runtimeCards: RobotRuntimeCard[] = [
  {
    camera_id: 'cam_001',
    camera_name: 'CAM01 - 产线1_机械臂',
    robot_id: 'R001',
    robot_name: '一号机械臂',
    line: '产线1',
    state: 'RUNNING',
    fps: 24.8,
    valid_keypoints: 5,
    moving_keypoints: 3,
    mean_delta_px: 6.8,
    max_delta_px: 12.4,
    stop_duration_seconds: 0,
    last_update: '2026-06-01 10:23:18',
    stream_type: 'mjpeg'
  },
  {
    camera_id: 'cam_002',
    camera_name: 'CAM02 - 产线1_末端夹具',
    robot_id: 'R002',
    robot_name: '二号夹具机器人',
    line: '产线1',
    state: 'STOPPED',
    fps: 23.2,
    valid_keypoints: 4,
    moving_keypoints: 0,
    mean_delta_px: 0.8,
    max_delta_px: 1.4,
    stop_duration_seconds: 42,
    last_update: '2026-06-01 10:23:18',
    stream_type: 'mjpeg'
  },
  {
    camera_id: 'cam_003',
    camera_name: 'CAM03 - 产线2_机器人',
    robot_id: 'R003',
    robot_name: '三号搬运机器人',
    line: '产线2',
    state: 'RUNNING',
    fps: 25.0,
    valid_keypoints: 6,
    moving_keypoints: 4,
    mean_delta_px: 7.1,
    max_delta_px: 13.6,
    stop_duration_seconds: 0,
    last_update: '2026-06-01 10:23:17',
    stream_type: 'mjpeg'
  },
  {
    camera_id: 'cam_004',
    camera_name: 'CAM04 - 产线3_备用工位',
    robot_id: 'R004',
    robot_name: '四号备用机器人',
    line: '产线3',
    state: 'OFFLINE',
    fps: 0,
    valid_keypoints: 0,
    moving_keypoints: 0,
    mean_delta_px: 0,
    max_delta_px: 0,
    stop_duration_seconds: 0,
    last_update: '2026-06-01 10:18:02',
    stream_type: 'mjpeg'
  }
]

export const alarmRecords: AlarmRecord[] = [
  {
    id: 'ALM-20260601-001',
    time: '2026-06-01 10:22:36',
    camera_name: 'CAM02 - 产线1_末端夹具',
    robot_name: '二号夹具机器人',
    type: 'STOPPED',
    level: 'critical',
    duration_seconds: 42,
    status: 'pending',
    reason: '目标关节点 3/4/5 连续 42 秒低于运动阈值，判定机器人停机。'
  },
  {
    id: 'ALM-20260601-002',
    time: '2026-06-01 10:18:02',
    camera_name: 'CAM04 - 产线3_备用工位',
    robot_name: '四号备用机器人',
    type: 'OFFLINE',
    level: 'warning',
    duration_seconds: 312,
    status: 'processing',
    reason: 'RTSP 连续重连失败，摄像头离线。'
  },
  {
    id: 'ALM-20260601-003',
    time: '2026-06-01 09:41:25',
    camera_name: 'CAM01 - 产线1_机械臂',
    robot_name: '一号机械臂',
    type: 'RECOVERED',
    level: 'info',
    duration_seconds: 16,
    status: 'resolved',
    reason: '关键点位移恢复，状态从 STOPPED 切换为 RUNNING。'
  }
]

export const cameraRecords: CameraRecord[] = [
  { id: 'cam_001', name: 'CAM01 - 产线1_机械臂', line: '产线1', robot_id: 'R001', robot_name: '一号机械臂', rtsp_url: 'rtsp://192.168.10.21/stream1', enabled: true, status: 'online', last_online: '2026-06-01 10:23:18' },
  { id: 'cam_002', name: 'CAM02 - 产线1_末端夹具', line: '产线1', robot_id: 'R002', robot_name: '二号夹具机器人', rtsp_url: 'rtsp://192.168.10.22/stream1', enabled: true, status: 'online', last_online: '2026-06-01 10:23:18' },
  { id: 'cam_003', name: 'CAM03 - 产线2_机器人', line: '产线2', robot_id: 'R003', robot_name: '三号搬运机器人', rtsp_url: 'rtsp://192.168.10.23/stream1', enabled: true, status: 'online', last_online: '2026-06-01 10:23:17' },
  { id: 'cam_004', name: 'CAM04 - 产线3_备用工位', line: '产线3', robot_id: 'R004', robot_name: '四号备用机器人', rtsp_url: 'rtsp://192.168.10.24/stream1', enabled: false, status: 'offline', last_online: '2026-06-01 10:18:02' }
]

export const detectTasks: DetectTaskRecord[] = [
  { id: 'task_001', name: '产线1 一号机械臂停机检测', camera_id: 'cam_001', camera_name: 'CAM01 - 产线1_机械臂', robot_id: 'R001', robot_name: '一号机械臂', detector_type: 'yolo_pose', roi_filter_mode: 'filter_keypoints', target_keypoints: [1, 2, 3, 4], stop_seconds: 30, motion_threshold_px: 4, enabled: true, status: 'running' },
  { id: 'task_002', name: '产线1 二号夹具停机检测', camera_id: 'cam_002', camera_name: 'CAM02 - 产线1_末端夹具', robot_id: 'R002', robot_name: '二号夹具机器人', detector_type: 'yolo_pose', roi_filter_mode: 'filter_keypoints', target_keypoints: [3, 4, 5], stop_seconds: 30, motion_threshold_px: 4, enabled: true, status: 'running' },
  { id: 'task_003', name: '产线2 搬运机器人停机检测', camera_id: 'cam_003', camera_name: 'CAM03 - 产线2_机器人', robot_id: 'R003', robot_name: '三号搬运机器人', detector_type: 'yolo_pose', roi_filter_mode: 'filter_bbox', target_keypoints: [2, 3, 4, 5], stop_seconds: 25, motion_threshold_px: 5, enabled: true, status: 'running' }
]

export const configVersions: ConfigVersionRecord[] = [
  { id: 'ver_003', version: 'v3', name: '增加排除区域', description: '为 CAM02 增加夹具周边排除区域，降低误报。', created_at: '2026-06-01 09:15:42', created_by: 'admin', applied: false, detector_type: 'yolo_pose', roi_count: 4, keypoint_count: 6 },
  { id: 'ver_002', version: 'v2', name: '调高末端阈值', description: '将 tool_head / wrist 运动阈值上调到 10px。', created_at: '2026-05-31 14:32:21', created_by: 'admin', applied: true, detector_type: 'yolo_pose', roi_count: 3, keypoint_count: 6 },
  { id: 'ver_001', version: 'v1', name: '默认配置', description: '首版默认参数，适合单机械臂场景。', created_at: '2026-05-30 10:08:11', created_by: 'admin', applied: false, detector_type: 'yolo_pose', roi_count: 1, keypoint_count: 6 }
]
