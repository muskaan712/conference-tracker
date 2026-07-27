import type { Metadata } from "next";
import { PersonalPaperBoard } from "@/components/personal-paper-board";

export const metadata: Metadata = {
  title: "My Papers",
  description:
    "A private, local-only planner for your own papers — stored in your browser, never sent anywhere.",
  alternates: { canonical: "/my-papers" },
};

export default function MyPapersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">My papers</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          A private planning board for your own papers. Everything here is stored only in this
          browser&apos;s local storage — nothing is sent to a server, and nobody else can see it.
        </p>
      </div>
      <PersonalPaperBoard />
    </div>
  );
}
