import { apiDelete, apiGet, apiPost, apiPut } from "../../api/client";
import type { University } from "../../api/types";
import type { UniversityRepository } from "./types";

/**
 * Production: вузы через backend API (/api/universities — планируемый endpoint).
 * До его появления backend вернёт 404 и пользователь увидит понятную ошибку;
 * fallback на mock намеренно отсутствует.
 */
export class RealUniversityRepository implements UniversityRepository {
  async getUniversities(): Promise<University[]> {
    return apiGet<University[]>("/api/universities");
  }

  async getUniversity(id: string): Promise<University> {
    return apiGet<University>(`/api/universities/${encodeURIComponent(id)}`);
  }

  async createUniversity(data: Omit<University, "id"> & { id: string }): Promise<University> {
    return apiPost<University>("/api/universities", data);
  }

  async updateUniversity(id: string, data: Partial<Omit<University, "id">>): Promise<University> {
    return apiPut<University>(`/api/universities/${encodeURIComponent(id)}`, data);
  }

  async deleteUniversity(id: string): Promise<void> {
    await apiDelete<void>(`/api/universities/${encodeURIComponent(id)}`);
  }
}