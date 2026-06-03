# AGENT.md

本文档给后续进入本仓库的编码代理使用。项目是机器人运行监控平台前端，当前后端接口源文档为：

```text
C:/Users/dd109/my_work/robot-vision-platform-backend/FRONTEND_INTEGRATION.md
```

以后端文档为接口事实来源；本文件只记录前端项目的接入约定、代码落点和当前需要注意的差异。

## 项目定位

- 技术栈：Vue 3、TypeScript、Vite、Element Plus、axios、ECharts。
- 前端只负责页面展示、状态聚合展示、视频流嵌入、ROI 绘制、配置表单和事件处理入口。
- RTSP 拉流、MJPEG、截图、YOLO / YOLO Pose 推理、Worker 状态、事件记录、模型管理都由后端提供。
- 默认首页是 `/dashboard`；规则面板为 `/rules`；系统设置页为 `/settings`。

## 本地运行

```bash
npm install
npm run dev
npm run build
```

常用环境变量见 `.env.example`：

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=http://127.0.0.1:8000
VITE_BACKEND_WS=ws://127.0.0.1:8000
VITE_BACKEND_PUBLIC_BASE=
VITE_API_TIMEOUT=15000
```

接真实后端时通常使用：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api
```

后端默认地址是 `http://127.0.0.1:8000`，接口文档是 `http://127.0.0.1:8000/docs`。

## 代理约定

后端文档建议开发代理覆盖：

```text
/api    -> http://127.0.0.1:8000
/stream -> http://127.0.0.1:8000
/data   -> http://127.0.0.1:8000
/ws     -> ws://127.0.0.1:8000
```

当前 `vite.config.ts` 已配置 `/api`、`/stream`、`/data` 和 `/ws`。生产 Nginx 也应保持同样代理能力；事件图片通常使用 `/data/...` 相对路径，跨域部署时要确认前端代理或后端公开 base URL。

## 响应格式

后端主要 REST 响应：

```json
{
  "ok": true,
  "code": 0,
  "data": {},
  "message": "ok"
}
```

部分兼容接口可能只有：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

前端成功判断必须兼容 `ok === true` 和 `code === 0`。当前封装在 `src/api/http.ts` 的 `normalizeResponse` / `unwrapAxiosData`。

## ID 约定

后端数据库内部使用数字 ID，前端兼容层支持字符串 ID：

```text
numeric_id: 1
id: "cam_001"
```

- 页面展示、路由参数、视频流、ROI、runtime、settings、alarms、tasks 兼容接口可以使用字符串 `id`。
- 摄像头启动/停止、更新、删除、测试 RTSP、模型绑定等核心接口优先使用 `numeric_id`。
- `GET /api/cameras` 会同时返回 `id` 和 `numeric_id`；前端类型和映射不要丢掉 `numeric_id`。

## 关键接口地图

### 健康检查和接入顺序

推荐联调顺序：

```text
GET  /api/system/health
GET  /api/cameras
POST /api/cameras/{numeric_id}/start
GET  /stream/cameras/cam_001/mjpeg?annotated=true
GET  /api/runtime/status
GET  /api/cameras/cam_001/roi
POST /api/cameras/cam_001/roi
GET  /api/cameras/cam_001/rule
GET  /api/debug/keypoints?camera_id=cam_001
GET  /api/events
GET  /api/models
```

### 摄像头管理

```text
GET    /api/cameras
POST   /api/cameras
PUT    /api/cameras/{numeric_id}
DELETE /api/cameras/{numeric_id}
POST   /api/cameras/{numeric_id}/test
POST   /api/cameras/{numeric_id}/start
POST   /api/cameras/{numeric_id}/stop
GET    /api/cameras/{numeric_id}/last-result
GET    /api/system/workers
```

后端 detector 枚举：

```text
motion
aruco
yolo
yolo_pose
```

### 视频流和截图

后端当前推荐 MJPEG，不要依赖 HLS，HLS 可能返回占位或 501。

```text
GET /stream/cameras/cam_001/mjpeg
GET /stream/cameras/cam_001/mjpeg?annotated=true&fps=8&quality=80&max_width=1280
GET /stream/cameras/cam_001/snapshot?annotated=true
GET /api/cameras/cam_001/stream-info
```

核心后端路径也可用：

```text
GET /api/cameras/{camera_id}/stream.mjpg?annotated=true&fps=8&quality=80
GET /api/cameras/{numeric_id}/frame.jpg?annotated=true
```

视频流应作为 `<img src="...">` 使用，不要用 axios 拉 MJPEG。截图接口如果 Worker 未启动或无帧，后端可能返回占位图并带 `X-Frame-Placeholder: 1`。

### 实时状态

```text
GET /api/runtime/status
WS  /ws/status
```

运行状态枚举：

```text
RUNNING
IDLE
STOPPED
OFFLINE
UNKNOWN
```

WebSocket `/ws/status` 连接后保持即可，后端约每 2 秒广播一次状态。

### ROI

新后端提供独立 ROI 接口：

```text
GET  /api/cameras/cam_001/roi
POST /api/cameras/cam_001/roi
```

ROI 点位优先使用归一化坐标，`x/y` 范围是 `0..1`；保存时带上当前截图实际 `image_width` / `image_height`。保存 ROI 后后端会递增摄像头 `config_version`，Worker 会热更新，前端最好刷新一次详情数据。

### 设置

```text
GET  /api/settings
POST /api/settings/save
POST /api/settings/apply
POST /api/settings/reset
```

