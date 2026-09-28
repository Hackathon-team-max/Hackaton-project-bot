import { ApiError } from "../../api/errors";
import type { University } from "../../api/types";
import { PREVIEW_UNIVERSITIES } from "../../mocks/universities";
import { readJson, writeJson, STORAGE_KEYS } from "../../storage/storage";
import type { UniversityRepository } from "./types";

/** Preview: вузы в localStorage; при первом обращении записывается seed. */
export class MockUniversityRepository implements UniversityRepository {
  private load(): University[] {
    const list = readJson<University[]>(STORAGE_KEYS.universities, []);
    if (list.length > 0) return list;
    writeJson(STORAGE_KEYS.universities, PREVIEW_UNIVERSITIES);
    return [...PREVIEW_UNIVERSITIES];
  }

  async getUniversities(): Promise<University[]> {
    return this.load();
  }

  async getUniversity(id: string): Promise<University> {
    const uni = this.load().find((u) => u.id === id);
    if (!uni) throw new ApiError(404, "Вуз не найден.");
    return uni;
  }

  async createUniversity(data: Omit<University, "id"> & { id: string }): Promise<University> {
    const list = this.load();
    if (list.some((u) => u.id === data.id)) {
      throw new ApiError(400, `Вуз с id «${data.id}» уже существует.`);
    }
    const uni: University = data;
    list.push(uni);
    writeJson(STORAGE_KEYS.universities, list);
    return uni;
  }

  async updateUniversity(id: string, data: Partial<Omit<University, "id">>): Promise<University> {
    const list = this.load();
    const idx = list.findIndex((u) => u.id === id);
    if (idx < 0) throw new ApiError(404, "Вуз не найден.");
    list[idx] = { ...list[idx], ...data };
    writeJson(STORAGE_KEYS.universities, list);
    return list[idx];
  }

  async deleteUniversity(id: string): Promise<void> {
    const list = this.load();
    const next = list.filter((u) => u.id !== id);
    if (next.length === list.length) throw new ApiError(404, "Вуз не найден.");
    writeJson(STORAGE_KEYS.universities, next);
  }
}
