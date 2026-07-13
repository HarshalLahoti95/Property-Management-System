import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from '../notification.controller';
import { NotificationService } from '../notification.service';
import { UserRole } from '@prisma/client';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockUser = { id: 'user-1', role: UserRole.LANDLORD };
  const mockHistory = { id: 'log-1', recipient: 'user@example.com' };
  const mockPreferences = { userId: 'user-1', emailEnabled: true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ data: [mockHistory], meta: {} }),
            findOne: jest.fn().mockResolvedValue(mockHistory),
            getPreferences: jest.fn().mockResolvedValue(mockPreferences),
            updatePreferences: jest.fn().mockResolvedValue(mockPreferences),
            sendTestNotification: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should invoke findAll service method', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query, mockUser);
      expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
      expect(result.data).toEqual([mockHistory]);
    });
  });

  describe('getPreferences', () => {
    it('should invoke getPreferences service method', async () => {
      const result = await controller.getPreferences(mockUser);
      expect(service.getPreferences).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('findOne', () => {
    it('should invoke findOne service method', async () => {
      const result = await controller.findOne('log-1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('log-1', mockUser);
      expect(result).toEqual(mockHistory);
    });
  });

  describe('updatePreferences', () => {
    it('should invoke updatePreferences service method', async () => {
      const dto = { emailEnabled: false };
      const result = await controller.updatePreferences(dto, mockUser);
      expect(service.updatePreferences).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('sendTestNotification', () => {
    it('should invoke sendTestNotification service method', async () => {
      const result = await controller.sendTestNotification('test@example.com', mockUser);
      expect(service.sendTestNotification).toHaveBeenCalledWith('user-1', 'test@example.com');
      expect(result).toEqual({ success: true });
    });
  });
});
