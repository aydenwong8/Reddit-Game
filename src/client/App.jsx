import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, startRoundRequest } from "./api";
import StartScreen from "./components/StartScreen";
import GameHeader from "./components/GameHeader";
import ImageFrame from "./components/ImageFrame";
import OptionsPanel from "./components/OptionsPanel";
import FeedbackBar from "./components/FeedbackBar";
import EndScreen from "./components/EndScreen";

const ENABLE_TIME_TRAVEL_TESTING = true;

function emptyRound() {
  return {
    roundToken: "",
    memeImageStage2: "",
    options: [],
    questionNumber: 0,
    totalQuestions: 7,
    puzzleDate: "",
    stage2ShouldBlur: false
  };
}

function emptyAnswerFeedback() {
  return null;
}

function utcDateWithOffset(offsetDays) {
  const now = new Date();
  const baseUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = new Date(baseUtc + Math.max(0, offsetDays) * 86400000);
  return target.toISOString().slice(0, 10);
}

export default function App() {
  const [screen, setScreen] = useState("start");
  const [round, setRound] = useState(emptyRound());
  const [totalScore, setTotalScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [runClassification, setRunClassification] = useState("practice");
  const [loadingRound, setLoadingRound] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackColor, setFeedbackColor] = useState("#ffea00");
  const [bootstrapError, setBootstrapError] = useState("");
  const [dailyInfo, setDailyInfo] = useState({ todayDate: "", dailySeed: "" });
  const [answerFeedback, setAnswerFeedback] = useState(emptyAnswerFeedback());
  const [dayOffset, setDayOffset] = useState(0);
  const [activePuzzleDate, setActivePuzzleDate] = useState("");

  const isBusy = loadingRound || submittingAnswer;
  const progressText = useMemo(() => {
    if (!round.totalQuestions) {
      return "0/7";
    }
    return `${Math.max(1, round.questionNumber)}/${round.totalQuestions}`;
  }, [round.questionNumber, round.totalQuestions]);

  function getDateOverrideForOffset(offset) {
    if (!ENABLE_TIME_TRAVEL_TESTING || offset <= 0) {
      return undefined;
    }
    return utcDateWithOffset(offset);
  }

  async function refreshDaily(dateOverride) {
    const query = dateOverride ? `?date=${encodeURIComponent(dateOverride)}` : "";
    const payload = await apiGet(`/api/daily${query}`);
    setDailyInfo({ todayDate: payload.todayDate, dailySeed: payload.dailySeed });
    setLeaderboard(Array.isArray(payload.leaderboardTop10) ? payload.leaderboardTop10 : []);
    setActivePuzzleDate(payload.todayDate || "");
  }

  useEffect(() => {
    refreshDaily().catch((error) => {
      setBootstrapError(error?.message || "Failed to load daily game.");
    });
  }, []);

  function showMessage(text, color) {
    setFeedbackText(text);
    setFeedbackColor(color);
  }

  async function startRound(dateOverride) {
    setLoadingRound(true);
    try {
      const payload = await startRoundRequest(dateOverride);
      setRound({
        roundToken: payload.roundToken,
        memeImageStage2: payload.memeImageStage2,
        options: Array.isArray(payload.options) ? payload.options : [],
        questionNumber: payload.questionNumber || 1,
        totalQuestions: payload.totalQuestions || 7,
        puzzleDate: payload.puzzleDate || dateOverride || "",
        stage2ShouldBlur: Boolean(payload.stage2ShouldBlur)
      });
      setActivePuzzleDate(payload.puzzleDate || dateOverride || "");
      setAnswerFeedback(emptyAnswerFeedback());
      showMessage("", "#ffea00");
      setScreen("playing");
    } finally {
      setLoadingRound(false);
    }
  }

  async function startGame(offset = dayOffset) {
    if (bootstrapError) {
      return;
    }

    const override = getDateOverrideForOffset(offset);
    setTotalScore(0);
    setFinalScore(0);
    setRunClassification("practice");
    setAnswerFeedback(emptyAnswerFeedback());
    setFeedbackText("");
    await refreshDaily(override);
    await startRound(override);
  }

  async function submitAnswer(selectedOptionId) {
    if (!round.roundToken || isBusy || screen !== "playing") {
      return;
    }

    setSubmittingAnswer(true);
    try {
      const payload = await apiPost("/api/round/answer", {
        roundToken: round.roundToken,
        selectedOptionId
      });

      setTotalScore(payload.totalScoreSoFar || 0);
      setAnswerFeedback({
        isCorrect: Boolean(payload.isCorrect),
        correctAnswerLabel: payload.correctAnswerLabel || "",
        pointsAwarded: Number(payload.pointsAwarded || 0),
        answerImageUrl: payload.answerImageUrl || "",
        nextAction: payload.nextAction || "next",
        finalScore: payload.finalScore || payload.totalScoreSoFar || 0,
        runClassification: payload.runClassification || "practice",
        leaderboardTop10: Array.isArray(payload.leaderboardTop10) ? payload.leaderboardTop10 : []
      });
      setScreen("feedback");
    } catch (error) {
      showMessage(error?.message || "Failed to submit answer.", "#ff3d00");
    } finally {
      setSubmittingAnswer(false);
    }
  }

  async function continueAfterFeedback() {
    if (!answerFeedback || isBusy || screen !== "feedback") {
      return;
    }

    if (answerFeedback.nextAction === "end") {
      setFinalScore(answerFeedback.finalScore || totalScore || 0);
      setRunClassification(answerFeedback.runClassification || "practice");
      setLeaderboard(answerFeedback.leaderboardTop10 || []);
      setAnswerFeedback(emptyAnswerFeedback());
      setScreen("end");
      return;
    }

    const override = getDateOverrideForOffset(dayOffset);
    await startRound(override);
  }

  function giveUp() {
    submitAnswer("__giveup__").catch(() => {
      showMessage("Failed to give up.", "#ff3d00");
    });
  }

  function exitGame() {
    setScreen("start");
    setRound(emptyRound());
    setTotalScore(0);
    setFinalScore(0);
    setRunClassification("practice");
    setAnswerFeedback(emptyAnswerFeedback());
    setFeedbackText("");
    setFeedbackColor("#ffea00");
    setDayOffset(0);
    refreshDaily().catch(() => {
      // Silent refresh failure on exit keeps existing leaderboard.
    });
  }

  if (bootstrapError) {
    return (
      <div className="pixel-card">
        <FeedbackBar message={bootstrapError} color="#ff3d00" />
      </div>
    );
  }

  const visibleImage =
    screen === "feedback" && answerFeedback?.answerImageUrl
      ? answerFeedback.answerImageUrl
      : round.memeImageStage2;
  const shouldBlurQuestionImage = screen === "playing" && round.stage2ShouldBlur;

  return (
    <div className="pixel-card">
      {screen === "start" && <StartScreen onStart={() => startGame().catch(() => {})} onExit={exitGame} disabled={isBusy} />}

      <GameHeader
        visible={screen === "playing" || screen === "feedback"}
        title={`Daily Meme Challenge ${activePuzzleDate ? `(${activePuzzleDate})` : ""}`}
        onExit={exitGame}
        progressText={progressText}
        score={totalScore}
      />

      {(screen === "playing" || screen === "feedback") && (
        <ImageFrame src={visibleImage} alt={`Question ${round.questionNumber}`} blurred={shouldBlurQuestionImage} />
      )}

      <OptionsPanel
        visible={screen === "playing" || screen === "feedback"}
        options={round.options}
        onGuess={submitAnswer}
        onGiveUp={giveUp}
        optionsDisabled={isBusy || screen === "feedback"}
        feedback={screen === "feedback" ? answerFeedback : null}
        onNext={() => continueAfterFeedback().catch(() => {})}
        nextDisabled={isBusy}
      />

      {screen === "playing" && <FeedbackBar message={feedbackText} color={feedbackColor} />}

      <EndScreen
        visible={screen === "end"}
        finalScore={finalScore}
        leaderboard={leaderboard}
        runClassification={runClassification}
        puzzleDate={activePuzzleDate || round.puzzleDate}
        isTestMode={ENABLE_TIME_TRAVEL_TESTING && dayOffset > 0}
        onPlayAgain={() => startGame().catch(() => {})}
        onExit={exitGame}
      />
    </div>
  );
}
