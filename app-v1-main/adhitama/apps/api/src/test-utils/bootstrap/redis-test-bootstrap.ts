import Redis from 'ioredis';

export async function flushRedis(client: Redis): Promise<void> {
  await client.flushdb();
}

export async function closeRedis(client: Redis): Promise<void> {
  await client.quit();
}
