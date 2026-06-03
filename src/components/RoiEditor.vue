<template>
  <div class="roi-editor" ref="wrapRef" :style="editorStyle">
    <img ref="imageRef" class="scene" :src="resolvedImageUrl" @load="onImageLoad" @error="imageLoadError = true" />
    <div v-if="imageLoadError" class="snapshot-error">
      <div>后端截图加载失败</div>
      <small>请确认 /stream/cameras/{{ cameraId || 'camera_id' }}/snapshot 可访问</small>
    </div>
    <canvas ref="canvasRef" class="overlay" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="dragging = null" @dblclick="finishCurrentRoi" />
    <div class="video-toolbar">{{ cameraLabel }} ｜ {{ imageSizeText }}</div>
    <div class="legend">
      <div><span style="background:#3b82f6"></span> 静止(≤2px)</div>
      <div><span style="background:#22c55e"></span> 轻微(2-5px)</div>
      <div><span style="background:#f59e0b"></span> 中等(5-10px)</div>
      <div><span style="background:#ef4444"></span> 剧烈(&gt;10px)</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { RoiConfig, Point } from '../types/settings'
import { getSnapshotUrl } from '../api/stream'

const props = defineProps<{
  rois: RoiConfig[]
  activeRoiId: string
  cameraLabel: string
  cameraId?: string
  snapshotUrl?: string
  debug?: boolean
}>()
const emit = defineEmits<{
  'update:rois': [value: RoiConfig[]]
  'image-size': [value: { width: number; height: number }]
}>()

const wrapRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const imageRef = ref<HTMLImageElement>()
const fallbackImageUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#0f172a"/>
  <text x="52" y="72" fill="#e2e8f0" font-family="Arial" font-size="32" font-weight="700">Backend Snapshot Placeholder</text>
  <g opacity=".35" stroke="#94a3b8" stroke-width="2"><path d="M0 180 H1280 M0 360 H1280 M0 540 H1280 M160 0 V720 M320 0 V720 M480 0 V720 M640 0 V720 M800 0 V720 M960 0 V720 M1120 0 V720"/></g>
  <g fill="none" stroke="#facc15" stroke-width="8" opacity=".75"><path d="M150 70 V660 M1040 70 V660 M150 70 H1040 M150 660 H1040"/></g>
  <g>
    <ellipse cx="610" cy="650" rx="150" ry="32" fill="#111827"/>
    <rect x="510" y="560" width="190" height="80" rx="18" fill="#e5e7eb" stroke="#94a3b8" stroke-width="4"/>
    <circle cx="605" cy="545" r="62" fill="#f8fafc" stroke="#94a3b8" stroke-width="6"/>
    <path d="M600 510 C560 410 560 310 650 240" stroke="#f8fafc" stroke-width="82" stroke-linecap="round" fill="none"/>
    <path d="M650 240 C760 190 870 215 940 285" stroke="#f8fafc" stroke-width="72" stroke-linecap="round" fill="none"/>
    <path d="M940 285 C1000 345 1015 425 970 500" stroke="#f8fafc" stroke-width="54" stroke-linecap="round" fill="none"/>
  </g>
