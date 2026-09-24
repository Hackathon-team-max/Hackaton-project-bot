import type { ServiceDetail } from "../api/types";

// Заглушка: хранилище услуг, добавленных через админ-панель (localStorage).
// Когда появится БД/API — заменить на запросы к нему.
const KEY = "max_custom_services";

export function getCustomServices(): ServiceDetail[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ServiceDetail[];
  } catch {
    /* ignore */
  }
  return [];
}

function setCustomServices(list: ServiceDetail[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getCustomService(id: string): ServiceDetail | undefined {
  return getCustomServices().find((s) => s.id === id);
}

export function upsertCustomService(service: ServiceDetail): void {
  const list = getCustomServices();
  const idx = list.findIndex((s) => s.id === service.id);
  if (idx >= 0) list[idx] = service;
  else list.push(service);
  setCustomServices(list);
}

export function removeCustomService(id: string): void {
  setCustomServices(getCustomServices().filter((s) => s.id !== id));
}