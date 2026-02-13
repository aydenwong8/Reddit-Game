const memoryStrings = new Map();
const memoryHashes = new Map();
const memorySortedSets = new Map();
const memorySets = new Map();
const memoryExpiry = new Map();

function nowMs() {
  return Date.now();
}

function clearIfExpired(key) {
  const expiresAt = memoryExpiry.get(key);
  if (expiresAt !== undefined && nowMs() >= expiresAt) {
    memoryExpiry.delete(key);
    memoryStrings.delete(key);
    memoryHashes.delete(key);
    memorySortedSets.delete(key);
    memorySets.delete(key);
  }
}

function setMemoryExpiry(key, ttlSeconds) {
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    memoryExpiry.set(key, nowMs() + Math.floor(ttlSeconds * 1000));
  } else {
    memoryExpiry.delete(key);
  }
}

function getRedisClient(req) {
  return req?.context?.redis || req?.app?.locals?.redis || globalThis.__DEVVIT_REDIS__ || null;
}

function serialize(value) {
  return JSON.stringify(value);
}

function deserialize(text) {
  if (text === undefined || text === null) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function getJson(req, key) {
  const redis = getRedisClient(req);

  if (redis && typeof redis.get === "function") {
    const raw = await redis.get(key);
    return deserialize(raw);
  }

  clearIfExpired(key);
  return deserialize(memoryStrings.get(key));
}

async function setJson(req, key, value, ttlSeconds) {
  const redis = getRedisClient(req);
  const serialized = serialize(value);

  if (redis && typeof redis.set === "function") {
    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      await redis.set(key, serialized, { ex: Math.floor(ttlSeconds) });
    } else {
      await redis.set(key, serialized);
    }
    return;
  }

  memoryStrings.set(key, serialized);
  setMemoryExpiry(key, ttlSeconds);
}

async function delKey(req, key) {
  const redis = getRedisClient(req);

  if (redis && typeof redis.del === "function") {
    await redis.del(key);
    return;
  }

  memoryStrings.delete(key);
  memoryHashes.delete(key);
  memorySortedSets.delete(key);
  memorySets.delete(key);
  memoryExpiry.delete(key);
}

async function exists(req, key) {
  const redis = getRedisClient(req);

  if (redis && typeof redis.exists === "function") {
    const value = await redis.exists(key);
    return Number(value) > 0;
  }

  clearIfExpired(key);
  return memoryStrings.has(key) || memoryHashes.has(key) || memorySortedSets.has(key) || memorySets.has(key);
}

async function setIfAbsent(req, key, value, ttlSeconds) {
  const redis = getRedisClient(req);
  const serialized = serialize(value);

  if (redis && typeof redis.set === "function") {
    const options = { nx: true };
    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      options.ex = Math.floor(ttlSeconds);
    }
    const response = await redis.set(key, serialized, options);
    return response === "OK";
  }

  clearIfExpired(key);
  if (memoryStrings.has(key)) {
    return false;
  }

  memoryStrings.set(key, serialized);
  setMemoryExpiry(key, ttlSeconds);
  return true;
}

async function hSet(req, key, field, value) {
  const redis = getRedisClient(req);
  const normalized = `${value}`;

  if (redis && typeof redis.hSet === "function") {
    await redis.hSet(key, field, normalized);
    return;
  }

  clearIfExpired(key);
  const map = memoryHashes.get(key) || new Map();
  map.set(field, normalized);
  memoryHashes.set(key, map);
}

async function hGet(req, key, field) {
  const redis = getRedisClient(req);

  if (redis && typeof redis.hGet === "function") {
    const raw = await redis.hGet(key, field);
    return raw ?? null;
  }

  clearIfExpired(key);
  const map = memoryHashes.get(key);
  if (!map) {
    return null;
  }

  return map.get(field) ?? null;
}

async function zAdd(req, key, score, member) {
  const redis = getRedisClient(req);

  if (redis && typeof redis.zAdd === "function") {
    await redis.zAdd(key, { score, value: member });
    return;
  }

  clearIfExpired(key);
  const map = memorySortedSets.get(key) || new Map();
  map.set(member, Number(score));
  memorySortedSets.set(key, map);
}

async function zTop(req, key, limit = 10) {
  const redis = getRedisClient(req);

  if (redis && typeof redis.zRangeWithScores === "function") {
    const rows = await redis.zRangeWithScores(key, 0, Math.max(0, limit - 1), { rev: true });
    return rows.map((row) => ({
      member: row.value,
      score: Number(row.score)
    }));
  }

  clearIfExpired(key);
  const map = memorySortedSets.get(key) || new Map();
  return [...map.entries()]
    .map(([member, score]) => ({ member, score: Number(score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}

async function sAdd(req, key, member) {
  const redis = getRedisClient(req);
  const normalized = `${member}`;

  if (redis) {
    if (typeof redis.sAdd === "function") {
      await redis.sAdd(key, normalized);
      return;
    }
    if (typeof redis.sadd === "function") {
      await redis.sadd(key, normalized);
      return;
    }
  }

  clearIfExpired(key);
  const set = memorySets.get(key) || new Set();
  set.add(normalized);
  memorySets.set(key, set);
}

async function sAddMany(req, key, members) {
  for (const member of members) {
    await sAdd(req, key, member);
  }
}

async function sMembers(req, key) {
  const redis = getRedisClient(req);

  if (redis) {
    if (typeof redis.sMembers === "function") {
      const rows = await redis.sMembers(key);
      return Array.isArray(rows) ? rows.map((row) => `${row}`) : [];
    }
    if (typeof redis.smembers === "function") {
      const rows = await redis.smembers(key);
      return Array.isArray(rows) ? rows.map((row) => `${row}`) : [];
    }
  }

  clearIfExpired(key);
  const set = memorySets.get(key);
  return set ? [...set] : [];
}

export { getJson, setJson, delKey, exists, setIfAbsent, hSet, hGet, zAdd, zTop, sAdd, sAddMany, sMembers };
