import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True once every required Firebase env var has been provided. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  // `experimentalForceLongPolling` skips Firestore's default WebSocket-vs-
  // long-polling auto-detection handshake, which was measured (via a fresh
  // test account + network capture) to take anywhere from several seconds
  // to ~30s+ before falling back to long-polling anyway in some network
  // environments (proxies, certain security/antivirus browser extensions,
  // some sandboxes) — this was the actual cause of the Vocab page's slow
  // initial load, not query volume. Forcing long-polling immediately is
  // Firestore's own documented fix for exactly this symptom.
  try {
    firestoreInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    // initializeFirestore throws if a Firestore instance already exists for
    // this app (e.g. this module re-evaluating under Next.js Fast Refresh)
    // — fall back to the existing instance rather than crashing dev mode.
    firestoreInstance = getFirestore(app);
  }
}

/**
 * The Firebase Auth instance, or `undefined` if NEXT_PUBLIC_FIREBASE_* env
 * vars haven't been set yet (see .env.local.example). Callers should check
 * `isFirebaseConfigured` before using this.
 */
export const auth = authInstance;

/**
 * The Firestore instance, or `undefined` if Firebase isn't configured yet.
 * Backs all per-user app data (vocab cards, review logs, SRS settings) —
 * see `src/lib/vocab/repository.ts`.
 */
export const db = firestoreInstance;
