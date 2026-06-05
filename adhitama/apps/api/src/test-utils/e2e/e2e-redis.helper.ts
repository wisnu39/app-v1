import Redis from 'ioredis';

export function createE2ERedis(): Redis {
  return new Redis({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
    password: process.env['REDIS_PASSWORD'] ?? '',
    lazyConnect: false,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 2,
  });
}

export async function connectE2ERedis(redis: Redis): Promise<void> {
  if (redis.status === 'ready' || redis.status === 'connecting') {
    return;
  }

  await redis.connect();
}

export async function disconnectE2ERedis(redis: Redis): Promise<void> {
  if (redis.status === 'end' || redis.status === 'close') {
    return;
  }

  await redis.quit();
}

export async function resetE2ERedis(redis: Redis): Promise<void> {
  if (redis.status !== 'ready' && redis.status !== 'connecting') {
    await connectE2ERedis(redis);
  }

  await redis.flushdb();
}
