export default function OptionsPanel({
  visible,
  options,
  onGuess,
  onGiveUp,
  optionsDisabled,
  feedback,
  onNext,
  nextDisabled
}) {
  if (!visible) {
    return null;
  }

  if (feedback) {
    return (
      <div className="ui-area" id="ui-controls">
        <div className="answer-feedback-panel">
          <div className={`answer-feedback-title ${feedback.isCorrect ? "correct" : "wrong"}`}>
            {feedback.isCorrect ? "Correct!" : "Wrong!"}
          </div>
          <div>Correct answer: {feedback.correctAnswerLabel}</div>
          <div>Points gained: {feedback.pointsAwarded}</div>
        </div>
        <div style={{ marginTop: "10px" }}>
          <button className="btn-reload" style={{ display: "block" }} onClick={onNext} disabled={nextDisabled}>
            {feedback.nextAction === "end" ? "View Results" : "Next"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-area" id="ui-controls">
      <div
        id="options"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px"
        }}
      >
        {options.map((option) => (
          <button
            key={option.optionId}
            className="btn-guess"
            onClick={() => onGuess(option.optionId)}
            disabled={optionsDisabled}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: "10px" }}>
        <button className="btn-giveup" onClick={onGiveUp} disabled={optionsDisabled}>Give Up</button>
      </div>
    </div>
  );
}
