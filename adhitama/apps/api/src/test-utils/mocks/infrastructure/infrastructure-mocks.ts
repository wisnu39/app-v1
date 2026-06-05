import { jest } from '@jest/globals';

export type InfrastructureTestMocks = {
  redisClient: {
    incr: jest.Mock;
    get: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
    rpush: jest.Mock;
    ltrim: jest.Mock;
    expire: jest.Mock;
  };
};

export function createInfrastructureMocks(): InfrastructureTestMocks {
  return {
    redisClient: {
      incr: jest.fn(),
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      rpush: jest.fn(),
      ltrim: jest.fn(),
      expire: jest.fn(),
    },
  };
}
