import { TextField } from "justviet-app";

export const Labeled = () => (
  <div style={{ width: 320 }}>
    <TextField label="Vietnamese" placeholder="xin chào" />
  </div>
);

export const Filled = () => (
  <div style={{ width: 320 }}>
    <TextField label="English" defaultValue="hello" />
  </div>
);

export const WithError = () => (
  <div style={{ width: 320 }}>
    <TextField label="Email" type="email" defaultValue="ben@" error="Please enter a valid email address." />
  </div>
);

export const Unlabeled = () => (
  <div style={{ width: 320 }}>
    <TextField placeholder="Search your cards…" aria-label="Search cards" />
  </div>
);
