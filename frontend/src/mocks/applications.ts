import type { Application } from "../api/types";

/**
 * Seed-данные preview-режима: одна существующая заявка,
 * чтобы главная страница не была пустой без подачи формы.
 * Документы к этой заявке НЕ хранятся здесь — тянутся из real API
 * GET /api/universities/bmstu/documents по universityId.
 */
export const PREVIEW_APPLICATIONS: Application[] = [
  {
    id: "preview-bauman-001",
    universityId: "bmstu",
    universityName: "МГТУ им. Н.Э. Баумана",
    title: "Документы для поступления",
    status: "submitted",
    submittedAt: "2026-06-20T12:00:00.000Z",
    checkedDocuments: [],
  },
];
