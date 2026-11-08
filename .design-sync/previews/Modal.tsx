import { Modal, TextField, Button } from "justviet-app";
import type { ReactNode } from "react";

// Modal renders a fixed full-screen overlay; the transform makes this frame
// its containing block so the open modal stays inside the card.
const Frame = ({ children }: { children: ReactNode }) => (
  <div style={{ position: "relative", width: 680, height: 460, transform: "translateZ(0)", overflow: "hidden" }}>
    {children}
  </div>
);

export const AddCard = () => (
  <Frame>
    <Modal title="Add card" onClose={() => {}}>
      <div className="flex flex-col gap-4">
        <TextField label="Vietnamese" defaultValue="bánh mì" />
        <TextField label="English" defaultValue="bread; Vietnamese sandwich" />
        <div className="flex gap-3">
          <Button variant="outline">Cancel</Button>
          <Button>Save card</Button>
        </div>
      </div>
    </Modal>
  </Frame>
);

export const Narrow = () => (
  <Frame>
    <Modal title="Card details" onClose={() => {}} maxWidth="md">
      <p className="font-heading text-3xl font-extrabold text-ink-900">phở</p>
      <p className="mt-1 font-semibold text-ink-500">noodle soup</p>
      <p className="mt-4 text-ink-700">Tôi thích ăn phở vào buổi sáng.</p>
    </Modal>
  </Frame>
);
