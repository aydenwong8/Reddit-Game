export default function PlayAgainButton({ visible, onClick }) {
  return (
    <button className="btn-reload" style={{ display: visible ? "block" : "none" }} onClick={onClick}>
      Play Again
    </button>
  );
}
