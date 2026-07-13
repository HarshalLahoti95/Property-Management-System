/* eslint-disable */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/document.service';
import { documentKeys } from './documentKeys';
import { Document, DocumentVersion, DocumentAttachment } from '../types';
import { AttachDocumentFormValues } from '../schemas';

interface DocumentsResponse {
  data: Document[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useDocuments(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => documentService.getDocuments(filters),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentService.getDocument(id),
    enabled: !!id,
  });
}

export function useDocumentHistory(id: string) {
  return useQuery({
    queryKey: documentKeys.history(id),
    queryFn: () => documentService.getDocumentHistory(id),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) =>
      documentService.uploadDocument(file, category),
    onMutate: async ({ file, category }) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

      const queryCache = queryClient.getQueryCache().getAll();
      const previousListsData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'document' && entry.queryKey[1] === 'list') {
          previousListsData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);
          const oldData = queryClient.getQueryData<DocumentsResponse>(entry.queryKey);
          if (oldData && Array.isArray(oldData.data)) {
            const tempDoc: Document = {
              id: 'temp-doc-' + Date.now(),
              category: category as any,
              fileName: file.name,
              fileKey: 'temp',
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              uploadedById: 'temp-uploader',
              parentId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            queryClient.setQueryData(entry.queryKey, {
              ...oldData,
              data: [tempDoc, ...oldData.data],
            });
          }
        }
      });

      return { previousListsData };
    },
    onError: (err, variables, context) => {
      if (context?.previousListsData) {
        context.previousListsData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useUploadDocumentVersion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file }: { file: File }) => documentService.uploadVersion(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.history(id) });
    },
  });
}

export function useAttachDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AttachDocumentFormValues) => documentService.attachDocument(id, values),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.detail(id) });

      const previousDetail = queryClient.getQueryData<Document>(documentKeys.detail(id));
      if (previousDetail) {
        const tempAttach: DocumentAttachment = {
          id: 'temp-attach-' + Date.now(),
          documentId: id,
          entityType: values.entityType,
          entityId: values.entityId,
          attachedById: 'temp-author',
          attachedAt: new Date().toISOString(),
          attachedBy: {
            id: 'temp-author',
            fullName: 'Current User',
            email: '',
          },
        };
        queryClient.setQueryData<Document>(documentKeys.detail(id), {
          ...previousDetail,
          attachments: [...(previousDetail.attachments || []), tempAttach],
        });
      }

      return { previousDetail };
    },
    onError: (err, values, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(documentKeys.detail(id), context.previousDetail);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
    },
  });
}

export function useDetachDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AttachDocumentFormValues) => documentService.detachDocument(id, values),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.detail(id) });

      const previousDetail = queryClient.getQueryData<Document>(documentKeys.detail(id));
      if (previousDetail) {
        queryClient.setQueryData<Document>(documentKeys.detail(id), {
          ...previousDetail,
          attachments: (previousDetail.attachments || []).filter(
            (a) => !(a.entityType === values.entityType && a.entityId === values.entityId)
          ),
        });
      }

      return { previousDetail };
    },
    onError: (err, values, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(documentKeys.detail(id), context.previousDetail);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) });
    },
  });
}
