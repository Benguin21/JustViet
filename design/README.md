# JustViet design backup

A copy of the JustViet design work that lives in Claude artifacts, kept in the
repo in case those links ever stop working. Snapshot taken 2026-11-17 (canvas refreshed after the Goals and Dictionary boards were added); the Goals board was refreshed on 2026-11-20 (canvas version `1795162510-e9a2`) for the five-block goal selectors.

| Folder | Source artifact | What it is |
| --- | --- | --- |
| `canvas/` | [JustViet Design canvas](https://claude.ai/artifact/5LFnFo85BXbFJk6swP39kQ) (version `1794893953-ae65`) | The design canvas: grammar lesson board and the Rồng Con homepage boards |
| `design-system/` | [JustViet design system](https://claude.ai/artifact/86tE99EjtveFPJRE2Ke47K) (version `1794082418-249b`) | Components, colour/type/spacing tokens and the brand guide |
| `screenshots/` | rendered from `canvas/` | What each board looks like, viewable anywhere |

Only the files we wrote are backed up. The viewer code each artifact type
provides (the canvas app and its `dc-runtime.js`) belongs to Claude and isn't
copied here.

## canvas/

- `canvas.json` — board layout, titles and sizes on the canvas.
- `Main.dc.html` — grammar lesson: word order (390×844).
- `Home.dc.html` — the old app homepage (1280×640).
- `HomeDraft.dc.html` — the Rồng Con homepage design (1280×1320). This is the
  source `scripts/home-board-to-app.py` turns into `src/components/companion/`.
- `HomePhone.dc.html` — the same homepage embedded at phone width (390×2100).
- `Goals.dc.html` — the Goals tab: a card per goal with its Off button, five-block target selector and bonus badge (1280×1320). Its Tweaks set a Vocab goal already underway today and a Vocab target saved under the old slider.
- `Dictionary.dc.html` — the Dictionary tab: A–Y browse, search and Add to Vocabulary (1280×1320).
- `ds/justviet/` — the copy of the design system the canvas was built with.

**To view:** open the screenshots in `screenshots/`. To restore an editable
canvas, create a new Design artifact in Claude and upload these files with the
same paths (or ask Claude to "rebuild the canvas from `design/canvas/`").
The boards are HTML files driven by the Design runtime: each one loads
`./support.js`, which the Design artifact supplies. With a copy of that runtime
saved as `canvas/support.js`, every board except `HomePhone` also open directly
in a browser; `HomePhone` needs the canvas itself, because it imports
`HomeDraft` through the canvas.

## design-system/

- `README.md` — the brand guide: voice, colour, type, shape and how to build screens.
- `tokens.json` — 27 colour tokens, type styles, spacing, radii and shadow.
- `design-system.json` — the artifact's settings.
- `components/` — `bundle.js` (all 15 components on `window.JustViet`, built
  against React 18 globals), `bundle.css` (compiled Tailwind and fonts),
  `index.d.ts` (props), and per component a `README.md` and `preview.html`.

**To view:** `README.md` and the component READMEs read fine on GitHub. To
restore it, create a new Design System artifact and upload these files with the
same paths, or rebuild from the app's code with `.design-sync/` (see
`.design-sync/NOTES.md`), which is how this design system was made.

`screenshots/Dictionary.png` shows the top of the list only.
`screenshots/design-system-components.png` is a sheet of the component
previews from the first sync (2026-10-15).
