# JustViet design conventions

JustViet is a Duolingo-style Vietnamese learning app: warm paper background, pastel red/yellow, chunky "raised"
controls, friendly rounded type. Build every screen from `window.JustViet.*` components plus Tailwind utility
classes from the shipped stylesheet.

## Setup
No provider or wrapper is needed: components are plain React and styled entirely by `styles.css` (Tailwind
utilities + brand tokens + fonts). Put the page on the paper background and ink text yourself:
`<div className="min-h-full bg-paper text-ink-900 font-body">`.

## Styling idiom: Tailwind utilities with brand tokens
Use these token utilities (all exist in the stylesheet as `bg-*`, `text-*`, `border-*`, `ring-*`):

| Family | Tokens | Use |
|---|---|---|
| surfaces | `paper` (page), `surface` (cards/inputs, white) | backgrounds |
| red | `red-50 … red-700` (`red-500` primary, `red-700` its raised edge) | primary actions, brand |
| yellow | `yellow-50 … yellow-600` (`yellow-400` secondary, `yellow-600` edge) | secondary actions, highlights |
| ink | `ink-900` text, `ink-700` labels, `ink-500` muted, `ink-300` borders/placeholders | all text (never pure black) |
| status | `success`, `success-dark` | correct/positive |

Fonts: `font-heading` (Baloo 2, for headings, buttons, big Vietnamese words) and `font-body` (Nunito, default).
h1-h3 already use the heading font. Section labels follow the inputs' pattern:
`text-sm font-bold tracking-wide text-ink-700 uppercase`. Cards: `rounded-3xl border-2 bg-surface p-6`,
optionally with the raised shadow `shadow-[0_4px_0_rgba(74,47,34,0.06)]`.

Only classes present in the compiled stylesheet work (there is no Tailwind compiler at design time). The palette
above is guaranteed; for anything else beyond common layout utilities (`flex`, `grid`, `gap-*`, `p-*`, `rounded-*`),
use inline `style={{…}}` for layout glue rather than inventing class names.

## Components
- `Button`: `variant` primary | secondary | outline | ghost | danger, `size` md | sm, `loading`. It is full-width by
  default; pass `fullWidth={false}` inline or in tables. Never hand-roll buttons.
- `TextField`, `Select`, `Textarea`: `label` + `error`, and they pass through every native attribute
  (`value`, `onChange`, `placeholder`, `type`, `defaultValue`, `rows`, `<option>` children).
- `Modal` (`title`, `onClose`, `maxWidth` md | lg | xl | 2xl) and `ConfirmDialog` render a fixed full-screen
  overlay; `Toast` is fixed to the bottom center. Render them conditionally.
- `Badge` (`tone` gray | yellow | red | green | blue), `StatusBadge` (`status` of an SRS card), `Switch`,
  `TagInput`, `Tooltip` (a "?" hint), `Logo`, `NavCard` (dashboard tile with emoji `icon`, `tone` red | yellow),
  `RatingButtons` (Again/Hard/Good/Easy with interval labels).

Per-component API: `components/<group>/<Name>/<Name>.d.ts` and `.prompt.md`. Tokens and fonts: `styles.css` and
its imports (`_ds_bundle.css` holds the compiled utilities).

## Example
```jsx
const { Button, TextField, Badge, NavCard } = window.JustViet;

<div className="min-h-full bg-paper text-ink-900 font-body" style={{ padding: 32 }}>
  <h1 className="text-3xl font-extrabold">Chào mừng bạn! 👋</h1>
  <p className="mt-1 font-semibold text-ink-500">Where do you want to learn today?</p>
  <div className="grid grid-cols-2 gap-5" style={{ marginTop: 24 }}>
    <NavCard href="/vocab-srs" icon="🧠" label="Vocab SRS" description="Review words with spaced repetition" tone="yellow" />
    <NavCard href="/goals" icon="🎯" label="Goals" description="Set and track your learning targets" tone="red" />
  </div>
  <div className="rounded-3xl border-2 border-ink-300 bg-surface p-6" style={{ marginTop: 24 }}>
    <div className="flex items-center gap-2"><span className="font-heading text-2xl font-extrabold">phở</span><Badge tone="yellow">Noun</Badge></div>
    <TextField label="English" placeholder="noodle soup" />
    <Button style={{ marginTop: 16 }}>Check</Button>
  </div>
</div>
```
