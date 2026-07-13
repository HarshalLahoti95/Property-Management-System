import { Test, TestingModule } from '@nestjs/testing';
import { DocumentController } from '../document.controller';
import { DocumentService } from '../document.service';
import { UserRole } from '@prisma/client';

describe('DocumentController', () => {
  let controller: DocumentController;
  let service: DocumentService;

  const mockUser = { id: 'user-1', role: UserRole.LANDLORD };
  const mockDocument = { id: 'doc-1', fileName: 'contract.pdf' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        {
          provide: DocumentService,
          useValue: {
            upload: jest.fn().mockResolvedValue(mockDocument),
            findAll: jest.fn().mockResolvedValue({ data: [mockDocument], meta: {} }),
            findOne: jest.fn().mockResolvedValue(mockDocument),
            download: jest.fn().mockResolvedValue({ downloadUrl: 'http://pre-signed-url' }),
            uploadVersion: jest.fn().mockResolvedValue({ ...mockDocument, version: 2 }),
            attach: jest.fn().mockResolvedValue({ success: true }),
            detach: jest.fn().mockResolvedValue({ success: true }),
            findHistory: jest.fn().mockResolvedValue([mockDocument]),
            remove: jest.fn().mockResolvedValue(mockDocument),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
    service = module.get<DocumentService>(DocumentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('upload', () => {
    it('should invoke upload service method', async () => {
      const file = { buffer: Buffer.from('data'), originalname: 'contract.pdf' };
      const category = 'OTHER' as any;
      const result = await controller.upload(file, category, mockUser);
      expect(service.upload).toHaveBeenCalledWith(file, category, mockUser);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('findOne', () => {
    it('should invoke findOne service method', async () => {
      const result = await controller.findOne('doc-1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('doc-1', mockUser);
      expect(result).toEqual(mockDocument);
    });
  });

  describe('findAll', () => {
    it('should invoke findAll service method', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query, mockUser);
      expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
      expect(result.data).toEqual([mockDocument]);
    });
  });

  describe('download', () => {
    it('should invoke download service method', async () => {
      const result = await controller.download('doc-1', mockUser);
      expect(service.download).toHaveBeenCalledWith('doc-1', mockUser);
      expect(result.downloadUrl).toBe('http://pre-signed-url');
    });
  });

  describe('uploadVersion', () => {
    it('should invoke uploadVersion service method', async () => {
      const file = { buffer: Buffer.from('data'), originalname: 'contract.pdf' };
      const result = await controller.uploadVersion('doc-1', file, mockUser);
      expect(service.uploadVersion).toHaveBeenCalledWith('doc-1', file, mockUser);
      expect((result as any).version).toBe(2);
    });
  });

  describe('attach', () => {
    it('should invoke attach service method', async () => {
      const dto = { entityType: 'LEASE' as any, entityId: 'lease-1' };
      const result = await controller.attach('doc-1', dto, mockUser);
      expect(service.attach).toHaveBeenCalledWith('doc-1', dto, mockUser);
      expect(result).toEqual({ success: true });
    });
  });

  describe('detach', () => {
    it('should invoke detach service method', async () => {
      const dto = { entityType: 'LEASE' as any, entityId: 'lease-1' };
      const result = await controller.detach('doc-1', dto, mockUser);
      expect(service.detach).toHaveBeenCalledWith('doc-1', dto, mockUser);
      expect(result).toEqual({ success: true });
    });
  });

  describe('findHistory', () => {
    it('should invoke findHistory service method', async () => {
      const result = await controller.findHistory('doc-1', mockUser);
      expect(service.findHistory).toHaveBeenCalledWith('doc-1', mockUser);
      expect(result).toEqual([mockDocument]);
    });
  });
});
