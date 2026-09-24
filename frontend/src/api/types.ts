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
