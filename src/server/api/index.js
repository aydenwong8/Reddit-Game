import express from "express";
import { randomUUID, createHash } from "crypto";
import { resolveEffectiveDate, seededShuffle, utcDateKey } from "../lib/daily.js";
import { scoreForRound } from "../lib/scoring.js";
import { resolveUserIdentity } from "../lib/identity.js";
import { delKey, exists, getJson, hGet, hSet, setIfAbsent, setJson, zAdd, zTop } from "../lib/store.js";
import { DAILY_COUNT, getOrCreateDailyMemes } from "../memeGenerator.js";

const router = express.Router();
const TOTAL_QUESTIONS = DAILY_COUNT;
const ROUND_TTL_SECONDS = 60 * 10;
const OFFICIAL_LOCK_TTL_SECONDS = 60 * 60 * 48;
// Testing-only override guard. Keep false in production.
const DEV_ALLOW_DATE_OVERRIDE = false;

function clampInt(input, fallback, min, max) {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function leaderboardKey(date) {
  return `leaderboard:${date}`;
}

function leaderboardUsersKey(date) {
  return `leaderboard:${date}:users`;
}

function roundKey(roundToken) {
  return `round:${roundToken}`;
}

function sessionKey(date, userId) {
  return `session:${date}:user:${userId}`;
}

function officialLockKey(date, userId) {
  return `official-run-locked:${date}:user:${userId}`;
}

function getMemeTitle(meme) {
  return meme?.title || meme?.name || "Unknown Meme";
}

function getStage2Image(meme) {
  return meme?.images?.["2"] || meme?.clue_2 || meme?.stage2ImageUrl || meme?.answerImageUrl || "";
}

function getAnswerImage(meme) {
  return meme?.images?.answer || meme?.answerImageUrl || meme?.stage2ImageUrl || "";
}

function buildPlayOrder(memes, date) {
  const allIndexes = memes.map((_meme, idx) => idx);
  return seededShuffle(allIndexes, `${date}:play-order`).slice(0, TOTAL_QUESTIONS);
}

function buildOptions(memes, correctIndex, date, questionNumber) {
  const correctMeme = memes[correctIndex];
  const distractorIndexes = memes
    .map((_meme, idx) => idx)
    .filter((idx) => idx !== correctIndex);

  const shuffledDistractors = seededShuffle(distractorIndexes, `${date}:${questionNumber}:distractors`);
  const chosen = [correctIndex, ...shuffledDistractors.slice(0, 2)];
  const shuffledOptions = seededShuffle(chosen, `${date}:${questionNumber}:${correctMeme.memeId}:options`);

  return shuffledOptions.map((idx) => ({
    optionId: memes[idx].memeId,
    label: getMemeTitle(memes[idx])
  }));
}

function hashAnswerId(answerId) {
  return createHash("sha256").update(answerId).digest("hex");
}

async function readLeaderboard(req, date, limit = 10) {
  const rows = await zTop(req, leaderboardKey(date), limit);
  const entries = [];

  for (const row of rows) {
    const username = await hGet(req, leaderboardUsersKey(date), row.member);
    entries.push({
      username: username || row.member,
      score: row.score
    });
  }

  return entries;
}

async function startOrResumeSession(req, userId, date, memes) {
  const key = sessionKey(date, userId);
  const existing = await getJson(req, key);
  const playOrder = buildPlayOrder(memes, date);

  if (
    existing &&
    Array.isArray(existing.playOrder) &&
    existing.playOrder.length === TOTAL_QUESTIONS &&
    Number.isInteger(existing.questionCursor) &&
    existing.questionCursor >= 0 &&
    existing.questionCursor < TOTAL_QUESTIONS
  ) {
    return existing;
  }

  const isPractice = await exists(req, officialLockKey(date, userId));
  const created = {
    userId,
    date,
    questionCursor: 0,
    totalScoreSoFar: 0,
    totalQuestions: TOTAL_QUESTIONS,
    playOrder,
    isPractice
  };

  await setJson(req, key, created);
  return created;
}

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "reddit-game",
    timestamp: new Date().toISOString()
  });
});

