import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CurrentUser, SecurityPolicyGuard } from '@core/auth';
import type { AuthUser } from '@core/auth';
import { PermissionGuard } from '@common/guards';
import { Permission } from '@common/decorators';
import { UserService } from '../services/user.service';
import type { CreateUserResult } from '../services/user.service';
import type { UserResponse, PaginatedUsers } from '../types/user.types';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateStatusDto } from '../dto/update-status.dto';
import { UserQueryDto } from '../dto/user-query.dto';

/**
 * UsersController — HTTP layer for user management endpoints.
 *
 * Controller rules (CODING_STANDARDS.md):
 *   - Routing + guard application only
 *   - Delegates all logic to UserService
 *   - Returns service result directly — ResponseInterceptor wraps envelope
 *   - NO business logic, NO Prisma, NO mapping, NO validation logic
 *
 * Security rules:
 *   - ALL endpoints use @UseGuards(JwtAuthGuard, PermissionGuard)
 *   - tenantId ALWAYS from @CurrentUser() — never from body/params/query
 *   - Explicit @Permission() per endpoint — no wildcard, no hardcoded bypass
 *
 * Response format:
 *   ResponseInterceptor (global in main.ts) wraps returns automatically.
 *   NEVER return { success: true, data: ... } manually.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard, SecurityPolicyGuard)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // ─── GET /users ────────────────────────────────────────────

  @Get()
  @Permission('users.read')
  @HttpCode(HttpStatus.OK)
  async listUsers(
    @Query() query: UserQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedUsers> {
    return this.userService.listUsers(user.tenantId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  // ─── GET /users/:id ────────────────────────────────────────

  @Get(':id')
  @Permission('users.read')
  @HttpCode(HttpStatus.OK)
  async getUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<UserResponse> {
    return this.userService.getUser(id, user.tenantId);
  }

  // ─── POST /users ───────────────────────────────────────────

  /**
   * Returns CreateUserResult — includes temporaryPassword (visible once only).
   * Controller passes requestedById from JWT for audit awareness.
   */
  @Post()
  @Permission('users.create')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<CreateUserResult> {
    return this.userService.createUser({
      tenantId: user.tenantId,
      requestedById: user.id,
      roleId: dto.roleId,
      name: dto.name,
      email: dto.email,
      address: dto.address,
      contact: dto.contact,
      avatarUrl: dto.avatarUrl,
      auditContext: {
        userId: user.id,
        ipAddress: this.extractIpAddress(req),
        userAgent: req.headers['user-agent'] ?? null,
        sessionId: user.sessionId,
      },
    });
  }

  // ─── PATCH /users/:id ─────────────────────────────────────

  @Patch(':id')
  @Permission('users.update')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<UserResponse> {
    return this.userService.updateUser(id, user.tenantId, {
      name: dto.name,
      roleId: dto.roleId,
      address: dto.address,
      contact: dto.contact,
      avatarUrl: dto.avatarUrl,
      auditContext: {
        userId: user.id,
        ipAddress: this.extractIpAddress(req),
        userAgent: req.headers['user-agent'] ?? null,
        sessionId: user.sessionId,
      },
    });
  }

  // ─── PATCH /users/:id/status ───────────────────────────────

  /**
   * requestedById passed to UserService for self-action safety guard.
   */
  @Patch(':id/status')
  @Permission('users.update-status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<UserResponse> {
    return this.userService.updateUserStatus(id, user.tenantId, {
      status: dto.status,
      requestedById: user.id,
      auditContext: {
        userId: user.id,
        ipAddress: this.extractIpAddress(req),
        userAgent: req.headers['user-agent'] ?? null,
        sessionId: user.sessionId,
      },
    });
  }

  // ─── DELETE /users/:id ────────────────────────────────────

  /**
   * 204 No Content on success.
   * 422 if last active OWNER — enforced in UserService.
   */
  @Delete(':id')
  @Permission('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.userService.deleteUser(id, user.tenantId, {
      userId: user.id,
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      sessionId: user.sessionId,
    });
  }

  private extractIpAddress(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return (ip ?? '').trim() || null;
    }
    return req.socket.remoteAddress ?? null;
  }
}
