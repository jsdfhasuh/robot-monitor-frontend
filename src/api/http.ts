import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'

export interface ApiResponse<T> {
  ok: boolean
  data: T
  message?: string
}

export interface NormalizedResponse<T> {
  success: boolean
  data: T
  message: string
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000)
})

type RequestMeta = { startAt?: number }
type RequestConfigWithMeta = InternalAxiosRequestConfig & { metadata?: RequestMeta }

http.interceptors.request.use((config: RequestConfigWithMeta) => {
  config.metadata = { startAt: Date.now() }
  const method = (config.method || 'GET').toUpperCase()
  logger.info('api', `${method} ${config.url} 请求开始`, { params: config.params })
  return config
})

http.interceptors.response.use((response) => {
  const config = response.config as RequestConfigWithMeta
  const cost = config.metadata?.startAt ? Date.now() - config.metadata.startAt : undefined
  const method = (config.method || 'GET').toUpperCase()
  const normalized = normalizeResponse(response.data)
  const detail = { status: response.status, cost_ms: cost, message: normalized.message }
  if (normalized.success) logger.info('api', `${method} ${config.url} 请求成功`, detail)
  else logger.warn('api', `${method} ${config.url} 业务失败`, detail)
  return response
}, (error: AxiosError) => {
  const config = error.config as RequestConfigWithMeta | undefined
  const method = (config?.method || 'GET').toUpperCase()
  const cost = config?.metadata?.startAt ? Date.now() - config.metadata.startAt : undefined
  logger.error('api', `${method} ${config?.url || 'unknown'} 请求异常`, {
    status: error.response?.status,
    cost_ms: cost,
    message: error.message,
    response: error.response?.data
  })
  return Promise.reject(error)
})

export function normalizeResponse<T = any>(res: any): NormalizedResponse<T> {
  if (res && typeof res === 'object' && 'ok' in res) {
    return {
      success: res.ok === true,
      data: res.data as T,
      message: res.message || ''
    }
  }

  if (res && typeof res === 'object' && 'code' in res) {
    return {
      success: res.code === 0,
      data: res.data as T,
      message: res.message || ''
    }
  }

  return {
    success: true,
    data: res as T,
    message: ''
  }
}

export function unwrapResponse<T = any>(res: any): T {
  const normalized = normalizeResponse<T>(res)
  if (!normalized.success) {
    throw new Error(normalized.message || '接口请求失败')
  }
  return normalized.data
}

export function unwrapAxiosData<T = any>(axiosResponse: { data: any }): T {
  return unwrapResponse<T>(axiosResponse.data)
}
