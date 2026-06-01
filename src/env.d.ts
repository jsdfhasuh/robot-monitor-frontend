/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCK?: string
  readonly VITE_BACKEND_PUBLIC_BASE?: string
  readonly VITE_DEFAULT_STREAM_TYPE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly VITE_BACKEND_PUBLIC_BASE?: string
  readonly VITE_DEFAULT_STREAM_TYPE?: string
}
