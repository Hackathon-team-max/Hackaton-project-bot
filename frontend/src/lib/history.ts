import type { DocumentItem } from "../api/types";

const KEY = "max_tasks_history";

export interface HistoryEntry {
  taskId: string;
  serviceId: string;
  serviceTitle: string;
  createdAt: number;
}

export function addHistory(entry: HistoryEntry): void {
  const list = getHistory();
  if (list.some((e) => e.taskId === entry.taskId)) return;
  list.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

// --- Заявки (подача в вуз): чеклист документов ---
// Бэкенда для заявок пока нет, поэтому хранение локальное (заглушка).

const APP_KEY = "max_applications";

export interface ApplicationItem {
  title: string;
  description: string | null;
  url: string | null;
  /** Обязательный документ (mandatory) — заявка готова, когда все отмечены */
  required: boolean;
  done: boolean;
}

export interface Application {
  taskId: string;
  universityId: string;
  universityName: string;
  title: string;
  createdAt: number;
  items: ApplicationItem[];
}

export function makeApplication(
  uniId: string,
  uniName: string,
  title: string,
  mandatory: DocumentItem[],
  additional: DocumentItem[]
): Application {
  return {
    taskId: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    universityId: uniId,
    universityName: uniName,
    title,
    createdAt: Date.now(),
    items: [
      ...mandatory.map((d) => ({ ...d, required: true, done: false })),
      ...additional.map((d) => ({ ...d, required: false, done: false })),
    ],
  };
}

export function getApplications(): Application[] {
  try {
    return JSON.parse(localStorage.getItem(APP_KEY) || "[]") as Application[];
  } catch {
    return [];
  }
}

export function getApplication(id: string): Application | undefined {
  return getApplications().find((a) => a.taskId === id);
}

/** Сохраняет заявку (upsert по taskId), возвращает обновлённый список */
export function saveApplication(app: Application): Application[] {
  const list = getApplications();
  const idx = list.findIndex((a) => a.taskId === app.taskId);
  if (idx >= 0) list[idx] = app;
  else list.unshift(app);
  const next = list.slice(0, 50);
  try {
    localStorage.setItem(APP_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function applicationProgress(app: Application): {
  done: number;
  total: number;
  progress: number;
  finished: boolean;
} {
  const total = app.items.length;
  const done = app.items.filter((i) => i.done).length;
  const requiredLeft = app.items.filter((i) => i.required && !i.done).length;
  return {
    done,
    total,
    progress: total ? Math.round((done / total) * 100) : 0,
    finished: total > 0 && requiredLeft === 0,
  };
}
