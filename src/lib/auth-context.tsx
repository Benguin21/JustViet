"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  /** True until we know whether a user is signed in. */
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // If Firebase isn't configured, onAuthStateChanged will never fire, so
  // there's nothing to wait for — start "loaded" in that case.
  const [loading, setLoading] = useState(() => Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function requireAuth() {
  if (!auth) {
    throw new Error(
      "Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* keys to .env.local (see .env.local.example).",
    );
  }
  return auth;
}

export { isFirebaseConfigured };

/** Creates an account and sets the user's display name. */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
) {
  const credential = await createUserWithEmailAndPassword(
    requireAuth(),
    email,
    password,
  );
  if (displayName.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }
  return credential.user;
}

/** Logs an existing user in with email + password. */
export async function logIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(
    requireAuth(),
    email,
    password,
  );
  return credential.user;
}

/** Signs the current user out. */
export async function logOut() {
  await signOut(requireAuth());
}

/** Sends a password-reset email. */
export async function resetPassword(email: string) {
  await sendPasswordResetEmail(requireAuth(), email);
}
