import startLogo from "../assets/start-logo.png";

export default function StartScreen({ onStart, onExit, disabled }) {
  return (
    <div id="start-screen" className="start-screen">
      <img className="start-logo" src={startLogo} alt="Meme Streak logo" />
      <h1 className="start-title">What am I looking at?</h1>
      <button className="start-btn" id="start-btn" onClick={onStart} disabled={disabled}>Start Game</button>
      <button className="btn-exit" id="exit-btn" onClick={onExit}>Exit Game</button>
    </div>
  );
}
