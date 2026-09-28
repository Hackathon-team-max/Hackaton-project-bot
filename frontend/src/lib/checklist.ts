import type { Application, DocumentsResponse } from "../api/types";

/**
 * Сборка чеклиста заявки: документы — из реального API (docs),
 * состояние отмеченных — из заявки (checkedDocuments).
 */
export interface ChecklistItem {
  title: string;
  description: string | null;
  url: string | null;
  required: boolean;
  done: boolean;
}

export function buildChecklist(app: Application, docs: DocumentsResponse): ChecklistItem[] {
  const checked = new Set(app.checkedDocuments);
  return [
    ...docs.mandatory.map((d) => ({ ...d, required: true, done: checked.has(d.title) })),
    ...docs.additional.map((d) => ({ ...d, required: false, done: checked.has(d.title) })),
  ];
}

/** Прогресс чеклиста: готов, когда отмечены все обязательные. */
export function applicationProgress(items: ChecklistItem[]): {
  done: number;
  total: number;
  progress: number;
  finished: boolean;
} {
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  const requiredLeft = items.filter((i) => i.required && !i.done).length;
  return {
    done,
    total,
    progress: total ? Math.round((done / total) * 100) : 0,
    finished: total > 0 && requiredLeft === 0,
  };
}
