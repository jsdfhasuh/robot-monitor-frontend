import { reactive, readonly } from 'vue'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
export type LogModule = 'app' | 'api' | 'ws' | 'stream' | 'router' | 'settings' | 'debug' | 'camera' | 'task' | 'alarm' | 'system' | 'keypoint' | 'roi'

export interface FrontendLogItem {
  id: number
  time: string
  timestamp: number
  level: LogLevel
  module: LogModule | string
  message: string
  detail?: unknown
}

const MAX_LOGS = Number(import.meta.env.VITE_FRONTEND_LOG_MAX || 500)
const logs = reactive<FrontendLogItem[]>([])
let seq = 1

function nowText() {
  const d = new Date()
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

function shouldPrint(level: LogLevel) {
  if (import.meta.env.VITE_FRONTEND_LOG_CONSOLE === 'false') return false
  return level !== 'DEBUG' || import.meta.env.DEV
}

function normalizeDetail(detail: unknown) {
  if (!detail) return undefined
  if (detail instanceof Error) {
    return { name: detail.name, message: detail.message, stack: detail.stack }
  }
  return detail
}

export function addLog(level: LogLevel, module: LogModule | string, message: string, detail?: unknown) {
  const item: FrontendLogItem = {
    id: seq++,
    time: nowText(),
    timestamp: Date.now(),
    level,
    module,
    message,
    detail: normalizeDetail(detail)
  }
  logs.unshift(item)
  if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS)

  if (shouldPrint(level)) {
    const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log
    fn(`[${item.time}] [${level}] [${module}] ${message}`, item.detail || '')
  }
}

export const logger = {
  debug: (module: LogModule | string, message: string, detail?: unknown) => addLog('DEBUG', module, message, detail),
  info: (module: LogModule | string, message: string, detail?: unknown) => addLog('INFO', module, message, detail),
  warn: (module: LogModule | string, message: string, detail?: unknown) => addLog('WARN', module, message, detail),
  error: (module: LogModule | string, message: string, detail?: unknown) => addLog('ERROR', module, message, detail),
  clear: () => logs.splice(0),
  exportText: () => logs.map((item) => {
    const detail = item.detail ? `\n  detail: ${safeStringify(item.detail)}` : ''
    return `${new Date(item.timestamp).toISOString()} [${item.level}] [${item.module}] ${item.message}${detail}`
  }).join('\n'),
  exportJson: () => JSON.stringify(logs, null, 2),
  list: readonly(logs)
}

function safeStringify(value: unknown) {
  try { return typeof value === 'string' ? value : JSON.stringify(value) } catch { return String(value) }
}

export function installGlobalErrorLogger() {
  window.addEventListener('error', (event) => {
    logger.error('app', event.message || '页面运行异常', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error instanceof Error ? { message: event.error.message, stack: event.error.stack } : event.error
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('app', '未处理 Promise 异常', event.reason instanceof Error ? event.reason : { reason: event.reason })
  })
}

export function downloadFrontendLogs() {
  const content = logger.exportText() || '暂无前端日志'
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `frontend-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.log`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyFrontendLogs() {
  const content = logger.exportText() || '暂无前端日志'
  await navigator.clipboard.writeText(content)
}
