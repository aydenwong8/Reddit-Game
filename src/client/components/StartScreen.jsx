export default function StartScreen({ onStart, onExit, disabled }) {
  return (
    <div id="start-screen" className="start-screen">
      <h1>Guess the Meme</h1>
      <button className="start-btn" id="start-btn" onClick={onStart} disabled={disabled}>Start</button>
      <button className="btn-exit" id="exit-btn" onClick={onExit}>Exit Game</button>
    </div>
  );
}