`POST /api/settings/apply` 可以带 `camera_id` 或 `camera_ids`，不带则应用到全部摄像头。

### 规则面板

```text
GET  /api/cameras/{camera_id}/rule
PUT  /api/cameras/{camera_id}/rule
POST /api/cameras/{camera_id}/rule/copy
GET  /api/rule-templates
POST /api/rule-templates
GET  /api/rule-templates/{template_id}
PUT  /api/rule-templates/{template_id}
DELETE /api/rule-templates/{template_id}
POST /api/rule-templates/{template_id}/apply
```

规则面板位于 `src/views/RulesView.vue`，API 封装在 `src/api/settings.ts`。保存摄像头规则只提交 `rule` 和 `tracker`，复制规则只复制 `rule` 和 `tracker`，模板应用走后端模板 apply 接口。保存、复制或应用模板后，后端会递增 `config_version` 并热更新 Worker。

### 关键点调试

```text
GET  /api/debug/keypoints?camera_id=cam_001
POST /api/debug/keypoints/evaluate
POST /api/cameras/{numeric_id}/snapshot
POST /api/cameras/{numeric_id}/debug-detect
POST /api/cameras/{numeric_id}/image-detect
POST /api/cameras/{numeric_id}/image-pair-detect
```

前端需要兼容 `keypoints`、`result.keypoints`、`keypoint_deltas`、`tracker.keypoint_deltas`、`rule_detail.triggered_keypoints` 等字段。

### 模型管理

```text
GET  /api/models
POST /api/models/upload
POST /api/models/register
POST /api/models/bind-camera
POST /api/models/{model_id}/test-image
```

模型上传当前只允许 `.onnx`。绑定模型时 `camera_id` 使用数字 ID。

### 事件和告警

新页面优先接事件中心：

```text
GET /api/events
GET /api/events/summary?days=1
GET /api/events/{event_id}/frames
PUT /api/events/{event_id}/handle
PUT /api/events/{event_id}/false-alarm
PUT /api/events/{event_id}/close
```

已有告警中心概念时可使用兼容接口：

```text
GET /api/alarms?page=1&page_size=20&status=unhandled
PUT /api/alarms/alarm_001/ack
GET /api/alarms/alarm_001/snapshot?annotated=true
```

事件图片 URL 通常是 `/data/...` 相对路径。跨域部署时要拼接后端 base URL，或保证前端代理了 `/data/`。

### 系统和维护

```text
GET  /api/system/health
GET  /api/system/self-check
GET  /api/system/detectors
GET  /api/system/streams
GET  /api/system/storage
GET  /api/system/backups
POST /api/system/backup
POST /api/system/cleanup
```

`POST /api/system/cleanup` 默认应按 `dry_run=true` 处理，前端做危险操作时需要二次确认。

## 前端代码落点

```text
src/api/http.ts        axios 实例、响应归一化、API 日志
src/api/platform.ts    摄像头、dashboard、任务、事件、配置导入导出
src/api/settings.ts    设置、ROI、规则面板、关键点调试
src/api/stream.ts      视频流和截图 URL 封装
src/api/stream.ts      不应使用 axios 拉 MJPEG，只生成 URL
src/mock/              Mock 数据
src/types/             平台和设置类型
src/views/RulesView.vue 规则面板：停机判断、tracker、复制规则、模板
src/utils/logger.ts    浏览器侧运行日志
src/utils/wsStatus.ts  WebSocket 状态工具
```

## 当前适配状态

当前代码已按后端 `FRONTEND_INTEGRATION.md` 做主要迁移：

- Dashboard 使用 `GET /api/runtime/status`，并通过 `/ws/status` 推送触发刷新。
- ROI 使用 `GET/POST /api/cameras/{cam_id}/roi`。
- Settings 使用 `/api/settings`、`/save`、`/apply`、`/reset`。
- 规则面板使用 `/api/cameras/{cam_id}/rule`、`/rule/copy` 和 `/api/rule-templates`。
- 视频优先使用 `/stream/cameras/{cam_id}/mjpeg` 和 `/snapshot`。
- detector 类型对齐 `motion / aruco / yolo / yolo_pose`。
- runtime 状态对齐 `RUNNING / IDLE / STOPPED / OFFLINE / UNKNOWN`。
- 事件处理使用 `/handle`、`/false-alarm`、`/close`。
- 已新增规则面板、模型管理和系统诊断页面。

仍需现场联调确认的点：

- 后端返回字段如果和文档不同，优先在 `src/api/*` 映射层兼容。
- 配置版本页当前仍只接 `/api/config/export` 和 `/api/config/import`，完整版本列表、对比、回滚等需要后端补接口后再落地。
- 登录权限尚未实现；如现场需要，应先确认后端鉴权或网关鉴权方案。

## 开发原则

- 新增真实后端接口时，先更新 `src/types/*`，再更新 `src/api/*` 映射，最后改页面。
- 保留 Mock 模式可运行，真实后端联调用 `VITE_USE_MOCK=false`。
- API 路径在 `src/api/*` 中集中封装，不在 Vue 页面里散写 URL，视频 `<img>` URL 除外也应通过 `src/api/stream.ts` 生成。
- 涉及多路视频时优先用 snapshot 或低 FPS MJPEG，详情页再打开 annotated MJPEG。
- 改摄像头、ROI、模型绑定、settings apply 后，后端会递增 `config_version`，前端应刷新相关摄像头和 runtime 数据。
- 改规则面板的 `rule` / `tracker` 后同样会递增 `config_version`，前端应刷新当前规则和 runtime 数据。
