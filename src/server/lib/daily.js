const DAILY_POOL_SIZE = 7;

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isValidDateKey(value) {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return utcDateKey(parsed) === value;
}

function resolveEffectiveDate(dateOverride, allowOverride) {
  if (dateOverride === undefined || dateOverride === null || `${dateOverride}`.trim() === "") {
    return utcDateKey();
  }

  if (!allowOverride) {
    return null;
  }

  const normalized = `${dateOverride}`.trim();
  if (!isValidDateKey(normalized)) {
    return null;
  }

  return normalized;
}

function hashSeed(seed) {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, seedText) {
  const copy = [...items];
  const rand = mulberry32(hashSeed(seedText));

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }

  return copy;
}

function getDailySelection(allData, dayKey = utcDateKey()) {
  const allIndexes = allData.map((_item, index) => index);
  const shuffled = seededShuffle(allIndexes, dayKey);
  const dailyIndexes = shuffled.slice(0, Math.min(DAILY_POOL_SIZE, shuffled.length));
  return {
    todayDate: dayKey,
    dailySeed: dayKey,
    dailyIndexes,
    playOrder: [...dailyIndexes]
  };
}

export { DAILY_POOL_SIZE, utcDateKey, isValidDateKey, resolveEffectiveDate, getDailySelection, seededShuffle };
