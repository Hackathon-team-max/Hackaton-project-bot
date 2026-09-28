import { apiGet } from "../../api/client";
import type { DocumentsResponse } from "../../api/types";

/**
 * Документы вуза — всегда реальный API (GET /api/universities/:uniId/documents),
 * в том числе в Preview: чеклист заявки не хранит документы локально,
 * чтобы не дублировать данные бэкенда.
 */
export interface DocumentRepository {
  getDocuments(uniId: string): Promise<DocumentsResponse>;
}

export class RealDocumentRepository implements DocumentRepository {
  async getDocuments(uniId: string): Promise<DocumentsResponse> {
    return apiGet<DocumentsResponse>(`/api/universities/${encodeURIComponent(uniId)}/documents`);
  }
}

export const documentRepository: DocumentRepository = new RealDocumentRepository();
