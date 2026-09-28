import type { Application } from "../api/types";
import { readJson, writeJson, STORAGE_KEYS } from "./storage";

/**
 * Персистенция заявок preview-режима (localStorage).
 * Формат Application — см. api/types.ts; легаси-формат (max_applications)
 * мигрируется в новый ключ при первом чтении.
 */

/** Прочитать заявки, мигрировав легаси-данные при необходимости. */
export function readApplications(): Application[] {
  const list = readJson<Application[]>(STORAGE_KEYS.applications, []);
  const legacy = readJson<unknown[]>(STORAGE_KEYS.legacyApplications, []);

  if (legacy.length === 0) return list;
  if (list.length > 0) return list; // миграция уже выполнена

  const migrated = legacy.map(migrateLegacyEntry).filter((a): a is Application => a !== null);
  const merged = [...migrated, ...list];
  writeJson(STORAGE_KEYS.applications, merged);
  return merged;
}

export function writeApplications(list: Application[]): void {
  writeJson(STORAGE_KEYS.applications, list.slice(0, 50));
}

interface LegacyApplication {
  taskId: string;
  universityId: string;
  universityName: string;
  title: string;
  createdAt: number;
  items?: { title?: string; done?: boolean }[];
}

/** Старый формат (checklist с items) → новый (id + checkedDocuments). */
function migrateLegacyEntry(raw: unknown): Application | null {
  const entry = raw as Partial<LegacyApplication>;
  if (!entry || typeof entry.taskId !== "string") return null;
  return {
    id: entry.taskId,
    universityId: entry.universityId ?? "",
    universityName: entry.universityName ?? "",
    title: entry.title ?? "Заявка",
    status: "submitted",
    submittedAt: new Date(entry.createdAt ?? Date.now()).toISOString(),
    checkedDocuments: (entry.items ?? [])
      .filter((i) => i.done && typeof i.title === "string")
      .map((i) => i.title as string),
  };
}
