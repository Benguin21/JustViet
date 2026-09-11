<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JustViet

A Duolingo-style webapp for learning Vietnamese. Next.js 16 (App Router,
Turbopack, TypeScript, `src/` dir) + Tailwind CSS v4 + Firebase (Auth +
Firestore).

## Commands

- `npm run dev` — start the dev server (Turbopack) at localhost:3000
- `npm run build` — production build; also type-checks (`next build` runs
  `tsc` as part of the build)
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npx tsc --noEmit` — type-check only, faster than a full build
- `npm run test` — Vitest, run once (`npm run test:watch` for watch mode).
  Run a single file with `npx vitest run path/to/file.test.ts`.

## Environment / Firebase setup

Auth is Firebase Auth; app data (vocab cards, review logs, SRS settings) is
Firestore — both client SDK only, no backend of our own. Copy
`.env.local.example` to `.env.local` and fill in a Firebase web app's config
(`NEXT_PUBLIC_FIREBASE_*`). `.env.local` is gitignored. Without it,
`src/lib/firebase.ts` leaves `auth`/`db` as `undefined` and pages render a
banner instead of failing silently — check `isFirebaseConfigured` before
assuming either exists.

The Firebase console needs: the **Email/Password** sign-in provider enabled
(Authentication → Sign-in method) for signup/login/password-reset, and a
**Firestore Database** created (Build → Firestore Database → Create
database) with `firestore.rules`'s contents published (Firestore →
Rules tab) — that file is what isolates each user's data by uid.

## Architecture

**Auth flow.** `src/lib/auth-context.tsx` holds the single Firebase `auth`
subscription (`AuthProvider`, mounted in the root layout) plus the
`signUp` / `logIn` / `logOut` / `resetPassword` action functions — this is
the one place that touches `firebase/auth`. Pages/components read state via
the `useAuth()` hook, never `onAuthStateChanged` directly.

**Route protection is client-side only.** There's no server session/cookie
— `src/components/auth/RequireAuth.tsx` wraps the `(app)` route group's
layout, watches `useAuth()`, and redirects to `/login` once loading
finishes with no user (rendering nothing in the meantime to avoid a
content flash). `/` itself (`src/app/page.tsx`) just redirects to `/home`
or `/login` based on the same hook. If a real backend/session is added
later, route protection should move to `proxy.ts` (Next 16 renamed
`middleware.ts` → `proxy.ts`) backed by a Firebase session cookie —
client-only guarding is not a security boundary.

**Routing layout:**
- `src/app/login/page.tsx` — single page, three modes (login/signup/forgot
  password) toggled by local state, not separate routes; see
  `src/components/auth/*Form.tsx`.
- `src/app/(app)/` — route group for everything behind `RequireAuth`:
  `home/` (the 6-button dashboard) plus one stub page per nav section
  (`goals/`, `grammar/`, `dictionary/`, `vocab-srs/`, `skills/`,
  `community/`), each just rendering `<ComingSoon />` with its own
  copy. Flesh these out in place as features land.
- `src/app/(app)/layout.tsx` renders `AppHeader` (logo + user greeting +
  logout) and wraps children in `RequireAuth`.

**Theme.** Pastel red/yellow, Duolingo-style — colors are CSS custom
properties in `src/app/globals.css` (Tailwind v4's `@theme inline`, no
`tailwind.config.js`) rather than Tailwind defaults, so extend the palette
there. `Button` (`src/components/ui/Button.tsx`) implements Duolingo's
"raised" look via a solid face + darker `border-b-4` that flattens on
`:active`; reuse it instead of one-off button styles (it defaults to
`fullWidth`; pass `fullWidth={false}` for inline/table use). Headings/buttons
use the Baloo 2 font (`--font-heading`), body text uses Nunito
(`--font-body`), both loaded via `next/font/google` in the root layout.

**Reading the clock during render.** React 19's `react-hooks/purity` rule
flags `Date.now()`/`Math.random()` called directly in a component body —
use `useNow()` (`src/lib/useNow.ts`, a `useSyncExternalStore`-backed clock)
instead of `Date.now()` in render code. Don't call `Date.now()` inside
`getSnapshot` itself — it must return a *cached*, stable value between
store-change notifications, or React sees "torn" state and re-renders in
an infinite loop (this bit us once during development; see the comment in
that file).

## Vocab SRS feature

Everything lives on one page, `src/app/(app)/vocab-srs/page.tsx`
(tabs: Cards / Study / Settings, plus a dashboard). The algorithm/data
layer is intentionally UI- and Firestore-free where possible, so it's unit
testable — see `src/lib/vocab/*.test.ts`.

- `src/lib/vocab/types.ts` — the shared vocabulary (`VocabCard`,
  `ReviewLogEntry`, `SrsSettings`, etc). Timestamps are plain epoch-ms
  numbers throughout, not Firestore `Timestamp` or `Date`.
- `src/lib/vocab/srs.ts` — the scheduling algorithm. Wraps `ts-fsrs`
  (FSRS — Free Spaced Repetition Scheduler); nothing else in the app
  imports `ts-fsrs` directly. Pure functions: `applyReview`,
  `previewIntervals` (powers the "Again — 10m / Good — 4d" button labels),
  `createNewCardFields`, `rescheduleForRetention`.
- `src/lib/vocab/scheduler.ts` — turns a card list + today's review logs
  into what the UI needs: `buildStudyQueue` (respects daily limits/new-card
  order/mixing), `computeTodayStats`, `computeProgressStats`,
  `computeForecast`, `computeReviewHeatmap`. Also pure.
- `src/lib/vocab/settings.ts` — `DEFAULT_SRS_SETTINGS` and
  `validateSrsSettings`.
- `src/lib/vocab/repository.ts` — the *only* file that imports
  `firebase/firestore`. Data model: `users/{uid}/vocabCards/{id}`,
  `users/{uid}/reviewLogs/{id}` (flat, not nested under the card, so
  daily-limit/heatmap queries don't need a composite index), and
  `users/{uid}/settings/srs`. `submitReview` writes the card update and
  its review-log entry in one `writeBatch` so they can't desync. Reads are
  one-time (`getDocs`/`getDoc`), **not** `onSnapshot` — see below.
- `src/lib/vocab/useVocabData.ts` — the one hook the page uses: fetches
  cards/logs/settings once per sign-in, plus every mutation action, each
  normalizing Firestore errors via `firestore-errors.ts` (mirrors
  `auth-errors.ts`'s pattern) so callers just catch and show `err.message`.
  Every mutation updates local state directly from what it wrote (e.g.
  `addCard` appends the created card returned by `repo.createCard`) rather
  than waiting on a listener or re-fetching — this is what makes
  create/import/review feel instant and is why `CardFormModal`/
  `BatchImportModal` can safely close themselves right after their
  `onSubmit`/`onImport` promise resolves.

**Why one-time reads instead of `onSnapshot`:** an earlier version used
live listeners on all three collections and gated the whole page behind
all three loading. Investigating a "page takes ~a minute to load" report
(see git history) found two compounding problems: (1) a real bug —
`handleError` never marked a failed subscription "loaded", so a single
subscription error left `loading` stuck `true` forever with no way for
the error banner to ever render; (2) in the environment where this was
tested, Firestore's realtime `Listen` channel was failing outright with
`PERMISSION_DENIED: Cloud Firestore API has not been used in project ...
or it is disabled` and retrying with growing backoff (10s, then 20s, then
30s+) rather than failing fast — a project-level Google Cloud API
enablement/propagation issue, not something fixable in this codebase. If
the Vocab page is slow to load again, check that first: the error message
names the exact console URL to enable the API. `experimentalForceLongPolling`
is set in `firebase.ts` as a standard mitigation for the broader class of
"WebChannel slow to establish" issue (proxies, some security/antivirus
browser extensions) even though it didn't move the needle for the specific
API-disabled case above. Given none of this app's features need
cross-tab/cross-device live sync, one-time fetch + optimistic local updates
sidesteps the whole class of problem and is simpler besides — don't
reintroduce `onSnapshot` here without a real reason.
- `src/components/vocab/*` — UI, one concern per file (`CardList`,
  `CardFormModal`, `CardDetailModal`, `StudySession`, `RatingButtons`,
  `SettingsPanel`, `VocabDashboard`, …).

**Why FSRS / `ts-fsrs`:** hand-rolling FSRS's stability/difficulty math is
easy to get subtly wrong; `ts-fsrs` is small, dependency-free, and already
handles both long-term scheduling and short-term learning/relearning steps
through one API (`learning_steps`/`relearning_steps` params +
`fsrs.repeat`/`fsrs.next`). We deliberately don't expose FSRS's raw `w`
weight vector or build a parameter optimizer — see the note in the
Settings panel's Algorithm section.

**Study-session queue behavior:** `StudySession` snapshots its queue once
at mount (`useState(initialQueue)`); cards still in `learning`/
`relearning` after being rated get appended back onto that local queue so
they resurface later in the same session (short learning steps), while
graduated/reviewed cards leave for good. It does not live-sync with
Firestore mid-session by design.

**Batch import** (paste from Excel/Sheets, no file upload):
`src/lib/vocab/import.ts` is the pure parsing/validation pipeline
(`parseImportText` → delimiter detection + header-vs-positional column
mapping → `buildImportPreview` → duplicate/missing-field flags), tested in
`import.test.ts`. `BatchImportModal.tsx` is the only caller; it holds the
live-editable preview grid as its own state (re-derived from `parseImportText`
whenever the pasted text/delimiter changes, but not when `existingCards`
changes — reopen the modal if you need fresh dedup against very recent
edits). Imported cards go through `repository.createCards` (batched
`writeBatch`, chunked at 400), which shares the exact same
`buildNewCardDoc` shaping as a single manually-created card — there's no
separate "imported card" type. Note the deliberate front/back mapping:
the import format is "English | Vietnamese" (matching how a learner would
naturally fill in a spreadsheet), but internally Vietnamese → `front` and
English → `back`, matching the manual Add Card form's orientation
(`front` = the term being studied, shown on the study screen's flashcard
face). Also added two optional card fields for this, `pronunciation` and
`notes` (both `string | undefined` — see the comment on `VocabCard` in
`types.ts` for why they're optional even though newly-written cards always
get a value).
