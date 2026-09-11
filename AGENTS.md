<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JustViet

A Duolingo-style webapp for learning Vietnamese. Next.js 16 (App Router,
Turbopack, TypeScript, `src/` dir) + Tailwind CSS v4 + Firebase Auth.

## Commands

- `npm run dev` — start the dev server (Turbopack) at localhost:3000
- `npm run build` — production build; also type-checks (`next build` runs
  `tsc` as part of the build)
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npx tsc --noEmit` — type-check only, faster than a full build

There is no test runner configured yet.

## Environment / Firebase setup

Auth is Firebase Auth (client SDK only, no backend of our own). Copy
`.env.local.example` to `.env.local` and fill in a Firebase web app's config
(`NEXT_PUBLIC_FIREBASE_*`). `.env.local` is gitignored. Without it,
`src/lib/firebase.ts` leaves `auth` as `undefined` and `login` renders a
banner instead of failing silently — check `isFirebaseConfigured` before
assuming `auth` exists.

The Firebase console needs the **Email/Password** sign-in provider enabled
for signup/login/password-reset to work.

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
`:active`; reuse it instead of one-off button styles. Headings/buttons use
the Baloo 2 font (`--font-heading`), body text uses Nunito
(`--font-body`), both loaded via `next/font/google` in the root layout.
