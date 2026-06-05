import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma';
import type { EmailVerificationTokenRecord } from '../types/email-verification.types';

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createToken(input: {
    tenantId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationTokenRecord> {
    const token = await this.prismaService.emailVerificationToken.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });

    return {
      id: token.id,
      tenantId: token.tenantId,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
  }

  async findValidTokenByHash(
    tokenHash: string,
    tenantId: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const token = await this.prismaService.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        tenantId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return token
      ? {
          id: token.id,
          tenantId: token.tenantId,
          userId: token.userId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
          createdAt: token.createdAt,
        }
      : null;
  }

  async findTokenByHash(
    tokenHash: string,
    tenantId: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const token = await this.prismaService.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        tenantId,
      },
    });

    return token
      ? {
          id: token.id,
          tenantId: token.tenantId,
          userId: token.userId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
          createdAt: token.createdAt,
        }
      : null;
  }

  async findLatestTokenByUserId(
    userId: string,
    tenantId: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const token = await this.prismaService.emailVerificationToken.findFirst({
      where: {
        userId,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return token
      ? {
          id: token.id,
          tenantId: token.tenantId,
          userId: token.userId,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
          createdAt: token.createdAt,
        }
      : null;
  }

  async invalidateUnusedTokensForUser(userId: string, tenantId: string): Promise<number> {
    const result = await this.prismaService.emailVerificationToken.updateMany({
      where: {
        userId,
        tenantId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    return result.count;
  }

  async markTokenUsedAndVerifyUser(
    tokenId: string,
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    const transactionResult = await this.prismaService.$transaction(async (tx) => {
      const tokenUpdate = await tx.emailVerificationToken.updateMany({
        where: {
          id: tokenId,
          tenantId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (tokenUpdate.count !== 1) {
        return false;
      }

      const userUpdate = await tx.user.updateMany({
        where: {
          id: userId,
          tenantId,
          deletedAt: null,
        },
        data: {
          emailVerifiedAt: new Date(),
        },
      });

      return userUpdate.count === 1;
    });

    return transactionResult;
  }

  async removeExpiredTokens(tenantId?: string): Promise<number> {
    const result = await this.prismaService.emailVerificationToken.deleteMany({
      where: {
        tenantId: tenantId ?? undefined,
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}
