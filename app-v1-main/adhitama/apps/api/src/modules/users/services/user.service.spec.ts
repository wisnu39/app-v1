jest.mock('crypto', () => {
  const actual = jest.requireActual<typeof import('crypto')>('crypto');

  return {
    ...actual,
    randomBytes: jest.fn(),
  };
});

import * as crypto from 'crypto';
import { PasswordService } from '@infrastructure/password';
import type { AuditService } from '@modules/audit/services';
import type { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';
import type { NipHelper } from '../helpers/nip.helper';

describe('UserService', () => {
  const userRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByNip: jest.fn(),
    findRoleById: jest.fn(),
    countActiveUsersByRoleName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    softDelete: jest.fn(),
  };

  const passwordService = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  const nipHelper = {
    generateNip: jest.fn(),
  };

  const auditService = {
    fireAndForget: jest.fn(),
  };

  const service = new UserService(
    userRepository as unknown as UserRepository,
    passwordService as unknown as PasswordService,
    nipHelper as unknown as NipHelper,
    auditService as unknown as AuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findRoleById.mockResolvedValue({
      id: 'role-employee',
      name: 'EMPLOYEE',
    });
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({
      id: 'user-1',
      tenantId: 'tenant-1',
      roleId: 'role-employee',
      name: 'Alice Example',
      email: 'alice@example.com',
      nip: 'EMP-0001',
      status: 'ACTIVE',
      avatarUrl: null,
      contact: '08123456789',
      address: 'Main Street',
      mustChangePassword: true,
      emailVerifiedAt: null,
      lastLoginAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    });
    passwordService.hash.mockResolvedValue('hashed-password');
    nipHelper.generateNip.mockResolvedValue('EMP-0001');
  });

  it('uses crypto.randomBytes to generate a temporary password for new users', async () => {
    (crypto.randomBytes as jest.Mock).mockImplementation((size: number) =>
      Buffer.alloc(size, 1),
    );

    const result = await service.createUser({
      tenantId: 'tenant-1',
      requestedById: 'admin-1',
      roleId: 'role-employee',
      name: 'Alice Example',
      email: 'alice@example.com',
      address: 'Main Street',
      contact: '08123456789',
    });

    expect(crypto.randomBytes).toHaveBeenCalled();
    expect(result.temporaryPassword).toHaveLength(12);
    expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9@#$!%]+$/);
    expect(passwordService.hash).toHaveBeenCalledWith(result.temporaryPassword);
  });
});
