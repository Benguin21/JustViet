import { ConfirmDialog } from "justviet-app";
import type { ReactNode } from "react";

// ConfirmDialog renders a fixed full-screen overlay; the transform makes this
// frame its containing block so the open dialog stays inside the card.
const Frame = ({ children }: { children: ReactNode }) => (
  <div style={{ position: "relative", width: 600, height: 380, transform: "translateZ(0)", overflow: "hidden" }}>
    {children}
  </div>
);

export const DeleteCard = () => (
  <Frame>
    <ConfirmDialog
      title="Delete this card?"
      description={`"xin chào" and its full review history will be permanently deleted. This can't be undone.`}
      confirmLabel="Delete"
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  </Frame>
);

export const NonDestructive = () => (
  <Frame>
    <ConfirmDialog
      title="Reschedule existing cards?"
      description="This updates the next-review date for every review-state card to match your current desired retention. It won't affect new or learning cards."
      confirmLabel="Reschedule"
      danger={false}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  </Frame>
);
