/* Lightweight CSS aurora — two GPU-cheap blurred blobs over layered navy gradients.
 * Frozen under prefers-reduced-motion (see globals.css). Must never bleed into the
 * pure-black preview canvas. */
export function Background() {
  return (
    <div className="bg">
      <span className="blob b1" />
      <span className="blob b2" />
    </div>
  );
}
