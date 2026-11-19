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
  `tsc` as part of the build). If Turbopack fails with "Can't resolve
  '@vercel/turbopack-next/internal/font/google/font'", it couldn't download
  the Google Fonts on this network (its downloader doesn't share Node's
  network settings); `npx next build --webpack` builds the same app and
  downloads fonts through Node.
- `npm run deploy` — publishes the site to Firebase Hosting (project
  `just-viet`, live at https://learnjustviet.com and
  https://just-viet.web.app). It runs `next build --webpack` (the app is a
  static export, `output: "export"` → `out/`), then
  `scripts/fix-export-segments.mjs` (fixes a Next.js static-export bug on
  Windows that misnames prefetch files), then `firebase deploy --only
  hosting`. Hosting config (clean URLs, security headers, caching) is in
  `firebase.json`. Firestore rules are still published by hand.
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npx tsc --noEmit` — type-check only, faster than a full build
- `npm run test` — Vitest, run once (`npm run test:watch` for watch mode).
  Run a single file with `npx vitest run path/to/file.test.ts`.
- `npm run test:rules` — `firestore.rules` against the Firestore emulator
  (`test/rules/`, its own Vitest config; needs Java, fetches
  `firebase-tools` through npx). Run it after any change to the rules or to
  `src/lib/xp/repository.ts` or `src/lib/community/repository.ts`. If it
  hangs, a stale emulator may hold port 8080: `pkill -f cloud-firestore-emulator`.
- `node scripts/community-drift.mts --key <service-account.json> [--fix]` —
  checks the live Community counts against their records (see Community).
- `node scripts/community-moderator.mts --key <service-account.json> --grant <email|uid>`
  (or `--revoke`, `--list`) — gives or takes away Community moderator rights.
- `node scripts/purge-deleted-accounts.mts --key <service-account.json> [--apply]` —
  finishes deleting accounts whose sign-in account is gone (run it at least
  monthly; see "Deleting an account").

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
Rules tab) — that file is what isolates each user's data by uid. The
account system needs more console settings; see "Firebase console settings
for sign-in" under Accounts and sign-in below.

## Architecture

**Auth flow.** `src/lib/auth-context.tsx` holds the single Firebase `auth`
subscription (`AuthProvider`, mounted in the root layout) plus every auth
action function (sign-up, login, Google, password reset, email links,
settings changes) — this is the one place that touches `firebase/auth`.
Pages/components read state via the `useAuth()` hook (`user`, `loading`,
`emailVerified`, `providers.password` / `providers.google`), never
`onAuthStateChanged` directly. Firebase mutates the `User` object in place,
so each action calls `notifyUserChanged()` and the provider bumps a
version to re-render consumers. Details in "Accounts and sign-in" below.

**Route protection is client-side only.** There's no server session/cookie
— `src/components/auth/RequireAuth.tsx` wraps the `(app)` route group's
layout, watches `useAuth()`, and redirects to `/login?next=<current path>`
once loading finishes with no user (rendering nothing in the meantime to
avoid a content flash); after signing in, the login page sends them back
there. `next` is untrusted input, so `safeNextPath`
(`src/lib/auth/next-path.ts`) only accepts a same-site path starting with
a single "/" and falls back to /home otherwise (no open redirects). `/` itself (`src/app/page.tsx`) just redirects to `/home`
or `/login` based on the same hook. If a real backend/session is added
later, route protection should move to `proxy.ts` (Next 16 renamed
`middleware.ts` → `proxy.ts`) backed by a Firebase session cookie —
client-only guarding is not a security boundary. (`/` is the public
landing page, not a redirect.)

**Routing layout:**
- `src/app/(marketing)/` — the public website, server-rendered and visible
  without signing in: `/` (landing page), `/privacy`, `/terms`,
  `/guidelines` (the community guidelines). See "Public website" below.
- `src/app/login/page.tsx` — single page, three modes (login/signup/forgot
  password) toggled by local state, not separate routes; see
  `src/components/auth/*Form.tsx`.
- `src/app/(app)/` — route group for everything behind `RequireAuth`:
  `home/` (Rồng Con's homepage), `goals/` (the Goals tab), `vocab-srs/` and
  `dictionary/`, `community/` (all below), plus a stub page per remaining
  nav section (`grammar/`, `skills/`), each just rendering `<ComingSoon />`
  with its own copy. Flesh these out in place as features land.
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

## Public website

The marketing site lives in the same Next.js app and on the same domain as
the study app (Google's OAuth branding requires the home page and privacy
policy to be on the app's own verified domain). Route group
`src/app/(marketing)/` with its own header and footer
(`src/components/marketing/`):

- `/` — landing page. **Copy rule:** describe only features that exist
  today; anything planned is labelled "Coming soon". Calls to action are
  auth-aware (`HeroCtas`/`HeaderCtas`): signed-in visitors get "Continue
  learning" → /home.
- `/privacy` and `/terms` — drafts written to match what the app actually
  does (Firebase Auth + Firestore only, no analytics or ads, the Have I
  Been Pwned check, small sessionStorage/localStorage preferences and
  drafts, and the Community: what members see, private votes, confidential
  reports, retention). **Whenever data collection or a processor changes**
  (Community Phases 2–3, payments, mobile apps, analytics, a new host),
  update the Privacy Policy and its date in `src/lib/site.ts` first. They
  need legal review before launch. The Terms' "Your content" section links
  `/guidelines`. **Age:** JustViet itself has no minimum age (under 18 with a
  parent or guardian's permission; under 13, a parent or guardian creates
  and looks after the account). Only the Community requires 13+, checked by
  its own question (Terms "Who can use JustViet", Privacy "Children").
- `src/lib/site.ts` — the business facts used everywhere: operator
  ("JustViet LLC", Utah — update to the registered name once formed),
  contact email, governing law, document dates, and the site URL from
  `NEXT_PUBLIC_SITE_URL` (set it to the real domain in production; it
  drives `metadataBase`, the sitemap and robots.txt).
- SEO and icons: `src/app/robots.ts` (public pages allowed, app routes
  disallowed), `sitemap.ts`, `icon.png`, `apple-icon.png`, `favicon.ico`
  and `opengraph-image.png` (made from `public/brand/`, which holds the
  logo files).
- Links that look like buttons use `ButtonLink` (styles shared with
  `Button` via `components/ui/button-styles.ts`, which is a plain module so
  server components can use it) — never wrap a `<button>` in a `<Link>`.

**Planned and designed for, not built:** a monthly subscription with a
free trial (the Pricing section and Terms §8 describe it as future; when
it ships, update both, add the payment processor to the Privacy Policy,
and consider a cross-platform subscription service so web, iOS and
Android share one entitlement), and native mobile apps (same Firebase
account; Terms already mention app-store billing).

## Accounts and sign-in

Login, signup and "forgot password" share `src/app/login/page.tsx`
(`?view=signup|forgot` opens a tab; `?next=` is where to go afterwards,
except that a brand-new account — email signup, or a first Google sign-in
per `getAdditionalUserInfo(...).isNewUser` — always lands on /home, where
Rồng Con's intro runs).
Account settings are `src/app/(app)/settings/page.tsx`; Firebase's email
links land on `src/app/auth/action/page.tsx`.

**Sign-in methods: email + password, and Google.** Google uses a popup,
falling back to a full-page redirect only if the popup is blocked
(`completeGoogleRedirect()` finishes it on the login and settings pages).
Redirect sign-in relies on third-party storage that Safari, Firefox and
Chrome increasingly block when the site isn't on the same domain as
`authDomain`, so on the live site `authDomain` is the site's own domain:
`src/lib/firebase.ts` uses `learnjustviet.com` when the page is served
there (Firebase Hosting serves `/__/auth/handler` on it), and the
configured `<project>.firebaseapp.com` everywhere else (localhost,
just-viet.web.app). This needs `https://learnjustviet.com/__/auth/handler`
in the OAuth client's authorized redirect URIs (see console settings
below). See https://firebase.google.com/docs/auth/web/redirect-best-practices.

**One account per email address.** Google and password sign-in for the
same email are the same account (same uid, same data):
- Signing in with Google on an email that has a password account throws
  `auth/account-exists-with-different-credential` when Google isn't
  authoritative for that address. The login page keeps the Google
  credential (`pendingGoogleLinkFromError`), asks for the password once,
  then links Google (`linkPendingGoogle`).
- Google *is* authoritative for Gmail addresses, so there Firebase links or
  merges on its own. Caveat: if the password account's email was never
  verified, Firebase replaces the password sign-in with Google (same uid,
  so no data is lost, but the password stops working). Settings explains
  this to unverified password users, and they can set a password again.
- Settings can connect/disconnect Google (never the last sign-in method)
  and give a Google-only account a password. That uses the reset-link
  email, because with email enumeration protection on, Firebase rejects
  `linkWithCredential` with an email credential from the browser.

**Passwords** (`src/lib/auth/password-rules.ts`, `breach-check.ts`,
`new-password.ts`; tested): at least 10 characters, max 128; not a common
password or obvious pattern (built-in list plus sequence/repeat/keyboard
checks, after undoing letter swaps like p@ssw0rd and trailing digits); not
in a known breach (Have I Been Pwned range API, k-anonymity: only the
first 5 hex characters of the SHA-1 leave the browser, with
`Add-Padding`). If the breach check can't run, the password is allowed.
No forced symbol/number/case mix; the strength meter rewards length.
`validateNewPassword` is the one check used by signup, settings and the
reset-link page. Existing accounts with shorter passwords still sign in.

**Email verification.** Signup sends a verification email (Google accounts
start verified). Learning features don't require it; `VerifyEmailBanner`
(in the `(app)` layout) reminds, offers Resend, can be dismissed for the
browser session, and re-checks on tab focus. `refreshUser()` reloads the
user and, when the email just became verified, refreshes the ID token so
Firestore rules checking `request.auth.token.email_verified` (the
Community will) see it immediately.

**Email links (`/auth/action`).** Handles `resetPassword` (applies the
password rules, then signs the user in), `verifyEmail`,
`verifyAndChangeEmail` (signs out afterwards, since Firebase ends sessions
on an email change) and `recoverEmail` (restoring is a button press, then
it offers a password reset). Expired and used links get clear messages.
Each one-time code is used at most once per page load (`once()`), because
StrictMode runs effects twice in development.

**Error messages** (`src/lib/auth-errors.ts`, tested): written for email
enumeration protection, so wrong email and wrong password read the same,
and password-reset requests always "succeed". Firebase still reports
`auth/email-already-in-use` at signup (enumeration protection doesn't
cover sign-up), so that message is worded gently; hiding it fully would
need a server.

**Not possible without a server:** "sign out of all devices" (it needs the
Admin SDK to revoke refresh tokens). Changing the password or email does
end other sessions, because Firebase revokes tokens on those changes.
"Delete my account" is on the settings page; see "Deleting an account"
under Community.

### Firebase console settings for sign-in

All under Authentication in the Firebase console:
- **Sign-in method → Google:** enabled, with a support email.
- **Settings → Authorized domains:** `localhost` and the project's
  `web.app`/`firebaseapp.com` domains are there by default; `learnjustviet.com`
  must be listed too (Google sign-in and email links fail on unlisted
  domains).
- **Google Cloud console → APIs & Services → Credentials → OAuth 2.0
  Client IDs → "Web client (auto created by Google Service)" → Authorized
  redirect URIs:** must include `https://learnjustviet.com/__/auth/handler`
  (alongside the existing `https://just-viet.firebaseapp.com/__/auth/handler`),
  or Google sign-in on learnjustviet.com fails with `redirect_uri_mismatch`.
- **Settings → Password policy:** set the minimum length to 10, leave the
  character requirements off, set enforcement to **Require**, and leave
  **Force upgrade on sign-in** off (otherwise existing users with shorter
  passwords are locked out). It was 6 (the default) when this was built.
- **Settings → User actions → Email enumeration protection:** on (the
  default for projects created after 15 Sep 2023). The app is written for
  it.
- **Templates:** for Password reset, Email address verification and Email
  address change, set the sender name and, under "Customize action URL",
  `https://learnjustviet.com/auth/action` (for local testing,
  `http://localhost:3000/auth/action`). One action URL applies to all
  templates. Until it's set, links use Firebase's default page, which
  works but doesn't apply JustViet's password rules on reset.

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

## Community

A small Reddit-style space where signed-in learners ask Vietnamese
questions, start discussions and answer each other. **Phase 1** (posts,
answers/comments, one reply level, votes, Community XP, accepted answers,
search, reports, hiding, blocking, rate limits) and **Phase 2**
(moderators, the reports queue, removing and restoring content, warnings,
suspensions, bans, in-app notifications; see "Moderation and
notifications" below) and **Phase 3** (daily caps, new-member limits, no
links, name resets, voiding votes, account deletion; see "Limits and
account deletion" below) are built.

**No backend.** Everything is enforced by `firestore.rules`, with the XP
ledger's pattern: each action is one client transaction, and every document
it touches checks the others moved by exactly the right amount
(`get`/`getAfter`/`existsAfter`). The heaviest transactions (a vote,
deleting an answer with replies, a reply that notifies two people) use at
most 17 document lookups, and a moderator removing or restoring an answer
16, counted without caching, under Firestore's 20. Don't add a lookup to
them without recounting. `member()` reads the member's own profile (to
check `banned`), and suspensions live on the activity record that every
contribution already reads, so neither costs an extra lookup.

**Access.** Reading or writing anything needs, checked in the rules: signed
in, a verified email (`request.auth.token.email_verified`), and a community
profile, which can only be created after answering 13+. The only exceptions
are the joining steps (the 13+ answer, reading your own missing profile,
checking a name is free after answering 13+). The UI gate is
`CommunityGate` (verify email with Resend → "Community is for members 13 and
older." → choose a name and colour). The rest of the app stays open to
unverified and under-13 users. Community never reads or writes learning XP,
levels, goals or Rồng Con data, and never shows an email address.

**Files.** The same layering as the Vocab SRS and Dictionary:
- `src/lib/community/` — pure and unit tested: `types.ts` (the data model,
  in its header comment), `limits.ts`, `names.ts`, `votes.ts`,
  `format.ts`, `search.ts`, `posts.ts`, `recompute.ts`, `avatar.ts`,
  `guidelines.ts`. `limits.test.ts` and `names.test.ts` read
  `firestore.rules` and fail if its limits, categories, colours, report
  reasons, reserved names or letter-folding tables drift from these files.
- `repository.ts` — the only Community file that imports
  `firebase/firestore`. One-time reads, transactions for every count.
- `CommunityProvider.tsx` — shared member state for all Community pages
  (mounted once by `src/app/(app)/community/layout.tsx`, a server component
  that also sets `noindex`): joining status, own profile, rate-limit record,
  hidden posts, blocks, and a cache of other members' profiles.
- One data hook per page: `useCommunityFeed`, `usePostThread`,
  `useMemberProfile`, `useNotifications`, `useModeration` (the Blocked
  page uses the provider).
- `src/components/community/*` — UI. Pages are `/community` (feed),
  `/community/ask`, `/community/post?id=`, `/community/profile?uid=`,
  `/community/blocked`, `/community/notifications` and
  `/community/moderate` (moderators). Query parameters, not `[id]` segments, because the
  app is a static export; pages that read them wrap in `<Suspense>`.

**Data** (all top-level, so Phase 3 can delete by uid):
- `communityAge/{uid}` `{ over13, at }`, written once, never by the app
  again. **To correct a wrong answer**, an admin deletes the doc in the
  Firebase console (Firestore → communityAge → the uid); the member is asked
  again on their next visit. Find the uid in Authentication → Users.
- `communityProfiles/{uid}` — name, nameKey, colour, up, down (votes
  received), joinedAt, nameChangedAt, guidelinesAt. Readable by members.
- `communityNames/{nameKey}` `{ uid }` — the uniqueness claim, created and
  released in the same transaction as the profile change.
- `communityActivity/{uid}` — the per-user "last action" record, owner-only:
  `lastPost`/`lastResponse`/`lastVote` (rate limits), `reportDay`/`reports`,
  and this request's `act`, `target`, `at`. The rules use `target` to know
  which vote or response another document's counts must match, and it means
  one transaction can only do one action (one post, one vote, one report).
- `communityPosts/{postId}` and `communityPosts/{postId}/responses/{id}`
  (top-level answers/comments have `parent: null`; replies have the
  top-level id). Counts on posts: `up`, `down`, `score`, `responses`
  (top-level not deleted), `erased` (deleted top-level kept for their
  replies), `accepted`. Posts store `tokens` for search.
- `communityVotes/{p_post_uid | r_post_response_uid}` — one per item and
  voter, value −1/0/1 (0 = removed), readable only by the voter (even a
  missing vote id of someone else's is refused, so votes can't be probed).
- `communityReports/{uid_p_post | uid_r_post_resp | uid_u_uid}` — one per
  reporter and item, `status: "open"`, readable by the reporter and moderators; moderators close them
  as `actioned` or `dismissed` (`resolvedAt`).
- `users/{uid}/communityHidden/{postId}`, `users/{uid}/communityBlocks/{uid}`
  — private lists (excluded from the users catch-all rule, member-only).
- Phase 2: `communityRemoved/{p_post | r_post_response}` (a removed item's
  text; its author and moderators can read it), `communityModLog/{id}`
  (moderators only), `communityInbox/{uid}/notifications/{id}` (owner-only),
  `profile.banned` and `activity.suspendedUntil`.

**Community XP** = upvotes − downvotes received on the member's posts and
top-level responses that aren't deleted (label "Community XP", explained as
"Upvotes received minus downvotes received on your posts and answers.").
Stored on the profile and moved in the vote's transaction; deleting a
contribution subtracts its votes in the delete's transaction. Nothing else
moves it. It can go negative and is always styled neutrally. No levels,
badges or leaderboards. `recompute.ts` derives every count from the
records. **Drift check:** `node scripts/community-drift.mts --key
path/to/key.json` reports drift; add `--fix` to write corrections. The key
is a service account from Firebase console → Project settings → Service
accounts; name it `*.service-account.json` (gitignored) or keep it outside
the repo, and never commit it. With `FIRESTORE_EMULATOR_HOST` set it runs
against the emulator instead.

**Names.** 3–30 characters of Latin letters (every Vietnamese accent),
digits, spaces and `. _ -`, starting and ending with a letter or digit.
Unique ignoring case and accents (`nameKey` = `foldDiacritics`). Letters from
other alphabets are refused, because the rules can't fold Unicode (they map
each accented letter themselves in `nameKeyOf`; the emulator's `lower()` is
ASCII-only) and to stop look-alike impersonation. Reserved: anything
containing admin/moderator/justviet, the teachers' and Rồng Con's names, and
the words mod/staff/support/official/system/team. The first change is
allowed any time, then once every 30 days.

**Posts and responses.** Question or Discussion; title 10–150, body
20–5,000, a category (Grammar, Vocabulary, Pronunciation, Culture, Learning
Tips, Other); answers/comments 1–5,000, replies 1–1,000. Lengths count
UTF-16 units of the cleaned text (JS `.length`, which is also what the
rules' `size()` counts). **Plain text only**: no formatting and no links
(see "No links" below). `TextEditor.tsx` is the text box (it warns about a
link as you type); `CommunityText.tsx` shows the text as paragraphs and line
breaks (`format.ts#paragraphs`), as React text, so markup typed in it, or
left from before formatting was removed, shows exactly as typed. Report,
Hide and Block sit in the small flag menu (`FlagMenu.tsx`) in the
bottom-right corner of each post, answer, comment and reply; Edit, Delete,
Reply, Accept and a moderator's Remove stay visible. Drafts (with the id they'll be created under) stay in
localStorage until they post, and creates do nothing if the id exists, so
retries can't duplicate. "Edited" shows only for edits more than 5 minutes
after posting. Deleting: with nothing under it, removed outright; otherwise
its text and author are erased for good and it shows "deleted by its
author" (excluded from feed, search and profiles, reachable by link).

**Feed and search.** Newest, Top (this week / month / all time by score,
then newer, then id) and Unanswered (questions with no answers that aren't
deleted), with category and type filters, 20 at a time. Every combination
has a composite index in `firestore.indexes.json`; filters are always
applied in the order deleted, category, type, responses, then the sort.
Top's time window is a `createdAt >=` range with `orderBy(score)`, which
relies on Firestore's multiple-inequality support. If a query ever fails
in production with "requires an index", the error links to the index to
create. **Search limits:** accent-folded whole words and word prefixes
only (no matching inside words), one-letter words ignored, prefixes up to
12 letters, at most 500 tokens per post (title first), one query per search
(the 60 newest posts containing the longest word, then the rest are checked
and ranked in the browser, exact accents first).

**Rate limits** (`limits.ts`, mirrored in the rules): 60 s between posts,
15 s between responses or replies, 2 s between votes, 20 reports per UTC
day. The UI shows "Please wait N seconds". Edits aren't limited.

**Publishing.** Rules and indexes go live with
`npx --yes firebase-tools@15 deploy --only firestore:rules,firestore:indexes`
(changes the live database; ask first). Indexes take a few minutes to build;
the feed shows an error until they're ready.

### Moderation and notifications (Phase 2)

**Moderators** are members whose Firebase account has the custom claim
`moderator: true`. Only `scripts/community-moderator.mts` (with a service
account key) sets it, so no browser can make itself a moderator, and the
rules check it with `isMod()` at no lookup cost. A new claim reaches the
browser when the sign-in token refreshes; the Community provider forces a
refresh once per visit, and signing out and in always works. Moderators
need a community profile too. They see a Moderate link, a Remove button on
everything, and a Moderation panel on members' profiles.

- **Reports queue** (`/community/moderate`): open reports grouped by
  target (`groupReports` in `moderation.ts`), with reasons, notes and the
  content. Remove (closes the reports as `actioned`) or Dismiss. Plus a
  Removed tab (restore) and the moderator log. The query needs the
  `communityReports (status, at)` index.
- **Remove / restore**: the public post or response is blanked and marked
  `deleted: true, removed: true` (so the feed, search, votes, edits and
  new responses all leave it alone); its text moves to
  `communityRemoved/{key}`, readable by its author and moderators. Its
  votes come off the author's Community XP (the item keeps its tally, so a
  restore adds it back), and a removed answer stops counting in the post's
  `responses` (it counts in `erased`; acceptance clears). Its author sees
  "A moderator removed your …" and can read or permanently delete the text
  (then it can't be restored). Restoring puts the text and tokens back.
- **Warnings** are a notification and a log entry. **Suspensions**
  (`activity.suspendedUntil`, 1/3/7/30 days) block posting, responding,
  voting, editing and reporting, but not reading or deleting your own
  content; the member's own activity writes must copy the field unchanged.
  **Bans** (`profile.banned`) make `member()` false, so a banned member
  can't read or write anything in the Community except their own profile
  and notifications (the gate shows the reason).
- Every moderator action writes `communityModLog` and notifies the member
  from `"mod"`; members never see which moderator acted.

**Notifications** (`notifications.ts`, `useNotifications`): answers and
comments (to the post's author), replies (to the replied-to author),
mentions (to the "@Name"), accepted answers, and moderation. Each is
written into `communityInbox/{recipient}/notifications` in the same
transaction as the action, with a deterministic id
(`{type}_{post}_{response}`, or `mod_{random}`), and the rules check the
recipient against that action, so they can't be forged. Never to yourself.
The nav shows the unread count (re-counted on tab focus, one-time reads as
everywhere else); notifications from members you've blocked aren't shown.

### Limits and account deletion (Phase 3)

**Daily caps** (per UTC day, `limits.ts`, mirrored in the rules): 10 posts,
100 answers/comments/replies, 300 votes; in a member's first 3 days
(`NEW_MEMBER_DAYS`, from `profile.joinedAt`) 3 posts, 20 responses, 50
votes. The activity record carries `countDay`, `dayPosts`,
`dayResponses` and `dayVotes`; a post, response or vote must add exactly
one to today's count (`countAction`), anything else leaves the counts
alone. Like the report cap, the day comes from the browser's clock, so a
badly wrong clock near midnight UTC can get a refusal. **No links**:
titles, posts, answers, comments and replies can't contain a link or web
address, on creates and edits, for any member. `LINK_PATTERN` in
`limits.ts` defines one: `http://`/`https://`, `www.`, or a word ending in
a common web domain (`.com`, `.vn`, `.ly`, `.me`, …; bare domains with
rarer endings get through, but nothing in Community text is ever
clickable). `findLink` names the offending word for the message; the rules
use the same pattern string with `matches('(?is).*' + LINK_PATTERN() +
'.*')`, and `limits.test.ts` checks the two are identical. No limits use Community XP, by design
(low scores never restrict anyone; karma can be farmed).

**Moderator extras.** *Reset name* (`resetMemberName`): the profile
becomes "Member 123456" (`placeholderName`, claimed for the member, old
name released) with `nameReset: true`; the member sees a banner and can
rename straight away, which clears the flag (then the 30-day wait applies
again). *Cancel their votes* (`voidMemberVotes`, for vote manipulation):
moderators can read any vote, and each vote is set to 0 in its own
transaction (activity `act: "void"`) that moves the item's and author's
counts back. Votes on deleted or removed content, or on the moderator's
own content, are skipped.

**Deleting an account** (Settings → Delete my account,
`DeleteAccountSection` → `account/deleteAccount.ts`):
1. Community (`deleteCommunityData`): withdraws the member's votes (each
   a transaction with `act: "leave"`, which skips the vote wait and works
   while suspended), deletes replies, then answers/comments, then posts
   through the normal delete paths (so anything others replied to is
   erased, not removed), deletes removed copies, notifications, hidden
   posts and blocks, then the profile with its name claim (one batch; the
   rules require both together). It finds the member's responses with a
   collection-group query on `author`, which needs the `responses.author`
   COLLECTION_GROUP field override in firestore.indexes.json.
2. Learning data (`account/repository.ts`): vocabCards, reviewLogs,
   settings, dictionaryEntries, companion.
3. The sign-in account (`deleteSignInAccount` via `withRecentLogin`).

The rules keep some things out of a browser's reach, so they're left for
`scripts/purge-deleted-accounts.mts`: the XP ledger, the 13+ answer, and
the activity record. Keeping the activity record means deleting a profile
and rejoining can't escape a suspension. A banned member can't reach the
Community, so their content is left too. The script finds every uid that
owns data but has no sign-in account, deletes or anonymizes all of it
(content others replied to is erased, the rest deleted; votes deleted),
then fixes every Community count with `findDrift`. Without `--apply` it
only reports. Reports and moderator-log entries are kept. The Privacy
Policy promises this within 30 days, so run it at least monthly. Tested
against the emulators (`emulators:exec --only firestore,auth`; the auth
emulator is in firebase.json).

**Not built** (deliberately left out): post locks, appeals, App Check /
reCAPTCHA (needs keys from the Firebase and Google consoles), and
detecting ban evasion through new accounts.
