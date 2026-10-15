# design-sync notes (JustViet → Claude Design)

## How this repo is wired
- JustViet is a Next.js app, not a published package: there is no dist/ or shipped .d.ts. `.design-sync/pkg/` is a
  stand-in package root (`package.json` named `justviet-app`) whose `index.ts` re-exports the synced slice of
  `src/components`. All `cfg.*` paths are relative to that dir (hence `../../src/components`).
- Run `node .design-sync/build.mjs` (cfg.buildCmd) before the converter. It (1) compiles Tailwind from
  `.design-sync/tailwind.css` (imports `src/app/globals.css`, scans the repo + previews, safelists the brand palette)
  into `pkg/.cache/tailwind.out.css` (= cfg.cssEntry), and (2) emits .d.ts via `tsconfig.dts.json` into `pkg/types/`,
  rewriting the `@/` alias to relative paths so ts-morph can resolve `CardStatus` etc. It needs `.ds-sync/` staged
  first (uses `.ds-sync/node_modules/.bin/tailwindcss`; install `@tailwindcss/cli@<tailwindcss version>` there).
- Converter command: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle`
  (entry comes from cfg.entry). Chromium: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` + `playwright@1.56` in `.ds-sync`
  (pins chromium-1194) in the cloud container.
- Fonts: next/font isn't available outside Next, so `.design-sync/fonts/` ships Baloo 2 (500-800) + Nunito
  (400-800), latin/latin-ext/vietnamese subsets, copied from @fontsource (OFL). `tailwind.css` points
  `--font-baloo`/`--font-nunito` at those families. If layout.tsx changes weights, update the font copy.
- `pkg/process-shim.ts` gives the browser bundle a `process.env` because next/link (NavCard) reads
  `process.env.__NEXT_*` at module scope; without it every card threw `process is not defined`.
- Overlays (Modal, ConfirmDialog, Toast) are `position: fixed`; their previews wrap them in a frame with
  `transform: translateZ(0)` so the overlay is contained by the card instead of the capture viewport.
- `cfg.dtsPropsFor.RatingButtons` inlines `IntervalPreview`/`CardRating` (the extractor left them as bare names).
  Hand-written: if `IntervalPreview` in `src/lib/vocab/srs.ts` changes, update it.
- Inherited DOM props (onClick, value, onChange, placeholder, type...) are filtered from the emitted `.d.ts` for
  Button/TextField/Select/Textarea; the conventions header tells the design agent they pass through.

## Scope
- Synced (user chose "core components", 2026-10-15): Badge, Button, ConfirmDialog, Modal, Select, Switch, TagInput,
  TextField, Textarea, Toast, Tooltip, Logo, NavCard, StatusBadge, RatingButtons. Firebase-bound screens (auth forms,
  vocab modals/lists, StudySession, AppHeader, RequireAuth) are deliberately excluded - add them to `pkg/index.ts`
  only with a Firebase stub.

## Known render warns
- none outstanding (GRID_OVERFLOW on Switch/TagInput/Textarea/Tooltip fixed with cardMode column).
- Tooltip `Open` forces the hover state via `[&_[role=tooltip]]:opacity-100` on the preview wrapper.

## Re-sync risks
- `tailwind.out.css` only contains classes Tailwind found in the repo + previews + the safelist; a design agent
  using any other utility gets nothing. The safelist in `tailwind.css` covers the palette only.
- `dtsPropsFor.RatingButtons` and the font copies are hand-maintained snapshots of app code.
- next/link is bundled outside Next; NavCard renders a plain anchor. A Next upgrade that changes Link's
  module-scope requirements could break the bundle (look for runtime errors on NavCard first).

## Design System Artifact (new home, replaces the standalone Claude Design site)
- Lives at https://claude.ai/artifact/86tE99EjtveFPJRE2Ke47K (created 2026-10-15). Claude Design's standalone site
  is being retired (usable until 2026-12-14); this Artifact is the target from now on, not a DesignSync project.
- `node .design-sync/build.mjs && node .design-sync/artifact-build.mjs` writes its `components/` (bundle.js against
  React 18 globals, bundle.css with Google-hosted fonts, index.d.ts, one preview.html per authored preview, card
  groups/heights from `artifact-cards.json`) to `.design-sync/.cache/artifact/project/components/`. index.d.ts copies
  the converter's ds-bundle/ .d.ts, so run the converter first. tokens.json, README.md, component READMEs and the
  cover were hand-written into the Artifact; re-sync by reading them back from the Artifact and editing in place.
- bundle.css wraps the app's unlayered `:root` token block in `@layer base` so the Artifact's tokens.css wins.
