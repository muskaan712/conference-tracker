/**
 * Maps a raw Firebase Auth error to a user-facing message, while always
 * preserving and logging the real error code — the UI must never collapse
 * every failure into one generic "something went wrong" string, since that
 * makes misconfiguration (unauthorized domain, disabled provider, …)
 * impossible for a real user or developer to diagnose.
 */
export interface AuthErrorInfo {
  code: string;
  message: string;
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/email-already-in-use": "An account already exists — try signing in instead.",
  "auth/weak-password": "Choose a password with at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
  "auth/network-request-failed": "Network error — check your connection and try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/requires-recent-login": "For your security, please sign in again to continue.",

  // Google / popup / redirect specific.
  "auth/unauthorized-domain":
    "This site's domain isn't authorised for sign-in yet. (Firebase console → Authentication → Settings → Authorized domains.)",
  "auth/operation-not-allowed":
    "Google sign-in isn't enabled for this project yet. (Firebase console → Authentication → Sign-in method.)",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups for this site and try again.",
  "auth/popup-closed-by-user": "Sign-in window closed before finishing. Please try again.",
  "auth/cancelled-popup-request": "Another sign-in attempt is already in progress.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method. Try signing in with email and password instead.",
};

function extractCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "unknown";
}

/** Returns both the raw Firebase error code and a safe, actionable user-facing message. */
export function describeAuthError(error: unknown): AuthErrorInfo {
  const code = extractCode(error);
  if (process.env.NODE_ENV !== "production") {
    // Never suppressed in dev — this is exactly what makes provider
    // misconfiguration (unauthorized domain, disabled provider, …) debuggable.
    console.error("[auth] Firebase auth error:", code, error);
  }
  return { code, message: MESSAGES[code] ?? "Something went wrong. Please try again." };
}

/** Convenience wrapper for call sites that only need the display string. */
export function friendlyAuthError(error: unknown): string {
  return describeAuthError(error).message;
}
