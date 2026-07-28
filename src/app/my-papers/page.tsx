import type { Metadata } from "next";
import { PersonalPaperBoard } from "@/components/personal-paper-board";
import { MyPapersIntro } from "@/components/my-papers-intro";

export const metadata: Metadata = {
  title: "My Papers",
  description:
    "A private planner for your own papers — stored in your browser as a guest, or synced to your account via Firebase when signed in.",
  alternates: { canonical: "/my-papers" },
};

export default function MyPapersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">My papers</h1>
        <MyPapersIntro />
      </div>
      <PersonalPaperBoard />
    </div>
  );
}
