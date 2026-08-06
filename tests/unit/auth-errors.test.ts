import { describe, expect, it } from "vitest";
import { describeAuthError, friendlyAuthError } from "@/lib/firebase/auth-errors";

describe("describeAuthError", () => {
  it("preserves the raw Firebase error code alongside a friendly message", () => {
    const result = describeAuthError({ code: "auth/popup-blocked" });
    expect(result.code).toBe("auth/popup-blocked");
    expect(result.message).toMatch(/popup/i);
  });

  const cases: Array<[string, RegExp]> = [
    ["auth/unauthorized-domain", /domain/i],
    ["auth/operation-not-allowed", /enabled/i],
    ["auth/popup-blocked", /popup/i],
    ["auth/popup-closed-by-user", /closed/i],
    ["auth/cancelled-popup-request", /progress/i],
    ["auth/account-exists-with-different-credential", /different sign-in method/i],
    ["auth/network-request-failed", /network/i],
    ["auth/too-many-requests", /too many attempts/i],
  ];

  it.each(cases)("maps %s to an actionable, distinct message", (code, expected) => {
    const result = describeAuthError({ code });
    expect(result.code).toBe(code);
    expect(result.message).toMatch(expected);
    expect(result.message).not.toBe("Something went wrong. Please try again.");
  });

  it("falls back to a generic message for unrecognised codes without leaking internals", () => {
    const result = describeAuthError({ code: "auth/some-brand-new-error" });
    expect(result.code).toBe("auth/some-brand-new-error");
    expect(result.message).toBe("Something went wrong. Please try again.");
  });

  it("handles a non-Firebase error value (no code property) without throwing", () => {
    const result = describeAuthError(new Error("network down"));
    expect(result.code).toBe("unknown");
    expect(result.message).toBe("Something went wrong. Please try again.");
  });

  it("assigns a different message to each mapped code (no silent collapsing)", () => {
    const messages = new Set(cases.map(([code]) => describeAuthError({ code }).message));
    expect(messages.size).toBe(cases.length);
  });
});

describe("friendlyAuthError", () => {
  it("returns just the message string", () => {
    expect(friendlyAuthError({ code: "auth/wrong-password" })).toBe("Incorrect email or password.");
  });
});
