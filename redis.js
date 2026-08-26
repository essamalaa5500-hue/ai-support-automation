let redis = null;

async function initRedis() {
  try {
    const Redis = require("ioredis");
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    redis.on("error", function () {});
    await redis.connect();
    console.log("Redis connected");
  } catch (err) {
    console.warn("Redis not available, caching disabled");
    redis = null;
  }
}

initRedis();

async function cacheAnalysis(message, result) {
  if (!redis) return;
  try {
    const key = "analysis:" + simpleHash(message);
    await redis.set(key, JSON.stringify(result), "EX", 86400);
  } catch (err) {}
}

async function getCachedAnalysis(message) {
  if (!redis) return null;
  try {
    const key = "analysis:" + simpleHash(message);
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
}

function simpleHash(msg) {
  let hash = 0;
  const str = msg.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

module.exports = { cacheAnalysis, getCachedAnalysis };
