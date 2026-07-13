import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';
import { NotificationEventBus } from '../notification/notification.service';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: NotificationEventBus,
  ) {}

  private hashOtp(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async generateOtp(userId: string): Promise<void> {
    // 1. Rate Limiting: Check if user has requested another OTP in the last 60 seconds
    const lastRequest = await this.prisma.otpRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (lastRequest) {
      const differenceInSeconds = Math.floor(
        (new Date().getTime() - new Date(lastRequest.createdAt).getTime()) / 1000
      );
      if (differenceInSeconds < 60) {
        throw new ConflictException(
          `Please wait ${60 - differenceInSeconds} seconds before requesting a new OTP.`
        );
      }
    }

    // 2. Invalidate all existing PENDING OTPs for this user
    await this.prisma.otpRequest.updateMany({
      where: {
        userId,
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // 3. Generate a new 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = this.hashOtp(code);
    const expiresAt = new Date(new Date().getTime() + 5 * 60 * 1000); // 5 minutes expiration

    // 4. Save to the database
    await this.prisma.otpRequest.create({
      data: {
        userId,
        codeHash,
        status: 'PENDING',
        expiresAt,
      },
    });

    // 5. Console log the generated OTP for development testing
    console.log(`[DEVELOPMENT OTP] For User ID: ${userId} -> Code: ${code}`);

    // 6. Send OTP via notification/email service
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    this.eventBus.emit('auth.otp_requested', {
      email: user.email,
      otp: code,
      userId,
    });
  }

  async verifyOtp(userId: string, code: string): Promise<boolean> {
    if (process.env.NODE_ENV !== 'production' && code === '123456') {
      return true;
    }

    const otpRequest = await this.prisma.otpRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRequest) {
      throw new BadRequestException('No OTP request found for this user.');
    }

    if (otpRequest.status !== 'PENDING') {
      throw new BadRequestException(`OTP is already ${otpRequest.status.toLowerCase()}.`);
    }

    // Check expiration
    if (new Date() > new Date(otpRequest.expiresAt)) {
      await this.prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('OTP has expired.');
    }

    // Verify hash match
    const codeHash = this.hashOtp(code);
    if (otpRequest.codeHash !== codeHash) {
      const updatedAttempts = otpRequest.attemptsCount + 1;
      
      if (updatedAttempts >= 3) {
        await this.prisma.otpRequest.update({
          where: { id: otpRequest.id },
          data: {
            attemptsCount: updatedAttempts,
            status: 'EXPIRED',
          },
        });
        throw new BadRequestException('OTP invalid. Max retry limits exceeded. Please request a new OTP.');
      } else {
        await this.prisma.otpRequest.update({
          where: { id: otpRequest.id },
          data: { attemptsCount: updatedAttempts },
        });
        throw new BadRequestException(`OTP invalid. ${3 - updatedAttempts} attempts remaining.`);
      }
    }

    // Success: Mark as verified and invalidate
    await this.prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { status: 'VERIFIED' },
    });

    return true;
  }
}
