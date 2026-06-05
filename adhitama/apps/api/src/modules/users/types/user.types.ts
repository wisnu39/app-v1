/**
 * User Module Types — Adhitama ERP
 *
 * Typed shapes for UserRepository returns and UserService responses.
 * NOT Prisma entities — purpose-built DTOs.
 *
 * Sensitive fields excluded from ALL public-facing types:
 *   passwordHash, refreshTokenHash, deletedAt (internal), raw emailVerifiedAt
 */

/**
 * UserRecord — minimal user shape returned by repository queries.
 * Used internally within the users module.
 */
export interface UserRecord {
  id: string;
  tenantId: string;
  roleId: string;
  name: string;
  email: string;
  nip: string | null;
  status: string;
  avatarUrl: string | null;
  contact: string | null;
  address: string | null;
  mustChangePassword: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UserResponse — shape returned by UserService to controller/API layer.
 * Raw emailVerifiedAt replaced with derived boolean.
 * passwordHash, deletedAt never included.
 */
export interface UserResponse {
  id: string;
  tenantId: string;
  roleId: string;
  name: string;
  email: string;
  nip: string | null;
  status: string;
  avatarUrl: string | null;
  contact: string | null;
  address: string | null;
  mustChangePassword: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PaginatedUsers — paginated list response shape.
 */
export interface PaginatedUsers {
  data: UserResponse[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * UserListQuery — parameters for user listing.
 */
export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  // Allow additional sortable fields exposed by DTO (nip, updatedAt)
  sortBy?: 'name' | 'email' | 'createdAt' | 'status' | 'nip' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
