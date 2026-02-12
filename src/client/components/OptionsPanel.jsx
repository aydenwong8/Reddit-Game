export default function OptionsPanel({ visible, optionsVisible, options, onGuess, onGiveUp }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="ui-area" id="ui-controls">
      <div
        id="options"
        style={{
          display: optionsVisible ? "flex" : "none",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <button className="btn-guess" id="opt1" onClick={() => onGuess(0)}>{options[0] || ""}</button>
        <button className="btn-guess" id="opt2" onClick={() => onGuess(1)}>{options[1] || ""}</button>
        <button className="btn-guess" id="opt3" onClick={() => onGuess(2)}>{options[2] || ""}</button>
      </div>
      <div style={{ marginTop: "10px" }}>
        <button className="btn-giveup" onClick={onGiveUp}>Give Up</button>
      </div>
    </div>
  );
}
