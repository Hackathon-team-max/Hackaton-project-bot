export type FieldType = "text" | "tel" | "textarea" | "select";

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface ServiceDetail extends Service {
  steps: string[];
  fields: FieldSchema[];
}

export type ActionStatus = "pending" | "active" | "done" | "error";

export interface TaskAction {
  id: string;
  title: string;
  status: ActionStatus;
  link?: string;
  needsUser?: boolean;
  errorMessage?: string;
}

export type TaskStatusValue = "running" | "success" | "error";

export interface Task {
  id: string;
  serviceId: string;
  status: TaskStatusValue;
  progress: number;
  actions: TaskAction[];
  resultMessage?: string;
  fileUrl?: string;
  errorMessage?: string;
}

// --- Бэкенд: профиль пользователя (GET /api/user/:userId, POST /api/user/profile) ---

export interface UserProfile {
  user_id: number;
  full_name: string;
  address: string;
  snils: string;
  email: string;
  passport: string;
  university_id: string;
}

export type UserResponse =
  | ({ exists: true } & UserProfile)
  | { exists: false; user_id: number };

// --- Бэкенд: документы вуза (GET /api/universities/:uniId/documents) ---

export interface DocumentItem {
  title: string;
  description: string | null;
  url: string | null;
}

export interface DocumentsResponse {
  title: string;
  university_id: string;
  university_name: string;
  description: string;
  mandatory: DocumentItem[];
  additional: DocumentItem[];
}

// --- Вуз (админ CRUD, repository layer) ---

export interface University {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}


// --- Заявка на поступление (repository layer: preview — localStorage, production — HTTP) ---

export type ApplicationStatus = "draft" | "submitted";

/**
 * Заявка на поступление. НЕ хранит документы — чеклист документов
 * собирается из реального API по universityId (см. repositories/documents).
 * Хранит только состояние отмеченных документов (checkedDocuments — заголовки).
 */
export interface Application {
  id: string;
  universityId: string;
  universityName: string;
  title: string;
  status: ApplicationStatus;
  /** ISO-строка даты подачи. */
  submittedAt: string;
  /** Заголовки отмеченных (пройденных) документов чеклиста. */
  checkedDocuments: string[];
}

export interface SubmitApplicationRequest {
  universityId: string;
  universityName: string;
  title: string;
}


