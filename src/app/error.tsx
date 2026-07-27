"use client";

import { ErrorState } from "@/components/misc";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      description="An unexpected error occurred while rendering this page."
      action={
        <button
          type="button"
          onClick={reset}
          className="bg-accent text-accent-foreground rounded-full px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      }
    />
  );
}
