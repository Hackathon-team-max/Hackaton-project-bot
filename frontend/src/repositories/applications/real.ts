import { apiGet, apiPost, apiPut } from "../../api/client";
import type { Application, SubmitApplicationRequest } from "../../api/types";
import type { ApplicationRepository } from "./types";

/**
 * Production: заявки через backend API.
 * Endpoint'ы /api/applications на бэкенде ещё не реализованы —
 * клиент получит ApiError с понятным сообщением (404 от backend),
 * fallback на mock отсутствует намеренно (выбор реализации — см. ./index.ts).
 */
export class RealApplicationRepository implements ApplicationRepository {
  async getApplications(): Promise<Application[]> {
    return apiGet<Application[]>("/api/applications");
  }

  async getApplication(id: string): Promise<Application> {
    return apiGet<Application>(`/api/applications/${encodeURIComponent(id)}`);
  }

  async submitApplication(data: SubmitApplicationRequest): Promise<Application> {
    return apiPost<Application>("/api/applications", data);
  }

  async updateApplication(id: string, checkedDocuments: string[]): Promise<Application> {
    return apiPut<Application>(`/api/applications/${encodeURIComponent(id)}`, { checkedDocuments });
  }
}
