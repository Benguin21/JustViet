import { Select } from "justviet-app";

export const Labeled = () => (
  <div style={{ width: 320 }}>
    <Select label="Part of speech" defaultValue="noun">
      <option value="noun">Noun</option>
      <option value="verb">Verb</option>
      <option value="adjective">Adjective</option>
      <option value="phrase">Phrase</option>
    </Select>
  </div>
);

export const Unlabeled = () => (
  <div style={{ width: 320 }}>
    <Select defaultValue="added" aria-label="New card order">
      <option value="added">Order added</option>
      <option value="random">Random</option>
    </Select>
  </div>
);

export const WithError = () => (
  <div style={{ width: 320 }}>
    <Select label="Deck" defaultValue="" error="Choose a deck for this card.">
      <option value="">Select a deck…</option>
      <option value="food">Food</option>
    </Select>
  </div>
);
