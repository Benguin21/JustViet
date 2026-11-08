import { Textarea } from "justviet-app";

export const ExampleSentence = () => (
  <div style={{ width: 360 }}>
    <Textarea label="Example sentence" defaultValue="Tôi ăn cơm với gia đình mỗi tối." rows={3} />
  </div>
);

export const Placeholder = () => (
  <div style={{ width: 360 }}>
    <Textarea label="Notes" placeholder="Tôi ăn cơm." rows={3} />
  </div>
);

export const WithError = () => (
  <div style={{ width: 360 }}>
    <Textarea label="Paste from your spreadsheet" defaultValue="hello" rows={3} error="Each row needs an English and a Vietnamese column." />
  </div>
);
