# src/infrastructure/prisma/

Prisma infrastructure layer — database client provider.

## Scope

This folder contains the Prisma client wrapper used by the DatabaseModule.

## Contents (added in Task 2.2.2.b — DatabaseModule)

- `prisma.service.ts`   — PrismaClient wrapper as NestJS Injectable
- `prisma.module.ts`    — Global DatabaseModule exporting PrismaService

## Rules (per CODING_STANDARDS.md & ARCHITECTURE.md)

- PrismaService is the ONLY way to access the database
- Controllers MUST NOT import PrismaService directly
- Services MUST NOT import PrismaClient directly
- All database access goes through Repository layer → PrismaService
- PrismaService handles connection lifecycle (onModuleInit / onModuleDestroy)
