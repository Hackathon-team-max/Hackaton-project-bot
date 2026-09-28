import { ApiError } from "./errors";

export { ApiError } from "./errors";

/**
 * Базовый URL backend API.
 * В dev-режиме используется прокси Vite: запросы /api/* уходят на BACKEND_URL.
 * В продакшене обычно задаётся пустая строка — тот же origin, что и у Mini App.
 */
const API_BASE = import.meta.env.BACKEND_URL || "";

/**
 * Время ожидания HTTP-ответа по умолчанию, мс.
 * Как и на бэкенде (read timeout 5s), чтобы фронт не зависал при упавшем сервере.
 */
const DEFAULT_TIMEOUT_MS = 8000;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Минимальная обёртка над fetch для backend API.
 *
 * Единственная задача — HTTP:
 * - преобразование network/timeout/HTTP-ошибок в ApiError с кодом и сообщением для UI;
 * - НЕ содержит fallback на mock и бизнес-логику — это решают слои repositories
 *   (preview vs production, см. config/app.ts и repositories/%/index.ts).
 */
async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const requestInit: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    signal: controller.signal,
  };
  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, requestInit);
  } catch (error) {
    // Network error или abort по таймауту
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "Сервер не отвечает. Проверьте соединение и повторите попытку.");
    }
    throw new ApiError(0, "Не удалось связаться с сервером. Повторите попытку позже.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const status = response.status;
    let message = "Сервер вернул ошибку. Повторите попытку позже.";
    try {
      const payload = (await response.json()) as { message?: string; error?: string };
      if (payload?.message) message = payload.message;
      else if (payload?.error) message = payload.error;
    } catch {
      // Ответ без JSON body — оставляем сообщение по умолчанию
    }
    if (status === 401 || status === 403) {
      message = "Нет доступа к операции. Проверьте учётные данные.";
    } else if (status === 404) {
      message = "Данные не найдены. Возможно, запись удалена или ещё не создана.";
    } else if (status >= 500) {
      message = "Сервис временно недоступен. Повторите попытку позже.";
    }
    throw new ApiError(status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(0, "Сервер вернул некорректный ответ. Обратитесь в поддержку.");
  }
}


/** GET-запрос к API. */
export function apiGet<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

/** POST-запрос к API. */
export function apiPost<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "POST", body });
}

/** PUT-запрос к API. */
export function apiPut<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "PUT", body });
}

/** DELETE-запрос к API. */
export function apiDelete<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}
