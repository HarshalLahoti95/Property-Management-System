import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, MethodNotAllowedException, Inject } from '@nestjs/common';
import { DocumentRepository } from './document.repository';
import { CreateDocumentAttachmentDto, AttachmentEntityType } from './dto/create-document-attachment.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { StorageProvider } from './interfaces/storage-provider.interface';
import { PrismaService } from '../../database/prisma.service';
import { Document, DocumentCategory, UserRole, LeaseDocument, UserDocument, WorkOrderDocument } from '@prisma/client';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB limit

  private readonly storageProvider: StorageProvider;

  constructor(
    private readonly documentRepository: DocumentRepository,
    @Inject('StorageProvider') storageProvider: any,
    private readonly prisma: PrismaService,
  ) {
    this.storageProvider = storageProvider;
  }

  /**
   * Uploads a document out-of-transaction, creates metadata inside a transaction,
   * and runs compensating deletes if the database commit fails.
   */
  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    category: DocumentCategory,
    user: { id: string; role: string },
  ): Promise<Document> {
    // 1. File size validation
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds the maximum limit of 10MB.');
    }

    // 2. Calculate SHA-256 hash for deduplication
    const hash = createHash('sha256').update(file.buffer).digest('hex');

    // Check duplicate hash
    const duplicate = await this.prisma.document.findUnique({
      where: { hash },
    });
    if (duplicate && duplicate.deletedAt === null) {
      throw new ConflictException('A document with the exact same file content already exists.');
    }

    // 3. Determine unique storage path
    const fileExtension = file.originalname.split('.').pop() || '';
    const storagePath = `${category.toLowerCase()}/${randomUUID()}.${fileExtension}`;

    // 4. Upload to storage (Outside DB transaction)
    let storageUrl: string;
    try {
      storageUrl = await this.storageProvider.uploadFile(file.buffer, storagePath, file.mimetype);
    } catch (err) {
      throw new BadRequestException(`Failed to upload file to storage: ${(err as Error).message}`);
    }

    // 5. Insert metadata into DB within interactive transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        return tx.document.create({
          data: {
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            storageUrl,
            hash,
            category,
          },
        });
      });
    } catch (dbErr) {
      // COMPENSATING ACTION: Delete file from storage if DB write fails
      try {
        await this.storageProvider.deleteFile(storageUrl);
      } catch (deleteErr) {
        // Log delete failure but throw original database error
        console.error(`Compensating action failed: could not delete file ${storageUrl}`, deleteErr);
      }
      throw new BadRequestException(`Database write failed. Compensating action triggered. Error: ${(dbErr as Error).message}`);
    }
  }

  /**
   * Creates a new version of an existing document, linking it via previousDocumentId.
   */
  async uploadVersion(
    parentDocumentId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    user: { id: string; role: string },
  ): Promise<Document> {
    const parentDoc = await this.documentRepository.findDocumentById(parentDocumentId);
    if (!parentDoc) {
      throw new NotFoundException(`Parent document with ID ${parentDocumentId} not found.`);
    }

    // Authorization checks
    await this.validateDocumentPermissions(parentDoc, user);

    // Validate size limit
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds the maximum limit of 10MB.');
    }

    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const fileExtension = file.originalname.split('.').pop() || '';
    const storagePath = `${parentDoc.category.toLowerCase()}/${randomUUID()}.${fileExtension}`;

    // Upload file
    let storageUrl: string;
    try {
      storageUrl = await this.storageProvider.uploadFile(file.buffer, storagePath, file.mimetype);
    } catch (err) {
      throw new BadRequestException(`Failed to upload file to storage: ${(err as Error).message}`);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create new document version
        const newVersion = await tx.document.create({
          data: {
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            storageUrl,
            hash,
            category: parentDoc.category,
            previousDocumentId: parentDocumentId,
          },
        });

        // Replicate all attachments from parent to new version
        const leaseDocs = await tx.leaseDocument.findMany({ where: { documentId: parentDocumentId } });
        for (const ld of leaseDocs) {
          await tx.leaseDocument.create({ data: { leaseId: ld.leaseId, documentId: newVersion.id, purpose: ld.purpose } });
        }

        const userDocs = await tx.userDocument.findMany({ where: { documentId: parentDocumentId } });
        for (const ud of userDocs) {
          await tx.userDocument.create({ data: { userId: ud.userId, documentId: newVersion.id } });
        }

        const workDocs = await tx.workOrderDocument.findMany({ where: { documentId: parentDocumentId } });
        for (const wd of workDocs) {
          await tx.workOrderDocument.create({ data: { workOrderId: wd.workOrderId, documentId: newVersion.id } });
        }

        return newVersion;
      });
    } catch (dbErr) {
      // COMPENSATING ACTION
      await this.storageProvider.deleteFile(storageUrl);
      throw new BadRequestException(`Database write failed. Compensating action triggered. Error: ${(dbErr as Error).message}`);
    }
  }

  /**
   * Streams a document file directly after verifying access permissions.
   */
  async stream(id: string, user: { id: string; role: string }): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found.`);
    }

    await this.validateDocumentPermissions(document, user);

    const buffer = await this.storageProvider.downloadFile(document.storageUrl);

    return {
      buffer,
      mimeType: document.fileType,
      fileName: document.fileName,
    };
  }

  /**
   * Retrieves detail of a single document record.
   */
  async findOne(id: string, user: { id: string; role: string }): Promise<Document> {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found.`);
    }
    await this.validateDocumentPermissions(document, user);
    return document;
  }

  /**
   * Generates a temporary secure pre-signed download URL after verifying access permissions.
   */
  async download(id: string, user: { id: string; role: string }): Promise<{ downloadUrl: string }> {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found.`);
    }

    await this.validateDocumentPermissions(document, user);

    const expirySeconds = 3600; // 1 hour link expiry
    const downloadUrl = await this.storageProvider.generatePresignedUrl(document.storageUrl, expirySeconds);

    return { downloadUrl };
  }

  /**
   * Links a document to a target business entity.
   */
  async attach(
    documentId: string,
    dto: CreateDocumentAttachmentDto,
    user: { id: string; role: string },
  ): Promise<any> {
    const document = await this.documentRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found.`);
    }

    await this.validateDocumentPermissions(document, user);

    // Validate attachment targets exist
    return this.prisma.$transaction(async (tx) => {
      switch (dto.entityType) {
        case AttachmentEntityType.LEASE:
          if (!dto.purpose) {
            throw new BadRequestException('A document purpose is required when attaching to a lease.');
          }
          const lease = await tx.lease.findFirst({ where: { id: dto.entityId, deletedAt: null } });
          if (!lease) throw new NotFoundException(`Lease with ID ${dto.entityId} not found.`);
          return tx.leaseDocument.create({ data: { leaseId: dto.entityId, documentId, purpose: dto.purpose } });

        case AttachmentEntityType.USER:
          const userObj = await tx.user.findFirst({ where: { id: dto.entityId, deletedAt: null } });
          if (!userObj) throw new NotFoundException(`User with ID ${dto.entityId} not found.`);
          return tx.userDocument.create({ data: { userId: dto.entityId, documentId } });

        case AttachmentEntityType.WORK_ORDER:
          const workOrder = await tx.workOrder.findFirst({ where: { id: dto.entityId, deletedAt: null } });
          if (!workOrder) throw new NotFoundException(`Work order with ID ${dto.entityId} not found.`);
          return tx.workOrderDocument.create({ data: { workOrderId: dto.entityId, documentId } });
      }
    });
  }

  /**
   * Removes a document link from a target business entity.
   */
  async detach(
    documentId: string,
    dto: CreateDocumentAttachmentDto,
    user: { id: string; role: string },
  ): Promise<any> {
    const document = await this.documentRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found.`);
    }

    await this.validateDocumentPermissions(document, user);

    return this.prisma.$transaction(async (tx) => {
      switch (dto.entityType) {
        case AttachmentEntityType.LEASE:
          return tx.leaseDocument.delete({ where: { leaseId_documentId: { leaseId: dto.entityId, documentId } } });

        case AttachmentEntityType.USER:
          return tx.userDocument.delete({ where: { userId_documentId: { userId: dto.entityId, documentId } } });

        case AttachmentEntityType.WORK_ORDER:
          return tx.workOrderDocument.delete({ where: { workOrderId_documentId: { workOrderId: dto.entityId, documentId } } });
      }
    });
  }

  /**
   * Retrieves chronological version lineage chain.
   */
  async findHistory(id: string, user: { id: string; role: string }): Promise<Document[]> {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found.`);
    }

    await this.validateDocumentPermissions(document, user);
    return this.documentRepository.findHistoryChain(id);
  }

  /**
   * Lists/filters documents.
   */
  async findAll(
    query: DocumentQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: Document[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (query.page - 1) * query.limit;
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;
    const tenantId = user.role === UserRole.TENANT ? user.id : undefined;

    const searchParams = {
      skip,
      take: query.limit,
      category: query.category,
      landlordId,
      tenantId,
    };

    const [data, total] = await Promise.all([
      this.documentRepository.findDocuments(searchParams),
      this.documentRepository.countDocuments(searchParams),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  /**
   * Soft deletes a document (throws MethodNotAllowedException if category is LEASE_AGREEMENT or RECEIPT).
   */
  async remove(id: string, user: { id: string; role: string }): Promise<Document> {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found.`);
    }

    await this.validateDocumentPermissions(document, user);

    // Enforce legal document immutability
    if (document.category === DocumentCategory.LEASE_AGREEMENT || document.category === DocumentCategory.RECEIPT) {
      throw new MethodNotAllowedException('Legal documents (Lease Agreements, Receipts) are immutable and cannot be deleted.');
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.document.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  // ==========================================
  // HELPER AND SCORING PROCEDURES
  // ==========================================

  private async validateDocumentPermissions(document: Document & any, user: { id: string; role: string }): Promise<void> {
    if (user.role === UserRole.ADMIN) return;

    // Check if the user is linked via any of the document attachment records
    let isAuthorized = false;

    if (user.role === UserRole.LANDLORD) {
      // Scopes check: check if the document is linked to properties owned by this landlord
      const linkedToLandlordLease = document.leaseDocuments?.some(
        (ld: any) => ld.lease.unit.landlordId === user.id,
      );
      const linkedToLandlordWorkOrder = document.workOrderDocuments?.some(
        (wd: any) => wd.workOrder.unit?.landlordId === user.id || (!wd.workOrder.unitId && wd.workOrder.property.units.some((u: any) => u.landlordId === user.id)),
      );

      if (linkedToLandlordLease || linkedToLandlordWorkOrder) {
        isAuthorized = true;
      }
    } else if (user.role === UserRole.TENANT) {
      // Scopes check: check if document belongs to tenant leases/user/payments
      const linkedToTenantLease = document.leaseDocuments?.some((ld: any) =>
        ld.lease.leaseTenants?.some((lt: any) => lt.tenantId === user.id && (lt.status === 'ACTIVE' || lt.status === 'PENDING')),
      );
      const linkedToTenantUser = document.userDocuments?.some((ud: any) => ud.userId === user.id);
      const linkedToTenantWorkOrder = document.workOrderDocuments?.some((wd: any) =>
        wd.workOrder.unit?.leases.some((l: any) =>
          l.leaseTenants.some((lt: any) => lt.tenantId === user.id && lt.status === 'ACTIVE')
        ),
      );

      if (linkedToTenantLease || linkedToTenantUser || linkedToTenantWorkOrder) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException('You do not have access permissions for this document resource.');
    }
  }
}
