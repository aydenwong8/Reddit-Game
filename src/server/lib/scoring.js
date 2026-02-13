const SCORE_MAX = 1000;
const SCORE_DECAY_MS = 50;

function scoreForRound(isCorrect, elapsedMs) {
  if (!isCorrect) {
    return 0;
  }

  // Monotonic speed-based formula:
  // points = max(0, 1000 - floor(elapsedMs / 50))
  const normalizedElapsed = Math.max(0, Number.isFinite(elapsedMs) ? Math.floor(elapsedMs) : 0);
  return Math.max(0, SCORE_MAX - Math.floor(normalizedElapsed / SCORE_DECAY_MS));
}

export { scoreForRound, SCORE_MAX, SCORE_DECAY_MS };
