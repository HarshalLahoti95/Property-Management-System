import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from '../document.service';
import { DocumentRepository } from '../document.repository';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentCategory, UserRole } from '@prisma/client';
import { BadRequestException, ConflictException, ForbiddenException, MethodNotAllowedException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('DocumentService', () => {
  let service: DocumentService;
  let repository: DocumentRepository;
  let prisma: PrismaService;
  let storageProvider: any;

  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const tenantUser = { id: 'tenant-1', role: UserRole.TENANT };

  const mockDocument = {
    id: 'doc-1',
    fileName: 'lease.pdf',
    fileSize: 1024,
    fileType: 'application/pdf',
    storageUrl: 'lease-agreement/doc-1.pdf',
    hash: 'hash-abc',
    category: DocumentCategory.LEASE_AGREEMENT,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    previousDocumentId: null,
    leaseDocuments: [{ lease: { unit: { property: { landlordId: 'landlord-1' } } } }],
  };

  beforeEach(async () => {
    storageProvider = {
      uploadFile: jest.fn().mockResolvedValue('uploaded-path'),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('content')),
      generatePresignedUrl: jest.fn().mockResolvedValue('http://presigned-url'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: DocumentRepository,
          useValue: {
            findDocumentById: jest.fn().mockResolvedValue(mockDocument),
            findDocuments: jest.fn().mockResolvedValue([mockDocument]),
            countDocuments: jest.fn().mockResolvedValue(1),
            findHistoryChain: jest.fn().mockResolvedValue([mockDocument]),
          },
        },
        {
          provide: 'StorageProvider',
          useValue: storageProvider,
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((cb) => cb(prisma)),
            document: {
              findUnique: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(mockDocument),
              update: jest.fn(),
            },
            leaseDocument: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
            userDocument: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
            workOrderDocument: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
            paymentDocument: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
            lease: {
              findFirst: jest.fn().mockResolvedValue({ id: 'lease-1' }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
    repository = module.get<DocumentRepository>(DocumentRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should reject file exceeding 10MB limit', async () => {
      await expect(
        service.upload(
          {
            buffer: Buffer.from('large'),
            originalname: 'file.pdf',
            mimetype: 'application/pdf',
            size: 15 * 1024 * 1024,
          },
          DocumentCategory.LEASE_AGREEMENT,
          landlordUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload to storage, then write metadata', async () => {
      const file = {
        buffer: Buffer.from('data'),
        originalname: 'lease.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const result = await service.upload(file, DocumentCategory.LEASE_AGREEMENT, landlordUser);

      expect(storageProvider.uploadFile).toHaveBeenCalled();
      expect(prisma.document.create).toHaveBeenCalled();
      expect(result).toEqual(mockDocument);
    });

    it('should invoke storage compensating delete if DB transaction fails', async () => {
      jest.spyOn(prisma.document, 'create').mockRejectedValueOnce(new Error('DB Error'));

      const file = {
        buffer: Buffer.from('data'),
        originalname: 'lease.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      await expect(
        service.upload(file, DocumentCategory.LEASE_AGREEMENT, landlordUser),
      ).rejects.toThrow(BadRequestException);

      expect(storageProvider.deleteFile).toHaveBeenCalledWith('uploaded-path');
    });
  });

  describe('download', () => {
    it('should generate pre-signed URL for authorized user', async () => {
      const result = await service.download('doc-1', landlordUser);
      expect(storageProvider.generatePresignedUrl).toHaveBeenCalledWith(mockDocument.storageUrl, 3600);
      expect(result.downloadUrl).toBe('http://presigned-url');
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const unauthorizedDoc = {
        ...mockDocument,
        leaseDocuments: [{ lease: { unit: { property: { landlordId: 'other-landlord' } } } }],
      };
      jest.spyOn(repository, 'findDocumentById').mockResolvedValueOnce(unauthorizedDoc as any);

      await expect(service.download('doc-1', landlordUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should prevent deletion of legal documents like Lease Agreements', async () => {
      await expect(service.remove('doc-1', landlordUser)).rejects.toThrow(MethodNotAllowedException);
    });
  });
});
