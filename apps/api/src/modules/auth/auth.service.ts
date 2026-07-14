import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { OtpService } from './otp.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { passwordCredential: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('User is not an administrator');
    }

    if (!user.passwordCredential) {
      throw new UnauthorizedException('No password credential configured for this administrator');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordCredential.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
    };
  }

  async requestOtp(dto: RequestOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        role: dto.role,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User with specified email and role not found.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    await this.otpService.generateOtp(user.id);

    return {
      message: 'One-Time Password has been successfully generated and sent to console logs.',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        role: dto.role,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User with specified email and role not found.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is not active');
    }

    await this.otpService.verifyOtp(user.id, dto.code);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.type !== 'refresh') {
        throw new BadRequestException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
        throw new UnauthorizedException('User is no longer active or exists');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const refreshPayload = { sub: userId, type: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(refreshPayload, { expiresIn: '7d' }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