router.get("/daily", async (req, res) => {
  try {
    const allowOverride = process.env.NODE_ENV !== "production" || DEV_ALLOW_DATE_OVERRIDE;
    const requestedDate = typeof req.query?.date === "string" ? req.query.date : undefined;
    const date = resolveEffectiveDate(requestedDate, allowOverride);
    if (!date) {
      return res.status(400).json({ error: "Invalid or disallowed date override. Expected YYYY-MM-DD." });
    }

    const daily = await getOrCreateDailyMemes(req, date);
    const memes = daily.memes.map((meme, dailyIndex) => ({
      dailyIndex,
      memeId: meme.memeId,
      title: getMemeTitle(meme),
      stage2ImageUrl: getStage2Image(meme),
      stage2ShouldBlur: Boolean(meme.stage2ShouldBlur)
    }));
    const leaderboardTop10 = await readLeaderboard(req, date, 10);

    return res.json({
      todayDate: date,
      dailySeed: date,
      reusedDueToExhaustion: Boolean(daily.reusedDueToExhaustion),
      memes,
      playOrder: buildPlayOrder(daily.memes, date),
      leaderboardTop10
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load daily game." });
  }
});

router.post("/round/start", async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    const allowOverride = process.env.NODE_ENV !== "production" || DEV_ALLOW_DATE_OVERRIDE;
    const requestedDate = req.body?.dateOverride;
    const date = resolveEffectiveDate(requestedDate, allowOverride);
    if (!date) {
      return res.status(400).json({ error: "Invalid or disallowed dateOverride. Expected YYYY-MM-DD." });
    }

    const daily = await getOrCreateDailyMemes(req, date);
    const memes = Array.isArray(daily.memes) ? daily.memes : [];
    if (memes.length < TOTAL_QUESTIONS) {
      return res.status(500).json({ error: "Daily meme set is incomplete." });
    }

    const session = await startOrResumeSession(req, identity.userId, date, memes);
    if (session.questionCursor >= TOTAL_QUESTIONS) {
      return res.status(400).json({ error: "Run is complete. Start a new run from Play Again." });
    }

    const questionNumber = session.questionCursor + 1;
    const memeIndex = session.playOrder[session.questionCursor];
    const meme = memes[memeIndex];
    if (!meme) {
      return res.status(500).json({ error: "Question meme is missing from daily set." });
    }

    const options = buildOptions(memes, memeIndex, date, questionNumber);
    const correctOptionId = meme.memeId;
    const roundToken = randomUUID();
    const round = {
      roundToken,
      userId: identity.userId,
      date,
      startMs: Date.now(),
      memeIndex,
      questionNumber,
      totalQuestions: TOTAL_QUESTIONS,
      correctOptionId,
      answered: false
    };

    await setJson(req, roundKey(roundToken), round, ROUND_TTL_SECONDS);

    return res.json({
      roundToken,
      memeIndex,
      puzzleDate: date,
      memeImageStage2: getStage2Image(meme),
      stage2ShouldBlur: Boolean(meme.stage2ShouldBlur),
      options,
      correctAnswerHashOrId: hashAnswerId(correctOptionId),
      questionNumber,
      totalQuestions: TOTAL_QUESTIONS
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to start round." });
  }
});

router.post("/round/answer", async (req, res) => {
  try {
    const identity = resolveUserIdentity(req);
    const { roundToken, selectedOptionId } = req.body ?? {};

    if (!roundToken || typeof roundToken !== "string") {
      return res.status(400).json({ error: "roundToken is required." });
    }

    if (!selectedOptionId || typeof selectedOptionId !== "string") {
      return res.status(400).json({ error: "selectedOptionId is required." });
    }

    const round = await getJson(req, roundKey(roundToken));
    if (!round) {
      return res.status(400).json({ error: "Invalid or expired roundToken." });
    }

    if (round.userId !== identity.userId) {
      return res.status(403).json({ error: "Round token does not belong to this user." });
    }

    const daily = await getOrCreateDailyMemes(req, round.date || utcDateKey());
    const memes = Array.isArray(daily.memes) ? daily.memes : [];
    const questionMeme = memes[round.memeIndex];
    if (!questionMeme) {
      return res.status(500).json({ error: "Question meme is missing from daily set." });
    }

    const key = sessionKey(round.date, identity.userId);
    const session = await getJson(req, key);
    if (!session) {
      return res.status(400).json({ error: "Session not found. Start a new run." });
    }

    if (session.questionCursor + 1 !== round.questionNumber) {
      return res.status(409).json({ error: "Round order mismatch. Start the current question again." });
    }

    const elapsedMs = Math.max(0, Date.now() - round.startMs);
    const isCorrect = selectedOptionId === round.correctOptionId;
    const correctAnswerLabel = getMemeTitle(questionMeme);
    const answerImageUrl = getAnswerImage(questionMeme);
    const pointsAwarded = scoreForRound(isCorrect, elapsedMs);
    const nextScore = Math.max(0, Number(session.totalScoreSoFar || 0) + pointsAwarded);
    const nextCursor = session.questionCursor + 1;

    session.totalScoreSoFar = nextScore;
    session.questionCursor = nextCursor;
    await setJson(req, key, session);
    await delKey(req, roundKey(roundToken));

    if (nextCursor < TOTAL_QUESTIONS) {
      return res.json({
        isCorrect,
        correctAnswerLabel,
        answerImageUrl,
        pointsAwarded,
        elapsedMs,
        totalScoreSoFar: nextScore,
        nextAction: "next"
      });
    }

    const lockKey = officialLockKey(round.date, identity.userId);
    let runClassification = "practice";

    if (!session.isPractice) {
      const didLock = await setIfAbsent(
        req,
        lockKey,
        { completedAt: new Date().toISOString(), score: nextScore },
        OFFICIAL_LOCK_TTL_SECONDS
      );

      if (didLock) {
        runClassification = "official";
      }
    }

    if (runClassification === "official") {
      await zAdd(req, leaderboardKey(round.date), nextScore, identity.userId);
      await hSet(req, leaderboardUsersKey(round.date), identity.userId, identity.username);
    }

    const leaderboardTop10 = await readLeaderboard(req, round.date, 10);
    return res.json({
      isCorrect,
      correctAnswerLabel,
      answerImageUrl,
      pointsAwarded,
      elapsedMs,
      totalScoreSoFar: nextScore,
      nextAction: "end",
      finalScore: nextScore,
      runClassification,
      leaderboardTop10
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to submit answer." });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const requestedDate = typeof req.query?.date === "string" ? req.query.date : utcDateKey();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : utcDateKey();
    const limit = clampInt(req.query?.limit, 10, 1, 50);
    const entries = await readLeaderboard(req, date, limit);

    return res.json({
      date,
      limit,
      entries
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load leaderboard." });
  }
});

export default router;
