const redis = require("redis");

class CacheService {
  constructor() {
    this._client = redis.createClient({
      socket: {
        host: process.env.REDIS_SERVER,
        port: 6379, // pastikan ini ditambahkan
      },
    });

    this._client.on("error", (err) => {
      console.error("Redis error:", err);
    });

    this._client.connect();
  }

  async set(key, value, expirationInSecond = 1800) {
    await this._client.set(key, JSON.stringify(value), {
      EX: expirationInSecond,
    });
  }

  async get(key) {
    const result = await this._client.get(key);
    if (!result) throw new Error("Cache tidak ditemukan");
    return JSON.parse(result);
  }

  async delete(key) {
    await this._client.del(key);
  }
}

module.exports = CacheService;
