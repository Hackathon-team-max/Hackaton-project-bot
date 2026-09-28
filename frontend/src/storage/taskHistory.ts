import { readJson, writeJson, STORAGE_KEYS } from "./storage";

/** Легаси-строки истории задач на главной (localStorage, без бэкенда). */
export interface HistoryEntry {
  taskId: string;
  serviceId: string;
  serviceTitle: string;
  createdAt: number;
}

/** Добавить запись в историю (дедупликация по taskId, максимум 50). */
export function addHistory(entry: HistoryEntry): void {
  const list = getHistory();
  if (list.some((e) => e.taskId === entry.taskId)) return;
  list.unshift(entry);
  writeJson(STORAGE_KEYS.taskHistory, list.slice(0, 50));
}

export function getHistory(): HistoryEntry[] {
  return readJson<HistoryEntry[]>(STORAGE_KEYS.taskHistory, []);
}