</svg>`)
const imageLoadError = ref(false)
const naturalWidth = ref(1280)
const naturalHeight = ref(720)
const resolvedImageUrl = computed(() => props.snapshotUrl || (props.cameraId ? getSnapshotUrl(props.cameraId) : fallbackImageUrl))
const editorStyle = computed(() => ({ aspectRatio: `${naturalWidth.value} / ${naturalHeight.value}` }))
const imageSizeText = computed(() => `${naturalWidth.value} × ${naturalHeight.value}`)
const dragging = ref<{ roiId: string; pointIndex: number } | null>(null)

function onImageLoad() {
  const img = imageRef.value
  imageLoadError.value = false
  if (img?.naturalWidth && img?.naturalHeight) {
    naturalWidth.value = img.naturalWidth
    naturalHeight.value = img.naturalHeight
    emit('image-size', { width: img.naturalWidth, height: img.naturalHeight })
  }
  nextTick(syncSize)
}

function syncSize() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  const rect = wrap.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  draw()
}

function toCanvasPoint(p: Point): Point {
  const c = canvasRef.value!
  return { x: p.x * c.width, y: p.y * c.height }
}
function toNormPoint(x: number, y: number): Point {
  const c = canvasRef.value!
  return { x: Number((x / c.width).toFixed(4)), y: Number((y / c.height).toFixed(4)) }
}
function cloneRois() { return props.rois.map(r => ({ ...r, points: r.points.map(p => ({ ...p })), keypoint_indexes: [...r.keypoint_indexes] })) }

function draw() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, c.width, c.height)
  props.rois.forEach((roi) => {
    if (!roi.enabled || roi.points.length === 0) return
    const pts = roi.points.map(toCanvasPoint)
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
    if (pts.length > 2) ctx.closePath()
    ctx.strokeStyle = roi.color
    ctx.fillStyle = roi.color + '30'
    ctx.lineWidth = roi.id === props.activeRoiId ? 4 : 2
    ctx.fill()
    ctx.stroke()
    ctx.font = '14px Arial'
    ctx.fillStyle = roi.color
    ctx.fillRect(pts[0].x + 8, pts[0].y + 8, 88, 28)
    ctx.fillStyle = '#fff'
    ctx.fillText(roi.name, pts[0].x + 16, pts[0].y + 27)
    pts.forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = roi.color; ctx.stroke()
    })
  })
  drawKeypoints(ctx, c.width, c.height)
}

function drawKeypoints(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const keypoints = [
    { x: .46, y: .30, id: 'kp1', color: '#2563eb' },
    { x: .64, y: .24, id: 'kp2', color: '#2563eb' },
    { x: .75, y: .37, id: 'kp3', color: '#22c55e' },
    { x: .78, y: .57, id: 'kp4', color: '#f59e0b' },
    { x: .49, y: .61, id: 'kp5', color: '#64748b' },
    { x: .51, y: .77, id: 'kp6', color: '#64748b' }
  ]
  keypoints.forEach((kp, idx) => {
    const x = kp.x * w; const y = kp.y * h
    if (props.debug) {
      ctx.beginPath(); ctx.moveTo(x - 38, y - 8); ctx.lineTo(x - 24, y - 4); ctx.lineTo(x - 14, y - 1); ctx.strokeStyle = kp.color; ctx.lineWidth = 3; ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fillStyle = kp.color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(idx + 1), x, y)
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '12px Arial'; ctx.fillText(kp.id, x + 14, y - 10)
  })
}

function pointNear(x: number, y: number) {
  for (const roi of props.rois) for (let i = 0; i < roi.points.length; i++) {
    const p = toCanvasPoint(roi.points[i])
    if (Math.hypot(p.x - x, p.y - y) < 12) return { roiId: roi.id, pointIndex: i }
  }
  return null
}
function eventPoint(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}
function onMouseDown(e: MouseEvent) {
  const { x, y } = eventPoint(e)
  const hit = pointNear(x, y)
  if (hit) { dragging.value = hit; return }
  const rois = cloneRois()
  const active = rois.find(r => r.id === props.activeRoiId)
  if (!active) return
  active.points.push(toNormPoint(x, y))
  emit('update:rois', rois)
}
function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return
  const { x, y } = eventPoint(e)
  const rois = cloneRois()
  const roi = rois.find(r => r.id === dragging.value!.roiId)
  if (!roi) return
  roi.points[dragging.value.pointIndex] = toNormPoint(x, y)
  emit('update:rois', rois)
}
function onMouseUp() { dragging.value = null }
function finishCurrentRoi() { draw() }

watch(() => [props.rois, props.activeRoiId, props.debug], () => nextTick(draw), { deep: true })
watch(() => resolvedImageUrl.value, () => { imageLoadError.value = false; nextTick(syncSize) })
onMounted(() => { syncSize(); window.addEventListener('resize', syncSize) })
onUnmounted(() => window.removeEventListener('resize', syncSize))
</script>

<style scoped>
.roi-editor { position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; border-radius: 10px; background: #111827; border: 1px solid #d1d5db; }
.scene, .overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.scene { object-fit: contain; background: #111827; }
.overlay { cursor: crosshair; }
.legend { position: absolute; left: 12px; bottom: 12px; background: rgba(0,0,0,.56); color: #fff; border-radius: 8px; padding: 8px 10px; font-size: 12px; line-height: 1.8; }
.legend span { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.snapshot-error { position:absolute; inset:0; display:grid; place-items:center; color:#fff; text-align:center; background:rgba(15,23,42,.72); font-weight:700; z-index:2; }
.snapshot-error small { display:block; opacity:.8; margin-top:6px; font-weight:400; }
</style>
