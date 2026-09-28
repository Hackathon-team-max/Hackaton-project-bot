import { appMode } from "../../config/app";
import { MockApplicationRepository } from "./mock";
import { RealApplicationRepository } from "./real";
import type { ApplicationRepository } from "./types";

export type { ApplicationRepository };
export { MockApplicationRepository, RealApplicationRepository };

/**
 * Фабрика по appMode: preview → localStorage, production → HTTP.
 * Единственное место выбора реализации для заявок (см. config/app.ts).
 */
export function createApplicationRepository(): ApplicationRepository {
  return appMode === "production" ? new RealApplicationRepository() : new MockApplicationRepository();
}

/** Готовый экземпляр — страницы импортируют его напрямую. */
export const applicationRepository: ApplicationRepository = createApplicationRepository();
