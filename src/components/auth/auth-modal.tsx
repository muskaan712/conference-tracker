"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth-actions";

type Mode = "sign-in" | "sign-up" | "reset";

function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account already exists — try signing in instead.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts — please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "sign-in") {
        await signInWithEmail(email, password);
        onClose();
      } else if (mode === "sign-up") {
        await registerWithEmail(email, password);
        onClose();
      } else {
        await sendPasswordReset(email);
        setResetSent(true);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Reset password"
        }
        className="border-border bg-surface relative w-full max-w-sm rounded-xl border p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">
            {mode === "sign-in"
              ? "Sign in"
              : mode === "sign-up"
                ? "Create account"
                : "Reset password"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover:bg-accent-soft rounded-full p-1.5"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <p className="text-muted-foreground mb-4 text-xs">
          Optional — only needed for cross-device sync of My Papers and saved plans. Browsing and
          guest My Papers work without an account.
        </p>

        {resetSent ? (
          <p role="status" className="text-sm">
            If an account exists for that email, a password reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            {mode !== "reset" && (
              <div>
                <label htmlFor="auth-password" className="mb-1 block text-sm font-medium">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-border-strong bg-surface w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-accent-foreground w-full rounded-full py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "sign-up"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>
        )}

        {mode !== "reset" && !resetSent && (
          <>
            <div className="my-4 flex items-center gap-2 text-xs">
              <span className="bg-border h-px flex-1" />
              or
              <span className="bg-border h-px flex-1" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="border-border-strong bg-surface w-full rounded-full border py-2.5 text-sm font-medium disabled:opacity-60"
            >
              Continue with Google
            </button>
          </>
        )}

        <div className="mt-4 flex flex-col gap-1 text-center text-xs">
          {mode === "sign-in" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setError(null);
                }}
                className="text-accent hover:underline"
              >
                Need an account? Create one
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError(null);
                }}
                className="text-muted-foreground hover:underline"
              >
                Forgot password?
              </button>
            </>
          )}
          {mode !== "sign-in" && (
            <button
              type="button"
              onClick={() => {
                setMode("sign-in");
                setError(null);
                setResetSent(false);
              }}
              className="text-accent hover:underline"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
