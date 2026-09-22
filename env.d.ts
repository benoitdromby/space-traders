/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SpaceTraders API. Public: never put secrets in a VITE_* variable. */
  readonly VITE_API_BASE_URL?: string
  /** Public path the app is served from. */
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
