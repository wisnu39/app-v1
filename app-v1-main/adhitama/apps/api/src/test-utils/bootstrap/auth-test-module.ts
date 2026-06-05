import type { Provider } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

export async function createAuthTestModule(providers: Provider[]): Promise<TestingModule> {
  return Test.createTestingModule({
    providers,
  }).compile();
}
