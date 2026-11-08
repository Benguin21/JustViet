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
- `npm run test:rules` — `firestore.rules` against the Firestore emulator
  (`test/rules/`, its own Vitest config; needs Java, fetches
  `firebase-tools` through npx). Run it after any change to the rules or to
  `src/lib/xp/repository.ts`. If it hangs, a stale emulator may hold port
  8080: `pkill -f cloud-firestore-emulator`.

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
  `home/` (Rồng Con's homepage), `goals/` (the Goals tab), `vocab-srs/` and
  `dictionary/` (all below), plus a stub page per remaining nav section
  (`grammar/`, `skills/`, `community/`), each just rendering
  `<ComingSoon />` with its own copy. Flesh these out in place as features land.
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
- `src/lib/vocab/repository.ts` — the only file of the Vocab feature that
  imports `firebase/firestore` (the homepage has its own, below). Data model: `users/{uid}/vocabCards/{id}`,
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

## Dictionary feature

`src/app/(app)/dictionary/page.tsx`: browse in Vietnamese alphabetical
order (with an A–Y jump bar), search Vietnamese or English, open a word,
add it to the Vocab SRS, and add your own words. The same layering as the
Vocab SRS: pure, unit-tested logic in `src/lib/dictionary/*`, one hook for
the page, and Firestore in one repository file.

**Three separate kinds of data, never merged into one record** (see the
comment at the top of `src/lib/dictionary/types.ts`):

1. **Shared entries.** The app-wide dataset, a static file
   `public/dictionary/shared.json` (one entry per line), loaded once per
   page load by `shared-source.ts`. It's read-only at runtime, so no user
   can overwrite a shared definition, and it costs no Firestore reads. It's
   generated from a spreadsheet by `npm run dictionary:import [file]`
   (`scripts/import-dictionary.mts`; defaults to
   `data/dictionary/just-viet-dictionary.xlsx`; also accepts .csv/.tsv).
   Columns are matched by header name (`DATASET_HEADER_ALIASES` in
   `dataset.ts`), and rows repeating a headword are merged into one entry
   with several senses. To update the dictionary, edit the spreadsheet,
   re-run the import, and commit both files. The script runs on plain
   Node 24 (native TS type stripping) with no dependencies; it reads .xlsx
   with `node:zlib`.
2. **Personal entries.** `users/{uid}/dictionaryEntries/{docId}`
   (`repository.ts`, the only dictionary file that imports
   `firebase/firestore`; covered by the existing per-user rule in
   `firestore.rules`, so no rules change). If a personal entry's headword
   is also a shared word, it's an *overlay* ("My meanings" / notes) shown
   under the shared entry, not a second copy of the word. Headwords can't
   be renamed on edit, because the headword is the link key. To change a
   spelling, delete the word and re-add it.
3. **SRS cards.** These stay entirely in the Vocab SRS. A card links to a
   dictionary word through the optional `VocabCard.dictionaryKey`.
   Older cards, and cards added without the dictionary box, have no link
   and are matched by their normalized `front` instead
   (`srs-link.ts#findSrsCard`). That way an existing card is never
   duplicated, and its progress is never touched.

**The headword key is the stable dictionary ID** (`normalize.ts#headwordKey`):
NFC, trimmed, single-spaced, and lowercased, with tone marks and other
diacritics preserved. So "Xin Chào" = "xin chào" (in either Unicode
encoding), but "ma" / "má" / "mà" are different words. Accent-insensitive
matching (`foldDiacritics`) is only for search suggestions, never for
duplicate detection. Known gap: old- vs new-style tone placement ("hoà"
vs "hòa") produces different keys; normalizing that would need its own
rule.

**Duplicate prevention happens at two layers.** The forms check the
loaded index as you type (`WordFormModal` shows "already in your
dictionary", with *View entry* / *Add my meaning to it*). The persistence
layer can't race, either:

- Personal entry doc IDs are derived from the key
  (`personalEntryDocId`), and creates run in a transaction that fails if
  the doc exists (`DuplicateDictionaryEntryError`).
- "Add to Vocabulary" cards use the doc ID `dict_<encoded key>`, created
  transactionally (`vocab/repository.ts#createDictionaryCard`). A double
  click, or two tabs, returns the existing card instead of writing.

These paths are covered by `repository.test.ts` against an in-memory
Firestore fake (`src/test/fake-firestore.ts`).

**Ordering** (`collation.ts`): Vietnamese alphabet order (a ă â b c d đ
e ê …), with tones breaking ties in the order ngang < huyền < hỏi < ngã <
sắc < nặng. Words are compared syllable by syllable, so compounds group
under their first syllable (ba < ba ba < bà < bà con). This is
deliberately not `Intl.Collator("vi")`, which interleaves entries and
varies across ICU versions.

**The list is virtualized** (`DictionaryList.tsx`). Every row, letter
headers included, is `ROW_HEIGHT` tall, and only the rows near the
viewport are mounted. The visible window comes from a
`useSyncExternalStore` scroll subscription whose snapshot is a primitive
`"first:count"` string, so it stays stable between events (see the
`useNow` note above).

**Linking between Vocab and the Dictionary.** `/vocab-srs?card=<id>`
opens a card's details, and `/dictionary?word=<headword>` opens a word.
Both pages wrap their content in `<Suspense>`, which `useSearchParams`
needs in production builds. The Vocab "Add Card" form has an "Also add
this word to my Dictionary" box, unchecked by default. When checked,
`dictionary/service.ts#ensureDictionaryEntryForCard` links the card to
an existing shared or personal entry, or creates a personal one, and
the card is saved with `dictionaryKey`. When unchecked, the Dictionary
isn't touched.

### Future: universal in-context lookup (not built yet)

The plan: hover (desktop) or long-press (touch) any Vietnamese word in
lessons to see a popup, with **no visual indicator on the text**. The
pieces to build it on are already in place:

- **One lookup service.** `DictionaryIndex` (`dictionary-index.ts`) is
  pure and UI-independent. Use `get(text)` for exact lookup and
  `matchesAt(text, offset)` for every entry covering a character
  position, longest first. Hovering "học" in "học sinh" yields
  ["học sinh", "học"], so the popup can lead with the compound and still
  offer the single word. `segment(text)` does a greedy longest match over
  a whole string. Matching works on syllable sequences up to
  `maxSyllables` and never joins across punctuation. Don't split text on
  spaces to find words.
- **One data source.** Build the index from `loadSharedDictionary()`
  (cached per page load) plus the user's personal entries. Never create a
  second dictionary store for lessons.
- **Reusable UI.** `EntryDetails` (presentational, no data or actions) and
  `AddToVocabButton` (two-state, `size="sm"`) are what a compact popup or
  mobile bottom sheet should render. "In SRS?" is
  `findSrsCard(cards, key)`, and adding is `cardInputFromHeadword` +
  `useVocabData().addDictionaryCard`.
- **Suggested shape.** Lift the index into a `DictionaryProvider` in
  `src/app/(app)/layout.tsx`, loaded lazily the first time a lookup
  happens. Add a `<LookupText>` wrapper (or one delegated listener on a
  lesson container) that maps the pointer to a text offset with
  `document.caretPositionFromPoint` / `caretRangeFromPoint`, calls
  `matchesAt`, and positions the popup. Use pointer events with a hold
  timer that is cancelled on move/scroll for long-press, so scrolling,
  text selection, and controls keep working. Provide a keyboard
  alternative (e.g. select text, then press a shortcut) and an
  `aria-live` region for screen readers. Wrapping text must not change
  its styling.
- **Onboarding.** Once this ships (and not before), add the
  Cô Tươi / Thầy Vinh explanation and an interactive demo sentence to
  first-run onboarding, since the words carry no visual cue.

## Homepage: Rồng Con

`/home` is a dragon companion that grows with the learner's level (see XP
and levels below): today's goal cards (each shows a Vietnamese dish), an
egg that cracks with XP and hatches into a Baby Dragon at Level 5, speech bubbles,
and two teachers (Cô Tươi, Thầy Vinh) who run a first-visit intro and the
hatching milestone. It was designed on the JustViet Design canvas
(https://claude.ai/artifact/5LFnFo85BXbFJk6swP39kQ, board "HomeDraft")
and ported one to one.

- `src/lib/companion/` — the rules, pure and unit tested
  (`companion.test.ts`): `goals.ts` (settings, eligibility, tiers and
  bonuses, `progressFromReviews`), `ledger.ts` (Home's view of today in the
  XP ledger: claims, bonuses held, dishes and lines said, plus `historyXp`;
  `settleLedger` re-derives today's bonuses from progress so re-settling
  never double-counts, `ledgerChanges` is what Home sends back), `menu.ts`
  (each goal's dish for the day, seeded by date), `growth.ts` +
  `crackTables.ts` (stages by level, cracks, flakes), `lines.ts` (what Rồng
  Con says), `profile.ts`.
- `src/lib/companion/repository.ts` — only Rồng Con's profile,
  `users/{uid}/companion/profile` (`onboarded`, `levelSeen`, `seenXp`;
  saved in a transaction so `onboarded` only turns on and `levelSeen` only
  goes up). Everything about XP, goals and claims is the XP ledger's.
- `src/lib/companion/useCompanionData.ts` — loads, once per sign-in: the
  goals and established time zone, the XP total and today's day record,
  today's XP events and Vocab review logs, and the profile. It pays any of
  today's Vocab reviews whose award failed (safe to repeat). Vocab progress
  is the number of distinct new cards studied today; Grammar and Skills
  come from the day record's completion counts. If the load fails the page
  shows a retry button and never renders from a blank ledger.
- `src/components/companion/HomeCompanion.tsx` — the engine: a class
  component that ports the board's logic (timed beats, feeding flights,
  the reactions queue, the dialogue's position, the teacher guide). It
  never saves during render: the constructor queues the settled ledger and
  `componentDidMount` sends it. Don't name a field `refs` on it (React
  resets `this.refs` on mount); the view's element refs are `viewRefs`.
- Generated from the board by `scripts/home-board-to-app.py` (don't edit by
  hand): `HomeView.tsx` (the markup, reading every value from
  `HomeCompanion.renderVals()`), `companion.css` (the board's CSS scoped
  under `:where(.jv-root)` so it neither leaks to other pages nor raises
  specificity; the board's `.hidden` is renamed `.unshown` because
  Tailwind's `.hidden` is `display:none`) and `art.ts` (dish and teacher
  drawings as SVG `<defs>`). To bring in a newer board, download
  `HomeDraft.dc.html` from the canvas, re-run the script and port any
  logic changes into `HomeCompanion.tsx` by hand.
- A goal card's check feeds Rồng Con once the goal is ready; a fed goal
  stays checked for the rest of the day and can't be unticked. Only losing
  its eligibility (say a reviewed card was deleted) takes the claim and its
  bonus back, through the ledger's unclaim. The cards show only the XP
  ("Ready to feed · +10 XP", "+10 XP earned"), never the tier name.
- Home shows the level, total XP and XP to the next level on Rồng Con's
  card, and a small "Level up!" cue the first time a level is reached
  (`levelSeen`). XP earned elsewhere since Home last showed it (`seenXp`)
  lands when Home opens. Rồng Con hatches at Level 5 and grows its full
  body (no shell pieces) at Level 10; it evolves every 10 levels
  (`evolutionFor` in `growth.ts`), with art for later evolutions to come.
  Before Level 5 the egg's cracks run on the board's 0 to 250 scale,
  converted from XP by `eggUnits`.
- Both fonts load the `vietnamese` subset (root layout), or letters such
  as ợ and ỗ fall back to another font.
- Until Rồng Con hatches, the intro's card shows just the whole egg
  (`#jvEggShell`, no cracks or peek). After that it shows Rồng Con through
  `<use href="#jvDragonArt">`. A `<use>` copy only sees its own subtree, so
  `#jvDragonArt` carries `jv-root` (added by the script) and the dragon's
  state classes sit on the group just inside it.
- The peek (hole, face, cracks, flakes) is drawn around x=131 and shifted
  21px left (`translate(-21 0)`) so it sits on the egg's centre line; the
  cracks are clipped to the shell (`#jvShellClip`). What shows through the
  hole steps up with XP (`HOLE_STEPS`, `REVEAL` in `growth.ts`).

## XP and levels

One XP ledger for the whole app, in `src/lib/xp/` (pure and tested in
`plan.test.ts`, `levels.test.ts`; rules in `test/rules/`):

- `levels.ts` — 100 levels, cumulative thresholds interpolated linearly
  between the benchmarks (Level 5 700 XP, 10 1,960 … 100 252,000).
  `levelFor`, `levelProgress` (XP into the level, to the next, fraction).
  XP keeps counting past Level 100.
- `events.ts` — activity XP (Vocab card 1, new Grammar lesson 50, Grammar
  review 10, Reading 30, Listening 30), the 100 a day flashcard cap, and
  each event's deterministic id: `vocab_{day}_{card}`,
  `grammar-new_{lesson}`, `grammar-review_{day}_{lesson}`,
  `reading_{day}_{id}`, `listening_{day}_{id}`, `goal_{day}_{goal}_{seq}`.
  The id is what makes every award idempotent.
- `plan.ts` — the pure planner: given the total, the day record and the
  goals, what one award or claim writes (or null). A Vocab card pays once
  per card per day until the cap; a lesson pays 50 the first time and 10 as
  a review on a later day (once a day); a goal claim pays its tier's bonus
  and an unclaim takes back exactly what it paid (`seq` odd = claimed).
- `repository.ts` — the XP system's only `firebase/firestore` importer.
  Data: `users/{uid}/xp/total` (`total`, `rev`, `last`),
  `users/{uid}/days/{day}` (targets locked for the day, claim `seq`,
  `bonus`, flashcard count, Grammar/Skills completions, Home's dishes and
  lines) and `users/{uid}/xpEvents/{id}` (uid, kind, amount, day, source,
  ids, `reverses`, server timestamp). Every award is one transaction that
  writes the event, the total and the day together. `awardVocabReview` is
  called by the Vocab page after each review; `completeGrammarLesson` and
  `completeSkill` are for the Grammar and Skills screens to call when a
  lesson or activity is finished (not opened).
- `day.ts` — days are the learner's established local calendar day: the
  time zone saved in `settings/goals` on first use, so a refresh or another
  device can't start a new day (or reset the cap) early.
- `firestore.rules` repeats the planner's checks for every write to
  `xp`, `xpEvents` and `days`, so the browser alone can't set a total,
  pay an event twice, change a locked target or claim the wrong bonus. It
  must be published in the Firebase console after changing.
- Goal bonuses come from the chosen target's tier (`goalTier` in
  `src/lib/companion/goals.ts`): Grammar and Skills 1 Small (+10), 2 Medium
  (+20), 3 to 5 Big (+30); Vocab 1 to 4 Starter (+0), 5 to 9 Small, 10 to 14
  Medium, 15 to 50 Big. A goal's target locks for the day at its first
  activity or claim (`days/{day}.targets`); a new target for it starts the
  next day, so switching tiers mid-day earns nothing extra.
- XP restarted at 0 with this system (no migration): the old
  `companion/ledger` doc and the profile's `hatchSeen` are no longer read.

## Goals tab

`src/app/(app)/goals/page.tsx` → `GoalsForm` (`src/components/goals/`): a
card per goal (Grammar, Vocab, Skills) with its on/off switch and a native
range slider (whole steps; mouse, touch and keyboard for free). Beside each
slider: the target ("15 new flashcards per day") and its tier ("Big · +30
XP"); the selected track darkens with difficulty (`goalSliders.ts`,
`goal-slider.css`). Nothing is saved until Save goals, which writes
`settings/goals` through `useGoalSettings` and never awards XP; the page
then says when each change applies (today, or tomorrow for a goal already
underway).

## Teachers and lessons

Cô Tươi and Thầy Vinh are equal Vietnamese teachers: either one teaches
any lesson type, they differ only in personality and look.
`src/lib/lessons/teachers.ts` holds both (names, card colours, short voice
lines for a lesson to use around its own content) and
`teacherForLesson({ order, teacher? })`: teachers take turns by whole
lesson in a course's order (lesson 1 Cô Tươi, 2 Thầy Vinh, 3 Cô Tươi…),
so reopening or resuming a lesson always gets the same teacher. A lesson
can pin `teacher` if a course is ever reordered. Lesson content never
names its teacher; the Grammar/Skills lesson screens, when built, should
call `teacherForLesson` once per lesson and keep that teacher through every
explanation, exercise and piece of feedback. `guides.ts` re-exports
`TEACHERS` for the homepage intro.
