/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del backend desplegado (vacío en dev: Vite proxea /api). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
