import type { Application, SubmitApplicationRequest } from "../../api/types";

/**
 * Контракт репозитория заявок. Preview и Production реализуют один интерфейс,
 * страницы не знают, откуда данные приходят.
 */
export interface ApplicationRepository {
  /** Список заявок текущего пользователя. */
  getApplications(): Promise<Application[]>;
  /** Одна заявка по id; бросает ApiError(404), если не найдена. */
  getApplication(id: string): Promise<Application>;
  /** Подать новую заявку. */
  submitApplication(data: SubmitApplicationRequest): Promise<Application>;
  /** Обновить состояние чеклиста (checkedDocuments) заявки. */
  updateApplication(id: string, checkedDocuments: string[]): Promise<Application>;
}
