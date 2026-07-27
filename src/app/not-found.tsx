import Link from "next/link";
import { EmptyState } from "@/components/misc";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you're looking for doesn't exist, or the conference may have been renamed."
      action={
        <Link
          href="/conferences"
          className="bg-accent text-accent-foreground rounded-full px-4 py-2 text-sm font-medium"
        >
          Browse conferences
        </Link>
      }
    />
  );
}
