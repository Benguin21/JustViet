import { Toast } from "justviet-app";

// Toast is fixed to the bottom of the viewport; the transform makes this
// frame its containing block so it shows inside the card.
export const Saved = () => (
  <div style={{ position: "relative", width: 440, height: 140, transform: "translateZ(0)" }}>
    <Toast message="Card added ✓" />
  </div>
);

export const Imported = () => (
  <div style={{ position: "relative", width: 440, height: 140, transform: "translateZ(0)" }}>
    <Toast message="Imported 24 cards" />
  </div>
);
