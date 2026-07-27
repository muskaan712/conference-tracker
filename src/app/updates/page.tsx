import type { Metadata } from "next";
import { getAllAuditEntries } from "@/lib/conferences";
import { RecentUpdates } from "@/components/recent-updates";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Updates",
  description:
    "Recently verified and changed conference records, drawn from the reviewed audit trail.",
  alternates: { canonical: "/updates" },
};

export default function UpdatesPage() {
  const entries = getAllAuditEntries();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Updates</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Every change below has already been through the weekly automated-discovery → human-review
          → merge pipeline described in the{" "}
          <a href="/methodology" className="text-accent underline underline-offset-2">
            methodology
          </a>{" "}
          page. Nothing here was published without a human checking it first.
        </p>
      </div>
      <RecentUpdates entries={entries} />
    </div>
  );
}
