/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_TARGET?: string;
  readonly VITE_PORT?: string;
  /** Режим приложения: "preview" | "production" (см. config/app.ts). */
  readonly VITE_APP_MODE?: string;
  // URL бэкенда, без префикса VITE_
  readonly BACKEND_URL?: string;
  // FIXME(security): пароль админ-панели уходит в бандл клиентa —
  // заменить на серверную авторизацию, без префикса VITE_
  readonly ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
