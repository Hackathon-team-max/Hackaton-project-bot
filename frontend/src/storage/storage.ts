/** Ключи localStorage preview-режима. Не смешивать production-данные. */
export const STORAGE_KEYS = {
  /** Заявки (подача документов в вуз) — preview-репозиторий. */
  applications: "max_preview_applications",
  /** Устаревший ключ заявок (до внедрения repository layer) — для миграции. */
  legacyApplications: "max_applications",
  /** Вузы для админки — preview-репозиторий. */
  universities: "max_preview_universities",
  /** История задач (легаси-строки на главной). */
  taskHistory: "max_tasks_history",
  /** Кастомные услуги админа. */
  customServices: "max_custom_services",
} as const;

/** Безопасно прочитать JSON из localStorage (при ошибке — fallback). */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Безопасно записать JSON в localStorage (переполнение — молча игнорируем). */
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded / unavailable storage */
  }
}
