import { seededShuffle } from "./lib/daily.js";
import { allData } from "./data/gameData.js";
import { delKey, getJson, sAddMany, sMembers, setJson } from "./lib/store.js";

const DAILY_KEY_PREFIX = "daily:";
const USED_MEMES_KEY = "usedMemes";
const DAILY_COUNT = 7;

function dailyKey(date) {
  return `${DAILY_KEY_PREFIX}${date}`;
}

function toMemeUnit(entry) {
  const uniqueId = entry.assetKey || `game_assets/${entry.folderName || entry.memeId}`;
  return {
    uniqueId,
    id: entry.memeId,
    title: entry.name,
    clue2ImageUrl: entry?.images?.["2"] || entry?.images?.stage_2 || "",
    answerImageUrl: entry?.images?.answer || ""
  };
}

function toGeneratedMeme(date, unit) {
  return {
    uniqueId: unit.uniqueId,
    memeId: `${date}:${unit.id}`,
    templateId: `${unit.id}`,
    title: unit.title || "Unknown Meme",
    clue_2: unit.clue2ImageUrl,
    stage2ImageUrl: unit.clue2ImageUrl,
    answerImageUrl: unit.answerImageUrl,
    images: {
      "2": unit.clue2ImageUrl,
      answer: unit.answerImageUrl
    },
    stage2ShouldBlur: false
  };
}

async function generateDailyMemes(req, date) {
  const units = allData.map(toMemeUnit).filter((entry) => entry.uniqueId && entry.clue2ImageUrl && entry.answerImageUrl);
  if (units.length < DAILY_COUNT) {
    throw new Error("Local game_assets catalog does not have enough meme asset packs.");
  }

  const usedBefore = new Set(await sMembers(req, USED_MEMES_KEY));
  let available = units.filter((unit) => !usedBefore.has(unit.uniqueId));
  let reusedDueToExhaustion = false;

  if (available.length < DAILY_COUNT) {
    await delKey(req, USED_MEMES_KEY);
    available = [...units];
    reusedDueToExhaustion = true;
  }

  const ordered = seededShuffle(available, `${date}:generated-assets`);
  const selected = ordered.slice(0, DAILY_COUNT);
  const memes = selected.map((unit) => toGeneratedMeme(date, unit));

  await sAddMany(
    req,
    USED_MEMES_KEY,
    selected.map((unit) => unit.uniqueId)
  );

  if (process.env.NODE_ENV !== "production") {
    const selectedIds = selected.map((unit) => unit.uniqueId);
    console.info(
      `[daily-debug] date=${date} usedCount=${usedBefore.size} availableCount=${available.length} ` +
      `selectedIds=${JSON.stringify(selectedIds)} reusedDueToExhaustion=${reusedDueToExhaustion}`
    );
  }

  const dailyPayload = {
    date,
    createdAt: new Date().toISOString(),
    reusedDueToExhaustion,
    memes
  };
  await setJson(req, dailyKey(date), dailyPayload);

  return dailyPayload;
}

async function getOrCreateDailyMemes(req, date) {
  const existing = await getJson(req, dailyKey(date));
  if (existing && Array.isArray(existing.memes) && existing.memes.length === DAILY_COUNT) {
    return existing;
  }

  return generateDailyMemes(req, date);
}

export { DAILY_COUNT, dailyKey, getOrCreateDailyMemes };
