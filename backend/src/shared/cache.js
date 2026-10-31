import Redis from 'ioredis';

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  redis.on('error', () => {});
}

export const cache = {
  async get(key) {
    try {
      const value = await redis?.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  async set(key, value, seconds = 60) {
    try {
      await redis?.set(key, JSON.stringify(value), 'EX', seconds);
    } catch {
      return;
    }
  },
  async clearProducts() {
    try {
      if (!redis?.status || redis.status === 'end') return;
      const keys = await redis.keys('products:*');
      if (keys.length) await redis.del(...keys);
    } catch {
      return;
    }
  },
};