import { INestApplication } from '@nestjs/common';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';

export async function bootstrapAuthTestApp(
  providers: any[] = [],
  imports: any[] = [],
): Promise<{ app: INestApplication; module: TestingModule }> {
  const module: TestingModule = await Test.createTestingModule({
    imports,
    providers,
  }).compile();

  const app = module.createNestApplication();
  await app.init();

  return { app, module };
}
