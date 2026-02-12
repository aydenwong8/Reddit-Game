export default function ImageFrame({ src, alt }) {
  return (
    <div className="img-frame">
      <img id="game-img" className="game-img" src={src} alt={alt} />
    </div>
  );
}
