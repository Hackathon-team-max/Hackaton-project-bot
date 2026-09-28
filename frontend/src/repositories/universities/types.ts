import type { University } from "../../api/types";

/** Контракт репозитория вузов (админ CRUD + навигация). */
export interface UniversityRepository {
  getUniversities(): Promise<University[]>;
  getUniversity(id: string): Promise<University>;
  createUniversity(data: Omit<University, "id"> & { id: string }): Promise<University>;
  updateUniversity(id: string, data: Partial<Omit<University, "id">>): Promise<University>;
  deleteUniversity(id: string): Promise<void>;
}
