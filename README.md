# 机器人运行监控平台 - 前端

这是适配当前后端实际接口的纯前端项目。前端容器只负责页面展示、Nginx 静态资源、`/api`、`/stream`、`/data` 和 `/ws` 代理；RTSP、截图、MJPEG 视频流、YOLO Pose 推理、状态判断和事件记录都由后端提供。

## 当前适配状态

本版本已按后端 `FRONTEND_INTEGRATION.md` 的真实接口调整。

核心变化：

```text
1. 响应格式兼容 ok/data/message，不再只依赖 code === 0
2. 视频流优先使用 /stream/cameras/{id}/mjpeg
3. 截图优先使用 /stream/cameras/{id}/snapshot
4. 实时状态改为 GET /api/runtime/status，WebSocket 使用 /ws/status
5. 告警中心改为事件中心 GET /api/events
6. 检测任务改为摄像头 worker：/api/cameras/{id}/start 和 /stop
7. ROI 改为 GET/POST /api/cameras/{id}/roi
8. Settings 改为 /api/settings、/save、/apply、/reset
9. 新增模型管理和系统诊断入口
10. 新增规则面板，接入摄像头规则、复制规则和规则模板接口
```

## 已完成页面

```text
/dashboard           实时监控
/debug/keypoints     标定与调试：关节点调试 + ROI 标定
/rules               规则面板：摄像头停机规则、复制规则、规则模板
/cameras             摄像头管理
/tasks               检测任务管理，当前映射到 camera worker
/alarms              告警中心，当前映射到 events 事件中心
/models              模型管理：上传、注册、绑定模型
/config-versions     配置导入/导出占位
/system              系统诊断：健康、自检、Worker、存储
/settings            系统设置 + ROI 配置
```

默认首页是：

```text
/dashboard
```

系统设置入口不在左侧菜单，点击右上角 `⚙️` 进入 `/settings`。

## 本地开发

```bash
cp .env.example .env
npm install
npm run dev
```

访问：

```text
http://127.0.0.1:5173
```

默认使用 Mock 数据：

```env
VITE_USE_MOCK=true
```

接真实后端时：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
```

## 构建检查

```bash
npm run build
```

本版本已经通过构建检查。

## Docker 前端单独启动

```bash
docker compose -f docker-compose.frontend-only.yml up -d --build
```

访问：

```text
http://服务器IP:8080
```

## 前后端双容器启动

```bash
docker compose up -d --build
```

容器职责：

```text
robot-frontend
- Vue 静态页面
- Nginx
- /api 代理到后端
- /ws 代理到后端

robot-backend
- 摄像头管理
- RTSP 拉流
- MJPEG 视频流
- frame.jpg 截图
- YOLO / YOLO Pose 检测
- 状态判断
- 事件中心
- 模型管理
- Worker 管理
```

## Nginx 代理

当前后端视频流推荐使用 `/stream/cameras/{id}/mjpeg`，核心 `/api/cameras/{id}/stream.mjpg` 仍作为回退路径：

```nginx
location /api/ {
    proxy_pass http://robot-backend:8000/api/;
}

