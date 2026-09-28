import { ApiError } from "../../api/errors";
import type { Application, SubmitApplicationRequest } from "../../api/types";
import { PREVIEW_APPLICATIONS } from "../../mocks/applications";
import { readApplications, writeApplications } from "../../storage/applications";
import type { ApplicationRepository } from "./types";

/** Preview: заявки в localStorage; при первом обращении записывается seed. */
export class MockApplicationRepository implements ApplicationRepository {
  private load(): Application[] {
    const list = readApplications();
    if (list.length > 0) return list;
    writeApplications(PREVIEW_APPLICATIONS);
    return [...PREVIEW_APPLICATIONS];
  }

  async getApplications(): Promise<Application[]> {
    return this.load();
  }

  async getApplication(id: string): Promise<Application> {
    const app = this.load().find((a) => a.id === id);
    if (!app) throw new ApiError(404, "Заявка не найдена.");
    return app;
  }

  async submitApplication(data: SubmitApplicationRequest): Promise<Application> {
    const app: Application = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      universityId: data.universityId,
      universityName: data.universityName,
      title: data.title,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      checkedDocuments: [],
    };
    const list = this.load();
    list.unshift(app);
    writeApplications(list);
    return app;
  }

  async updateApplication(id: string, checkedDocuments: string[]): Promise<Application> {
    const list = this.load();
    const idx = list.findIndex((a) => a.id === id);
    if (idx < 0) throw new ApiError(404, "Заявка не найдена.");
    list[idx] = { ...list[idx], checkedDocuments };
    writeApplications(list);
    return list[idx];
  }
}
