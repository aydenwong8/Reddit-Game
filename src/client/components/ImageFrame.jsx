export default function ImageFrame({ src, alt, blurred }) {
  return (
    <div className="img-frame">
      <img
        id="game-img"
        className="game-img"
        src={src}
        alt={alt}
        style={blurred ? { filter: "blur(10px)" } : undefined}
      />
    </div>
  );
}
