import { Logo } from "justviet-app";

export const Default = () => <Logo />;

export const OnPaper = () => (
  <div className="bg-paper" style={{ padding: 24, width: 320 }}>
    <Logo className="justify-start" />
  </div>
);
