JustViet is a Duolingo-style app for learning Vietnamese: a warm paper page, pastel red and yellow, chunky "raised" controls you want to press, and rounded, friendly type. Build every screen from `window.JustViet` components and the Tailwind utility classes in `components/bundle.css`.

## Content

- Write like an encouraging tutor: short, warm, plain. "Where do you want to learn today?", "Card added ✓", "This can't be undone."
- Greet and celebrate in Vietnamese where it feels natural ("Chào mừng bạn! 👋"); explain in English. Vietnamese words always keep their diacritics: `phở`, `cảm ơn`, never `pho`.
- Address the learner as "you". Buttons are verbs in upper case, set by `Button` itself: Start lesson, Check, Continue, Save card, Delete.
- Destructive confirmations name the thing and the consequence: `"xin chào" and its full review history will be permanently deleted. This can't be undone.`
- Emoji appear only as NavCard icons and the odd greeting, never as bullets or decoration.

## Colour

- Page: `color-paper` (`bg-paper`). Cards, inputs and modals: `color-surface` (`bg-surface`). Never a grey or pure-white page.
- Text: `color-ink-900` for headings and body, `color-ink-700` for labels and dialog copy, `color-ink-500` for secondary lines only (it is 4.25:1 on paper). `color-ink-300` is for borders and placeholders, never readable text. No pure black anywhere.
- Brand red `color-red-500` is the primary action and the logo; brand yellow `color-yellow-400` is the secondary action. Each raised fill pairs with its darker edge: red-500 over `color-red-700`, yellow-400 over `color-yellow-600`, success over `color-success-dark`.
- Tints carry tone without shouting: `red-50`/`red-100`, `yellow-50`/`yellow-100` for tiles, badges and hover washes.
- Errors: `color-red-500` border with `color-red-600` text. Correct/Good: `color-success`. The one cool colour is Tailwind's sky (`color-sky-*`) for "New" and the Easy rating.
- Known contrast gaps, kept exactly as the app ships them: white labels on red-500 (3.3:1) and on success (3.0:1), yellow-600 badge text on yellow-100 (2.2:1).

## Type

- Headings, buttons, badges' bigger cousins and every big Vietnamese word: Baloo 2 (`font-heading`, weights 500-800). Body, labels and inputs: Nunito (`font-body`, 400-800). Both load from Google Fonts with Vietnamese subsets.
- Use the styles in Typography: `page-title` and `study-word` (30px/800), `card-title` (20px/800), `body` (16px), `field-label` and `small` (14px), `caption` (12px). Labels and button text are upper case with `tracking-wide`.
- Headings are extrabold (800); never use light weights.

## Shape, space and depth

- Radii are generous: `radius-xl` (12px) for inputs, `radius-2xl` (16px) for buttons, `radius-3xl` (24px) for cards and modals, `radius-full` for badges, pills and the Switch.
- Spacing follows Tailwind's 4px step (`space-1`). Fields stack with `gap-4`; buttons sit in rows with `gap-3`; cards pad `p-6`; dashboard tiles use `gap-5`.
- Depth is a solid bottom edge, not a blur: buttons use `border-b-4` in the darker shade and drop 2px on press (`active:translate-y-0.5`); tiles use `shadow-tile`. Only overlays (Modal, Toast, Tooltip) get soft shadows.
- Borders are 2px (`border-2`), in `color-ink-300` at 60% for inputs and a tint for tiles. Focus is a 4px yellow ring (`focus:ring-4 ring-yellow-100` with `border-yellow-500`), red when the field has an error.

## Building screens

- No provider is needed. Wrap the screen in `<div className="min-h-full bg-paper text-ink-900 font-body">`.
- Reach for a component before writing markup: `Button` (never a hand-made button), `TextField`/`Select`/`Textarea` (they pass through every native attribute: `value`, `onChange`, `placeholder`, `type`, `rows`), `Modal`/`ConfirmDialog`/`Toast` rendered conditionally.
- `Button` is full width by default: pass `fullWidth={false}` inside rows and tables.
- Only classes compiled into `components/bundle.css` exist. Every palette token works as `bg-*`, `text-*`, `border-*` and `ring-*`; for layout glue the classes the app already uses work (`flex`, `grid`, `grid-cols-2`, `gap-*`, `p-*`, `rounded-*`), otherwise use inline `style`.

```jsx
const { Button, TextField, Badge, NavCard } = window.JustViet;

<main className="min-h-full bg-paper text-ink-900 font-body" style={{ padding: 32 }}>
  <h1 className="font-heading text-3xl font-extrabold">Chào mừng bạn! 👋</h1>
  <p className="mt-1 font-semibold text-ink-500">Where do you want to learn today?</p>
  <div className="grid grid-cols-2 gap-5" style={{ marginTop: 24 }}>
    <NavCard href="/vocab-srs" icon="🧠" label="Vocab SRS" description="Review words with spaced repetition" tone="yellow" />
    <NavCard href="/goals" icon="🎯" label="Goals" description="Set and track your learning targets" tone="red" />
  </div>
  <div className="flex flex-col gap-4 rounded-3xl border-2 border-ink-300 bg-surface p-6" style={{ marginTop: 24 }}>
    <div className="flex items-center gap-2">
      <span className="font-heading text-3xl font-extrabold">phở</span>
      <Badge tone="yellow">Noun</Badge>
    </div>
    <TextField label="English" placeholder="noodle soup" />
    <Button>Check</Button>
  </div>
</main>
```

## Iconography and brand marks

- There is no icon set. NavCard tiles use a single emoji as their icon (🎯 📖 🔎 🧠 🌟 💬); controls use text glyphs (`×` to close, `?` for hints, `✓` in toasts).
- The logo is the `Logo` component: a red rounded tile holding ⭐ beside the wordmark "Just" in ink and "Viet" in red. Use it, never redraw it; there is no separate logo file.

## Not synced

Built from the GitHub repository Benguin21/JustViet (branch claude/project-thread-zs3dgu at 63af156) by bundling the app's real components. Screens tied to Firebase are not included: the login, sign-up and password forms, the vocab card list and modals, the study session, the settings panel, the dashboard and the app header.
