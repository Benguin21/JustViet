# JustViet

A friendly, Duolingo-style webapp for learning Vietnamese.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your Firebase project keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on `/login`
until you sign in.

### Firebase setup

Auth and app data are powered by Firebase Auth + Firestore. In the
[Firebase console](https://console.firebase.google.com/):

1. Create a project (or use an existing one) and add a Web app to it.
2. Copy the web app's config into `.env.local` (see `.env.local.example`
   for the variable names).
3. Under **Authentication → Sign-in method**, enable the **Email/Password**
   provider.
4. Under **Firestore Database**, click **Create database** (production
   mode is fine — the rules below lock it down).
5. In **Firestore Database → Rules**, paste in the contents of
   [`firestore.rules`](./firestore.rules) and **Publish**. This is what
   keeps each signed-in user's vocab cards private to them.

That's enough to create accounts, log in, send password-reset emails, and
use the Vocab SRS feature.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Firebase (Auth +
Firestore) · `ts-fsrs` (spaced-repetition scheduling) · Vitest

See `AGENTS.md` for architecture notes and common commands.
