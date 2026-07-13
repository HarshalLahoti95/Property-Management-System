import { apiClient } from '@/lib/api-client';
import { Document, DocumentVersion, DocumentAttachment } from '../types';
import { AttachDocumentFormValues } from '../schemas';

export const documentService = {
  async getDocuments(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<{
      data: Document[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/documents', { params });
    return data;
  },

  async getDocument(id: string) {
    const { data } = await apiClient.get<Document>(`/documents/${id}`);
    return (data as any)?.data || data;
  },

  async uploadDocument(file: File, category: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const { data } = await apiClient.post<Document>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async uploadVersion(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<DocumentVersion>(`/documents/${id}/version`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async getDownloadUrl(id: string) {
    const { data } = await apiClient.get<{ downloadUrl: string }>(`/documents/${id}/download`);
    return (data as any)?.data || data;
  },

  async attachDocument(id: string, values: AttachDocumentFormValues) {
    const { data } = await apiClient.post<DocumentAttachment>(`/documents/${id}/attach`, values);
    return data;
  },

  async detachDocument(id: string, values: AttachDocumentFormValues) {
    const { data } = await apiClient.delete<void>(`/documents/${id}/attach`, {
      data: values,
    });
    return data;
  },

  async getDocumentHistory(id: string) {
    const { data } = await apiClient.get<DocumentVersion[]>(`/documents/${id}/history`);
    return (data as any)?.data || data;
  },

  async deleteDocument(id: string) {
    const { data } = await apiClient.delete<void>(`/documents/${id}`);
    return data;
  },
};
