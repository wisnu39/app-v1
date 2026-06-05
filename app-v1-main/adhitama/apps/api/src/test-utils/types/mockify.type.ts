import { jest } from '@jest/globals';

/**
 * Mockify<T> is an alias for jest.Mocked<T>
 * Used for creating fully mocked service instances for testing
 */
export type Mockify<T extends object = object> = jest.Mocked<T>;
