export default function GameHeader({ visible, title, onExit }) {
  if (!visible) {
    return null;
  }

  return (
    <div id="game-container" style={{ display: "block", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: "0.9em" }}>
        <span id="stage-txt">Stage 1/5</span>
        <button className="btn-exit" style={{ marginLeft: "auto" }} onClick={onExit}>Exit</button>
      </div>
      <h2 id="title-txt" style={{ margin: "10px 0" }}>{title}</h2>
    </div>
  );
}
