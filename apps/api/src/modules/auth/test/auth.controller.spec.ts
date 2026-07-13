import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { UserRole } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            adminLogin: jest.fn().mockResolvedValue({ tokens: { accessToken: 'token' } }),
            requestOtp: jest.fn().mockResolvedValue({ message: 'sent' }),
            verifyOtp: jest.fn().mockResolvedValue({ tokens: { accessToken: 'token' } }),
            refreshToken: jest.fn().mockResolvedValue({ accessToken: 'new-token' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('adminLogin', () => {
    it('should call authService.adminLogin', async () => {
      const dto = { email: 'admin@pms.com', password: 'password' };
      const res = await controller.adminLogin(dto);
      expect(service.adminLogin).toHaveBeenCalledWith(dto);
      expect(res).toHaveProperty('tokens');
    });
  });

  describe('requestOtp', () => {
    it('should call authService.requestOtp', async () => {
      const dto = { email: 'landlord@pms.com', role: UserRole.LANDLORD };
      const res = await controller.requestOtp(dto);
      expect(service.requestOtp).toHaveBeenCalledWith(dto);
      expect(res.message).toBe('sent');
    });
  });
});
