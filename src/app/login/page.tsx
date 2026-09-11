"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { isFirebaseConfigured, useAuth } from "@/lib/auth-context";

type Mode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-linear-to-b from-yellow-100 via-paper to-red-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-8" />

        {!isFirebaseConfigured && (
          <p className="mb-4 rounded-xl border-2 border-yellow-500 bg-yellow-50 px-4 py-3 text-sm font-semibold text-ink-700">
            Firebase isn&apos;t configured yet. Copy{" "}
            <code className="rounded bg-yellow-200 px-1">.env.local.example</code>{" "}
            to <code className="rounded bg-yellow-200 px-1">.env.local</code>{" "}
            and add your Firebase project keys to enable login.
          </p>
        )}

        <div className="rounded-3xl border-2 border-ink-300/40 bg-surface p-8 shadow-[0_6px_0_rgba(74,47,34,0.08)]">
          {mode !== "forgot" && (
            <div className="mb-6 flex rounded-2xl bg-yellow-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-xl py-2 text-sm font-bold tracking-wide uppercase transition-colors ${
                  mode === "login"
                    ? "bg-surface text-red-500 shadow-sm"
                    : "text-ink-500"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-xl py-2 text-sm font-bold tracking-wide uppercase transition-colors ${
                  mode === "signup"
                    ? "bg-surface text-red-500 shadow-sm"
                    : "text-ink-500"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <h1 className="font-heading mb-6 text-center text-2xl font-extrabold">
              Reset your password
            </h1>
          )}

          {mode === "login" && (
            <LoginForm
              onSuccess={() => router.push("/home")}
              onForgotPassword={(email) => {
                setForgotEmail(email);
                setMode("forgot");
              }}
            />
          )}
          {mode === "signup" && (
            <SignupForm onSuccess={() => router.push("/home")} />
          )}
          {mode === "forgot" && (
            <ForgotPasswordForm
              initialEmail={forgotEmail}
              onBackToLogin={() => setMode("login")}
            />
          )}
        </div>
      </div>
    </main>
  );
}
