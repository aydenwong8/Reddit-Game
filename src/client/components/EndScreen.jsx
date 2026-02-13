export default function EndScreen({
  visible,
  finalScore,
  leaderboard,
  runClassification,
  puzzleDate,
  isTestMode,
  onPlayAgain,
  onExit
}) {
  if (!visible) {
    return null;
  }

  const isOfficial = runClassification === "official";

  return (
    <div className="end-screen">
      <h2>Run Complete</h2>
      <div className="final-score">Final Score: {finalScore}</div>
      <div className="puzzle-date">
        Puzzle Date: {puzzleDate || "Unknown"}{isTestMode ? " (Test Mode)" : ""}
      </div>
      <div className={`run-status ${isOfficial ? "official" : "practice"}`}>
        {isOfficial ? "Your official daily run!" : "Leaderboard scores are only recorded for the first attempt each day."}
      </div>
      <h3>Top 10 Leaderboard</h3>
      <ol className="leaderboard-list">
        {leaderboard.map((entry, index) => (
          <li key={`${entry.username}:${entry.score}:${index}`}>
            <span>{entry.username}</span>
            <span>{entry.score}</span>
          </li>
        ))}
      </ol>
      <div className="end-actions">
        <button className="btn-reload" style={{ display: "block" }} onClick={onPlayAgain}>Play Again</button>
        <button className="btn-exit" onClick={onExit}>Exit</button>
      </div>
    </div>
  );
}
