export type DocumentCategory =
  | 'LEASE_AGREEMENT'
  | 'GOVERNMENT_ID'
  | 'INVOICE'
  | 'RECEIPT'
  | 'DAMAGE_PHOTO'
  | 'OTHER';

export type AttachmentEntityType = 'LEASE' | 'USER' | 'WORK_ORDER' | 'PAYMENT';

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface DocumentAttachment {
  id: string;
  documentId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  attachedById: string;
  attachedAt: string;
  attachedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface Document {
  id: string;
  category: DocumentCategory;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  versions?: DocumentVersion[];
  attachments?: DocumentAttachment[];
}
