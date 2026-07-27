"use client";

import { useState } from "react";
import Link from "next/link";
import {
  registerWithEmail,
  resendEmailVerification,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth-actions";
import { describeAuthError, friendlyAuthError } from "@/lib/firebase/auth-errors";
import { Dialog } from "@/components/dialog";

type Mode = "sign-in" | "sign-up" | "reset";

const TITLES: Record<Mode, string> = {
  "sign-in": "Sign in",
  "sign-up": "Create account",
  reset: "Reset password",
};

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

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
        // Stay open — the user needs to know a verification email is on the
        // way rather than the modal silently vanishing on them.
        setSignedUpEmail(email);
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
      const outcome = await signInWithGoogle();
      if (outcome.status === "signed-in") onClose();
      // "redirecting": the page is navigating away; nothing left to do here.
    } catch (err) {
      const info = describeAuthError(err);
      setError(info.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendStatus(null);
    try {
      await resendEmailVerification();
      setResendStatus("Verification email sent again.");
    } catch (err) {
      setResendStatus(friendlyAuthError(err));
    }
  }

  if (signedUpEmail) {
    return (
      <Dialog onClose={onClose} title="Check your email" className="max-w-sm">
        <p className="text-sm">
          Account created for <strong>{signedUpEmail}</strong>. We&apos;ve sent a verification link
          — click it to confirm your email address.
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          You&apos;re already signed in and can start using cross-device sync now; verification just
          confirms this address is really yours.
        </p>
        {resendStatus && (
          <p role="status" className="mt-2 text-xs">
            {resendStatus}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleResendVerification}
            className="border-border-strong rounded-full border py-2 text-sm font-medium"
          >
            Resend verification email
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-accent text-accent-foreground rounded-full py-2.5 text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog onClose={onClose} title={TITLES[mode]} className="max-w-sm">
      <p className="text-muted-foreground mb-4 text-xs">
        Optional — only needed for cross-device sync of My Papers and saved plans. Browsing and
        guest My Papers work without an account. See{" "}
        <Link href="/privacy" className="text-accent underline">
          what an account stores
        </Link>
        .
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
    </Dialog>
  );
}
