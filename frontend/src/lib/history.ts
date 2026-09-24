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
