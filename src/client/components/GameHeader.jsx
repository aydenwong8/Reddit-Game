export default function GameHeader({ visible, title, onExit, progressText, score }) {
  if (!visible) {
    return null;
  }

  return (
    <div id="game-container" style={{ display: "block", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: "0.9em", gap: "8px" }}>
        <span id="stage-txt">{progressText}</span>
        <span id="score-txt">Score: {score}</span>
        <button className="btn-exit" style={{ marginLeft: "auto" }} onClick={onExit}>Exit</button>
      </div>
      <h2 id="title-txt" style={{ margin: "10px 0" }}>{title}</h2>
    </div>
  );
}
