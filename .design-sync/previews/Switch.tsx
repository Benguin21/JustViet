import { Switch } from "justviet-app";
import { useState } from "react";

const Demo = ({ initial, label, description }: { initial: boolean; label: string; description?: string }) => {
  const [on, setOn] = useState(initial);
  return (
    <div style={{ width: 380 }}>
      <Switch checked={on} onChange={setOn} label={label} description={description} />
    </div>
  );
};

export const On = () => (
  <Demo initial label="Mix new cards with reviews" description="When off, all due reviews are shown before any new cards." />
);

export const Off = () => (
  <Demo initial={false} label="Add slight randomness to intervals" description="Spreads cards out so they don't all clump onto the same day." />
);

export const LabelOnly = () => <Demo initial label="Play audio automatically" />;
