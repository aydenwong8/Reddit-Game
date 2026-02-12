export default function FeedbackBar({ message, color }) {
  return (
    <div id="feedback" style={{ height: "25px", fontWeight: "bold", color, marginTop: "10px" }}>
      {message}
    </div>
  );
}
