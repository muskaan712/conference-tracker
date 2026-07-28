import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy & account data",
  description: "What data this tracker stores, where it lives, and what an account does and doesn't give you.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Privacy &amp; account data</h1>
        <p className="text-muted-foreground mt-1">
          A plain-language account of what {siteConfig.title} stores, where, and what an optional
          account changes.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Conference &amp; event data</h2>
        <p className="text-foreground/90 text-sm">
          Conference, edition, and workshop/event listings are public static JSON files checked into
          this project&apos;s source code. Nothing about them is personal — anyone who visits the site
          sees the same data, and browsing it isn&apos;t tracked against you individually.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Guest mode (no account)</h2>
        <p className="text-foreground/90 text-sm">
          An account is never required. My Papers, saved resubmission plans, and favourites all work
          as a guest — that data is written only to <code>localStorage</code> in your browser. It
          never leaves your device, isn&apos;t sent to any server, and disappears if you clear your
          browser&apos;s site data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Signed-in accounts (optional)</h2>
        <p className="text-foreground/90 text-sm">
          Creating an account (email/password or Google, via Firebase Authentication) unlocks
          cross-device sync for the same data guest mode already offers — nothing more. When
          signed in, your papers, saved plans, favourites, and a couple of small preferences are
          stored in Cloud Firestore under a document keyed to your Firebase user ID
          (<code>users/&#123;uid&#125;/...</code>), readable only by that account.
        </p>
        <p className="text-foreground/90 text-sm">
          What&apos;s stored is metadata you type in yourself — paper titles, target conferences, stages,
          notes, and similar — never manuscript files or attachments; this tracker has no file
          upload feature.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Encryption</h2>
        <p className="text-foreground/90 text-sm">
          Traffic between your browser and Firebase/Google&apos;s servers is encrypted in transit (HTTPS),
          and Google encrypts stored data at rest on its infrastructure. This application does not
          implement its own end-to-end encryption — Firebase (and, by extension, Google) can access
          the data it stores in the ordinary course of operating the service, the same as any
          standard cloud database.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Exporting and deleting your data</h2>
        <ul className="text-foreground/90 list-inside list-disc space-y-1 text-sm">
          <li>
            <strong>Export:</strong> Account settings lets you download everything stored for your
            account (papers, saved plans, favourites, preferences) as a single JSON file at any time.
          </li>
          <li>
            <strong>Delete cloud data:</strong> Account settings can delete all of it from Firestore
            immediately, while keeping your sign-in itself active.
          </li>
          <li>
            <strong>Delete account:</strong>{" "}
            <span>
              Deletes the same Firestore data and then deletes the Firebase Authentication account.
              This is a client-side operation that removes every collection this app is known to
              write (papers, saved plans, favourites, preferences) — it is not a server-side audited
              guarantee that no data remains anywhere in Firebase&apos;s infrastructure (e.g. backups
              or logs Google itself retains).
            </span>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">What we don&apos;t do</h2>
        <ul className="text-foreground/90 list-inside list-disc space-y-1 text-sm">
          <li>No advertising, analytics trackers, or third-party data sharing.</li>
          <li>No manuscript or file storage — only the metadata you type in.</li>
          <li>No account required for any core feature, including the resubmission planner.</li>
        </ul>
      </section>

      <p className="text-muted-foreground text-xs">
        Questions about this page or your data? See the{" "}
        <Link href="/about" className="text-accent underline underline-offset-2">
          About
        </Link>{" "}
        page for contact details.
      </p>
    </div>
  );
}
