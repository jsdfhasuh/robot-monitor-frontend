const MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export type BackendVideoMode = 'mjpeg' | 'snapshot'

const mockSnapshot = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f2937"/><stop offset="1" stop-color="#0f172a"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".28"/></filter>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <g opacity=".38" stroke="#94a3b8" stroke-width="2"><path d="M0 180 H1280 M0 360 H1280 M0 540 H1280 M160 0 V720 M320 0 V720 M480 0 V720 M640 0 V720 M800 0 V720 M960 0 V720 M1120 0 V720"/></g>
  <g fill="#334155"><rect x="30" y="80" width="160" height="520" rx="10"/><rect x="1060" y="120" width="150" height="480" rx="10"/><rect x="760" y="120" width="240" height="60" rx="8"/><rect x="710" y="560" width="320" height="70" rx="8"/></g>
  <g fill="none" stroke="#facc15" stroke-width="8" opacity=".75"><path d="M150 70 V660 M1040 70 V660 M150 70 H1040 M150 660 H1040"/></g>
  <g filter="url(#shadow)">
    <ellipse cx="610" cy="650" rx="150" ry="32" fill="#111827"/>
    <rect x="510" y="560" width="190" height="80" rx="18" fill="#e5e7eb" stroke="#94a3b8" stroke-width="4"/>
    <circle cx="605" cy="545" r="62" fill="#f8fafc" stroke="#94a3b8" stroke-width="6"/>
    <path d="M600 510 C560 410 560 310 650 240" stroke="#f8fafc" stroke-width="82" stroke-linecap="round" fill="none"/>
    <path d="M650 240 C760 190 870 215 940 285" stroke="#f8fafc" stroke-width="72" stroke-linecap="round" fill="none"/>
    <path d="M940 285 C1000 345 1015 425 970 500" stroke="#f8fafc" stroke-width="54" stroke-linecap="round" fill="none"/>
    <circle cx="650" cy="240" r="44" fill="#e5e7eb" stroke="#94a3b8" stroke-width="6"/><circle cx="940" cy="285" r="40" fill="#e5e7eb" stroke="#94a3b8" stroke-width="6"/><circle cx="970" cy="500" r="34" fill="#e5e7eb" stroke="#94a3b8" stroke-width="6"/>
    <path d="M945 520 L900 590 M980 520 L1030 585" stroke="#cbd5e1" stroke-width="14" stroke-linecap="round"/>
  </g>
  <text x="52" y="52" fill="#e2e8f0" font-family="Arial" font-size="28" font-weight="700">Backend MJPEG / frame.jpg Placeholder</text>
</svg>`)

export function backendPath(path: string) {
  const base = import.meta.env.VITE_BACKEND_PUBLIC_BASE || ''
  return `${base}${path}`
}

export function getCameraStreamUrl(cameraId: string | number, annotated = false, fps = 8, quality = 80) {
  if (MOCK) return mockSnapshot
  return backendPath(`/stream/cameras/${cameraId}/mjpeg?annotated=${annotated}&fps=${fps}&quality=${quality}`)
}

export function getCameraFrameUrl(cameraId: string | number, annotated = false) {
  if (MOCK) return mockSnapshot
  return backendPath(`/stream/cameras/${cameraId}/snapshot?annotated=${annotated}&t=${Date.now()}`)
}

export function getMjpegStreamUrl(cameraId: string | number) {
  return getCameraStreamUrl(cameraId, false)
}

export function getAnnotatedMjpegStreamUrl(cameraId: string | number) {
  return getCameraStreamUrl(cameraId, true)
}

export function getSnapshotUrl(cameraId: string | number) {
  return getCameraFrameUrl(cameraId, false)
}

export function getAnnotatedSnapshotUrl(cameraId: string | number) {
  return getCameraFrameUrl(cameraId, true)
}

export function getHlsStreamUrl(_cameraId: string | number) {
  return ''
}

export function getStreamInfoUrl(cameraId: string | number) {
  return backendPath(`/api/cameras/${cameraId}/stream-info`)
}

export function getCoreCameraStreamUrl(cameraId: string | number, annotated = false, fps = 8, quality = 80) {
  if (MOCK) return mockSnapshot
  return backendPath(`/api/cameras/${cameraId}/stream.mjpg?annotated=${annotated}&fps=${fps}&quality=${quality}`)
}

export function getCoreCameraFrameUrl(cameraId: string | number, annotated = false) {
  if (MOCK) return mockSnapshot
  return backendPath(`/api/cameras/${cameraId}/frame.jpg?annotated=${annotated}&t=${Date.now()}`)
}