location /ws/ {
    proxy_pass http://robot-backend:8000/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

location /stream/ {
    proxy_pass http://robot-backend:8000/stream/;
}

location /data/ {
    proxy_pass http://robot-backend:8000/data/;
}
```

项目里已配置 `/stream/` 和 `/data/` 代理，分别用于 MJPEG/snapshot 和事件图片。

## 当前后端接口映射

### 摄像头管理

```text
GET    /api/cameras
POST   /api/cameras
PUT    /api/cameras/{id}
DELETE /api/cameras/{id}
POST   /api/cameras/{id}/test
```

当前后端 camera.id 是数字 ID，前端已兼容数字 ID。

### 视频流与截图

```text
GET /stream/cameras/{id}/mjpeg?annotated=false&fps=8&quality=80
GET /stream/cameras/{id}/mjpeg?annotated=true&fps=8&quality=80
GET /stream/cameras/{id}/snapshot?annotated=false
GET /stream/cameras/{id}/snapshot?annotated=true
GET /api/cameras/{id}/stream-info
GET /api/system/streams
```

前端封装：

```ts
getCameraStreamUrl(cameraId, annotated, fps, quality)
getCameraFrameUrl(cameraId, annotated)
```

### 实时状态

```text
GET /api/runtime/status
WS  /ws/status
```

前端当前已接 `GET /api/runtime/status`，并在 dashboard 接入 `/ws/status` 推送刷新。

### ROI 标定

当前使用独立 ROI 接口：

```text
GET  /api/cameras/{id}/roi
POST /api/cameras/{id}/roi
```

### 关节点调试

```text
GET  /api/cameras/{id}/last-result
POST /api/cameras/{id}/debug-detect
POST /api/cameras/{id}/image-detect
POST /api/cameras/{id}/image-pair-detect
```

前端“应用参数试算”优先调用：

```text
POST /api/cameras/{id}/debug-detect
```

失败后回退：

```text
GET /api/cameras/{id}/last-result
```

### 检测任务

当前没有独立 tasks 表，前端已映射为摄像头 worker：

```text
GET  /api/cameras
GET  /api/system/workers
POST /api/cameras/{id}/start
POST /api/cameras/{id}/stop
```

### 告警中心

当前接事件中心：

```text
GET /api/events
GET /api/events/summary
GET /api/events/{id}/frames
PUT /api/events/{id}/remark
PUT /api/events/{id}/false-alarm
PUT /api/events/{id}/close
```

前端“标记处理”当前调用：

```text
PUT /api/events/{id}/close
```

### 设置页

当前 settings 使用：

```text
GET  /api/settings
POST /api/settings/save
POST /api/settings/apply
POST /api/settings/reset
```

主要字段：

```json
{
  "detector_type": "yolo_pose",
  "detector_config": {
    "model_family": "yolo11_pose",
    "input_size": 640,
    "num_keypoints": 6,
    "class_count": 1,
    "target_keypoints": [2, 3, 4, 5],
    "motion_mode": "mean",
    "keypoint_conf_threshold": 0.25,
    "providers": ["CPUExecutionProvider"]
  },
  "motion_threshold": 4,
  "stop_seconds": 30,
  "fps_limit": 3
}
```

### 规则面板

规则面板位于 `/rules`，用于配置每路摄像头的机器人停机判断规则。

当前已接入：

```text
GET  /api/cameras/{id}/rule
PUT  /api/cameras/{id}/rule
POST /api/cameras/{id}/rule/copy
GET  /api/rule-templates
POST /api/rule-templates
GET  /api/rule-templates/{template_id}
PUT  /api/rule-templates/{template_id}
DELETE /api/rule-templates/{template_id}
POST /api/rule-templates/{template_id}/apply
```

保存摄像头规则时全量提交：

```json
{
  "rule": {
    "motion_threshold": 4,
    "stop_seconds": 30,
    "unknown_seconds": 10,
    "confirm_frames": 2,
    "status_hold_seconds": 1.0
  },
  "tracker": {
    "movement_score": "keypoint_mean_step",
    "window_seconds": 30,
    "min_step_px": 1.5
  }
}
```

`movement_score` 支持：

```text
total_displacement
avg_speed
max_step
net_displacement
keypoint_mean_step
keypoint_max_step
angle_change
raw
```

复制规则只复制 `rule` 和 `tracker`，不会复制 RTSP、模型、ROI 或摄像头名称。保存规则、复制规则和应用模板后，后端会递增 `config_version`，Worker 会热更新。

### 配置导入导出

当前后端可用：

```text
GET  /api/config/export
POST /api/config/import
```

完整版本列表、对比、回滚等后续等后端补齐接口后再接。

## 项目结构

```text
src/
├── api/
│   ├── http.ts        # axios + ok/data/message 兼容层
│   ├── stream.ts      # MJPEG / snapshot 地址封装
│   ├── settings.ts    # 设置、ROI、规则面板、关节点调试接口
│   └── platform.ts    # 摄像头、状态、任务、事件、配置接口
├── components/
│   ├── RoiEditor.vue
│   ├── SettingsForms.vue
│   └── KeypointRuleTable.vue
├── mock/
├── router/
├── styles/
├── types/
└── views/             # 页面目录，包含 Dashboard、Rules、Models、System 等页面
```

## 当前前端进度

```text
完整平台前端：真实后端接口适配版
```

剩余主要是：真实现场数据联调、登录权限、生产环境细节优化、按后端后续版本补配置版本完整接口。


## 前端运行日志

本版本已加入浏览器侧前端日志系统。

入口：页面右上角 `📋` 按钮。

已记录内容：

```text
1. 页面路由切换
2. API 请求开始 / 成功 / 业务失败 / 网络异常
3. 视频流加载失败 / 恢复
4. 页面运行异常 window.error
5. 未处理 Promise 异常
6. WebSocket 连接工具日志，接入时可复用 src/utils/wsStatus.ts
```

支持操作：

```text
复制日志
导出 .log 文件
按级别过滤
关键词搜索
清空日志
```

可选环境变量：

```env
# 前端日志最多保留条数，默认 500
VITE_FRONTEND_LOG_MAX=500

# 是否输出到浏览器 console，默认 true
VITE_FRONTEND_LOG_CONSOLE=true

# API 超时时间，默认 15000ms
VITE_API_TIMEOUT=15000
```

注意：这里是浏览器侧日志，不等于后端日志或 Nginx 日志。后端容器日志仍用 `docker logs robot-backend`，前端 Nginx 日志仍用 `docker logs robot-frontend` 查看。

## 前端关节点日志

本版本在原有前端运行日志基础上，新增了 `keypoint` 和 `roi` 两类日志，方便联调 YOLO Pose 检测结果。

### 日志入口

页面右上角点击：

```text
📋 前端运行日志
```

可以搜索关键词：

```text
keypoint
roi
debug-detect
last-result
```

### 会记录哪些关节点日志

```text
1. 关节点调试接口返回结果
2. 参数试算结果
3. 当前状态中的关节点摘要
4. STOPPED / ERROR / alarm=true 的异常关节点状态
5. 关节点规则保存
6. ROI 多边形转后端单矩形 [x1,y1,x2,y2]
```

### 典型日志内容

```text
[INFO] [keypoint] 关节点检测结果：RUNNING，有效 4，运动 3，最大位移 12.4px
[WARN] [keypoint] 运行状态关节点摘要：STOPPED，运动点 0，最大位移 0.3px
[INFO] [roi] ROI 保存前已转换为后端单矩形格式
```

日志详情里会带上：

```json
{
  "camera_id": 1,
  "state": "RUNNING",
  "valid_keypoints": 4,
  "moving_keypoints": 3,
  "mean_delta_px": 6.8,
  "max_delta_px": 12.4,
  "triggered_keypoints": ["kp4", "kp3"],
  "roi_filter_mode": "filter_keypoints",
  "target_keypoints": [2, 3, 4, 5],
  "motion_threshold_px": 8,
  "stop_seconds": 30,
  "reason": "后端返回的判断原因",
  "keypoints": [
    {
      "index": 3,
      "name": "wrist",
      "x": 970,
      "y": 500,
      "confidence": 0.92,
      "delta_px": 12.4,
      "moving": true,
      "in_roi": true
    }
  ]
}
```

### 前端兼容的后端 keypoints 字段

前端会尽量兼容这些字段：

```text
keypoints
result.keypoints
keypoint_deltas
deltas
tracker.keypoint_deltas
triggered_keypoints
rule_detail.triggered_keypoints
rule_detail.reason
```

单个 keypoint 支持：

```text
index / id / kp_index
name
x / y
confidence / conf / score
delta_px / delta / displacement
moving
in_roi / inside_roi
```
