import express from "express";
import { allData, initialIndex } from "../data/gameData.js";

const router = express.Router();

// Devvit Web compliant request/response JSON endpoint under /api/*.
router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "reddit-game",
    timestamp: new Date().toISOString()
  });
});

// Client bootstrap endpoint used by React on initial load.
// Returns static module data (no fs runtime reads, no streaming, JSON only).
router.get("/game/bootstrap", (_req, res) => {
  res.json({ allData, initialIndex });
});

// Stateless round progression endpoint with basic input validation.
// Accepts request JSON and returns JSON; no websocket/streaming behavior.
router.post("/game/round", (req, res) => {
  const { currentIndex } = req.body ?? {};

  if (!Number.isInteger(currentIndex)) {
    return res.status(400).json({ error: "currentIndex must be an integer." });
  }

  if (allData.length === 0) {
    return res.status(400).json({ error: "No game data available." });
  }

  if (currentIndex < -1 || currentIndex >= allData.length) {
    return res.status(400).json({ error: "currentIndex is out of range." });
  }

  const nextIndex = (currentIndex + 1) % allData.length;
  return res.json({ nextIndex });
});

export default router;
