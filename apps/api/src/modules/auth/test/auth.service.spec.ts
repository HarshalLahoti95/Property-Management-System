import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { OtpService } from '../otp.service';
import { PrismaService } from '../../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let otpService: OtpService;

  const mockUser = {
    id: 'user-1',
    email: 'admin@pms.com',
    fullName: 'Admin User',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    deletedAt: null,
    passwordCredential: {
      passwordHash: 'hashed-password',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            generateOtp: jest.fn(),
            verifyOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    otpService = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('adminLogin', () => {
    it('should successfully authenticate admin and return tokens', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.adminLogin({
        email: 'admin@pms.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe('admin@pms.com');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.adminLogin({
          email: 'admin@pms.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestOtp', () => {
    const mockTenant = {
      id: 'user-tenant',
      email: 'tenant@pms.com',
      fullName: 'Tenant User',
      role: UserRole.TENANT,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    };

    it('should generate OTP and return success message', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockTenant as any);
      jest.spyOn(otpService, 'generateOtp').mockResolvedValue(undefined);

      const result = await service.requestOtp({
        email: 'tenant@pms.com',
        role: UserRole.TENANT,
      });

      expect(result.message).toContain('One-Time Password has been successfully generated');
      expect(otpService.generateOtp).toHaveBeenCalledWith(mockTenant.id);
    });

    it('should throw NotFoundException if user role mismatch or not found', async () => {
      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      await expect(
        service.requestOtp({
          email: 'nonexistent@pms.com',
          role: UserRole.TENANT,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
