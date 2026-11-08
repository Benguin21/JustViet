import { Button } from "justviet-app";

export const Primary = () => (
  <div style={{ width: 280 }}>
    <Button>Start lesson</Button>
  </div>
);

export const Variants = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
    <Button variant="primary">Check</Button>
    <Button variant="secondary">Continue</Button>
    <Button variant="outline">Skip</Button>
    <Button variant="ghost">Maybe later</Button>
    <Button variant="danger">Delete card</Button>
  </div>
);

export const SmallInline = () => (
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <Button size="sm" fullWidth={false}>Study</Button>
    <Button size="sm" variant="outline" fullWidth={false}>Edit</Button>
    <Button size="sm" variant="danger" fullWidth={false}>Delete</Button>
  </div>
);

export const States = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
    <Button loading>Saving</Button>
    <Button disabled>Check</Button>
  </div>
);
