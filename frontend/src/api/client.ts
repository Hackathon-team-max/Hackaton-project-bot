import type { Service, ServiceDetail, Task, UserResponse, UserProfile, DocumentsResponse } from "./types";
import { mockServices, mockServiceDetails, mockTask, updateMockTask } from "./mocks";
import { getCustomServices, getCustomService } from "../lib/serviceStore";

const API_BASE = import.meta.env.BACKEND_URL || "";

export class ApiError extends Error {
  status: number;
  userMessage: string;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.userMessage = message;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      let msg = `Сервер вернул ошибку ${res.status}`;
      try {
        const data = await res.json();
        msg = data?.message || data?.error || msg;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, msg);
    }
    if (res.status === 204) return undefined as T;
    const data = (await res.json()) as T;
    // Бэкенд может вернуть {"error": "..."} и с 200-м статусом
    if (data && typeof data === "object" && "error" in data) {
      const err = (data as { error?: unknown }).error;
      if (typeof err === "string" && err) throw new ApiError(res.status, err);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") throw new ApiError(408, "Сервер не отвечает, попробуйте позже");
    throw new ApiError(0, "Не удалось связаться с сервером. Проверьте соединение");
  } finally {
    clearTimeout(timer);
  }
}

// --- Реальные эндпоинты бэкенда ---

/** GET /api/ping */
export async function ping(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/ping");
}

/** GET /api/user/:userId — данные пользователя или { exists: false } */
export async function fetchUser(userId: number): Promise<UserResponse> {
  return apiFetch<UserResponse>(`/api/user/${encodeURIComponent(String(userId))}`);
}

/** POST /api/user/profile — сохранение профиля в БД */
export async function saveProfile(profile: UserProfile): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/user/profile", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

/** GET /api/universities/:uniId/documents — документы для поступления */
export async function fetchUniversityDocuments(uniId: string): Promise<DocumentsResponse> {
  return apiFetch<DocumentsResponse>(`/api/universities/${encodeURIComponent(uniId)}/documents`);
}

// --- API (заглушки до появления соответствующих эндпоинтов) ---

export async function fetchServices(): Promise<Service[]> {
  let list: Service[];
  try {
    list = await apiFetch<Service[]>("/api/services");
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 0)) list = mockServices();
    else throw err;
  }
  // Услуги, добавленные через админ-панель (заглушка на localStorage)
  const custom = getCustomServices();
  return [...custom.filter((c) => !list.some((s) => s.id === c.id)), ...list];
}

export async function fetchService(id: string): Promise<ServiceDetail> {
  const custom = getCustomService(id);
  if (custom) return custom;
  try {
    return await apiFetch<ServiceDetail>(`/api/services/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 0)) {
      const detail = mockServiceDetails()[id];
      if (detail) return detail;
      throw new ApiError(404, "Услуга не найдена");
    }
    throw err;
  }
}

export async function createTask(serviceId: string, formData: Record<string, unknown>): Promise<Task> {
  try {
    return await apiFetch<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ serviceId, data: formData }),
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 0)) return mockTask(serviceId, formData);
    throw err;
  }
}

export async function getTask(id: string): Promise<Task> {
  try {
    return await apiFetch<Task>(`/api/tasks/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 0)) return updateMockTask(id);
    throw err;
  }
}

export async function confirmAction(taskId: string, actionId: string): Promise<Task> {
  try {
    return await apiFetch<Task>(`/api/tasks/${taskId}/actions/${encodeURIComponent(actionId)}`, { method: "POST" });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 0)) return updateMockTask(taskId, actionId);
    throw err;
  }
}
