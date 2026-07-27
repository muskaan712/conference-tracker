import type { Metadata } from "next";
import { getAllEditions } from "@/lib/conferences";
import { ResubmissionPlanner } from "@/components/resubmission-planner";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Resubmission Planner",
  description:
    "Find conferences whose deadlines leave enough time to prepare a resubmission after notification.",
  alternates: { canonical: "/planner" },
};

export default function PlannerPage() {
  const editions = getAllEditions();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Resubmission planner</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Tell us when you expect to hear back and how much buffer you need, and we&apos;ll surface
          venues whose next deadline gives you enough runway.
        </p>
      </div>
      <ResubmissionPlanner editions={editions} />
    </div>
  );
}
