/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TARGET?: string;
  readonly VITE_PORT?: string;
  // URL бэкенда, без префикса VITE_
  readonly BACKEND_URL?: string;
  // Пароль админ-панели, без префикса VITE_
  readonly ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
