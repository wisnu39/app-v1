import { Module } from '@nestjs/common';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TenantResolverService } from './tenant-resolver.service';

@Module({
  providers: [TenantResolverService, TenantResolverMiddleware],
  exports: [TenantResolverService],
})
export class TenantModule {}
