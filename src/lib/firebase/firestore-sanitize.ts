/**
 * Firestore's `WriteBatch.set()`/`setDoc()` reject any field whose value is
 * `undefined` — including nested ones — throwing
 * `FirebaseError: Function WriteBatch.set() called with invalid data.
 * Unsupported field value: undefined (found in field ...)`.
 *
 * App records (PersonalPaper, SavedResubmissionPlan, ...) legitimately have
 * optional properties (`currentTarget`, `currentTarget.slug`, `codeName`,
 * `notes`, ...) that are `undefined` when unset, so every payload must be
 * sanitized before it reaches the Firestore SDK.
 *
 * Firestore *does* accept `null`, `false`, `0`, and `""` — only `undefined`
 * is unsupported — so this only ever strips keys/elements that are exactly
 * `undefined`, nothing else.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function sanitizeValue(value: unknown, path: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item === undefined) {
        // Firestore has no concept of a sparse array slot. Silently
        // dropping the element would shift every later index and silently
        // change array order/length in a way the caller can't see —
        // surfacing a loud, specific development error is safer than a
        // quiet data-corrupting rewrite.
        throw new Error(
          `sanitizeForFirestore: array element at ${path}[${index}] is undefined. ` +
            "Firestore cannot store undefined array elements and silently removing " +
            "one would shift the array's order — fix the value being written instead.",
        );
      }
      return sanitizeValue(item, `${path}[${index}]`);
    });
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      const fieldValue = value[key];
      if (fieldValue === undefined) continue;
      result[key] = sanitizeValue(fieldValue, path ? `${path}.${key}` : key);
    }
    return result;
  }

  // Primitives (including null, false, 0, "") and any non-plain object
  // (Date, Firestore FieldValue sentinels, etc.) pass through untouched.
  return value;
}

/**
 * Recursively removes `undefined` properties (and, for arrays, throws on any
 * `undefined` element — see above) so the result is always safe to pass to
 * `setDoc`/`WriteBatch.set()`. Never mutates its input; always returns a new
 * value built from scratch.
 */
export function sanitizeForFirestore<T>(value: T): T {
  return sanitizeValue(value, "") as T;
}
