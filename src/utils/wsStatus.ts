import { logger } from './logger'

export interface WsStatusClientOptions {
  path?: string
  onMessage?: (data: any) => void
  onFallbackPoll?: () => void
}

export function createStatusWebSocket(options: WsStatusClientOptions = {}) {
  const path = options.path || '/ws/status'
  let ws: WebSocket | null = null
  let reconnectTimer: number | undefined
  let closedByUser = false

  function buildUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${path}`
  }

  function connect() {
    closedByUser = false
    const url = buildUrl()
    logger.info('ws', `连接 WebSocket：${path}`)
    ws = new WebSocket(url)

    ws.onopen = () => logger.info('ws', `WebSocket 已连接：${path}`)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        logger.debug('ws', '收到状态推送', data)
        options.onMessage?.(data)
      } catch {
        logger.warn('ws', '收到非 JSON 状态推送', { data: event.data })
      }
    }
    ws.onerror = () => logger.error('ws', `WebSocket 异常：${path}`)
    ws.onclose = () => {
      logger.warn('ws', `WebSocket 已断开：${path}`)
      ws = null
      if (!closedByUser) {
        options.onFallbackPoll?.()
        reconnectTimer = window.setTimeout(connect, 3000)
      }
    }
  }

  function close() {
    closedByUser = true
    if (reconnectTimer) window.clearTimeout(reconnectTimer)
    ws?.close()
    ws = null
    logger.info('ws', `WebSocket 主动关闭：${path}`)
  }

  return { connect, close }
}
