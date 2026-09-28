import { apiGet } from "../../api/client";
import type { Service } from "../../api/types";
import { appMode } from "../../config/app";
import { mockServices } from "../../mocks/services";
import { getCustomServices } from "../../lib/serviceStore";

/**
 * Каталог услуг (админка).
 * Preview: кастомные услуги админа + демо-каталог, без обращения к API.
 * Production: кастомные услуги админа + backend /api/services;
 * при отсутствии endpoint'а (404) — ApiError с понятным сообщением, без mock-fallback.
 */
export async function getServices(): Promise<Service[]> {
  const customServices = getCustomServices();

  if (appMode === "preview") {
    return [...customServices, ...mockServices()];
  }

  const services = await apiGet<Service[]>("/api/services");
  if (!Array.isArray(services)) {
    throw new Error("Сервис каталога услуг вернул некорректный ответ.");
  }
  return [...customServices, ...services];
}
