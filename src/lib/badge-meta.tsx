import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  FlaskConical,
  Globe2,
  HelpCircle,
  History,
  MailQuestion,
  MessageSquareText,
  PencilLine,
  Presentation,
  Rocket,
  ScrollText,
  Sparkles,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { DeadlineType } from "./schema";
import type { ConferenceStatus } from "./status";
import type { VerificationStatus } from "./schema";

export interface DeadlineTypeMeta {
  label: string;
  icon: LucideIcon;
  colorClasses: string;
  dotClasses: string;
}

export const DEADLINE_TYPE_META: Record<DeadlineType, DeadlineTypeMeta> = {
  abstract: {
    label: "Abstract deadline",
    icon: FileText,
    colorClasses:
      "bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
    dotClasses: "bg-sky-500",
  },
  "full-paper": {
    label: "Full paper deadline",
    icon: ScrollText,
    colorClasses:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    dotClasses: "bg-amber-500",
  },
  "arr-submission": {
    label: "ARR submission deadline",
    icon: ScrollText,
    colorClasses:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    dotClasses: "bg-amber-500",
  },
  "arr-commitment": {
    label: "ARR commitment deadline",
    icon: FileCheck2,
    colorClasses:
      "bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800",
    dotClasses: "bg-orange-500",
  },
  "workshop-proposal": {
    label: "Workshop proposal deadline",
    icon: Presentation,
    colorClasses:
      "bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800",
    dotClasses: "bg-teal-500",
  },
  "workshop-paper": {
    label: "Workshop paper deadline",
    icon: Presentation,
    colorClasses:
      "bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800",
    dotClasses: "bg-teal-500",
  },
  demo: {
    label: "Demo track deadline",
    icon: Sparkles,
    colorClasses:
      "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
    dotClasses: "bg-fuchsia-500",
  },
  "industry-track": {
    label: "Industry track deadline",
    icon: Rocket,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    dotClasses: "bg-indigo-500",
  },
  "dataset-resource-track": {
    label: "Dataset / resource track deadline",
    icon: FlaskConical,
    colorClasses:
      "bg-lime-50 text-lime-900 border-lime-300 dark:bg-lime-950/40 dark:text-lime-200 dark:border-lime-800",
    dotClasses: "bg-lime-500",
  },
  "author-response": {
    label: "Author response window",
    icon: MessageSquareText,
    colorClasses:
      "bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
    dotClasses: "bg-violet-500",
  },
  rebuttal: {
    label: "Rebuttal window",
    icon: MessageSquareText,
    colorClasses:
      "bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
    dotClasses: "bg-violet-500",
  },
  notification: {
    label: "Notification",
    icon: MailQuestion,
    colorClasses:
      "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
    dotClasses: "bg-rose-500",
  },
  "camera-ready": {
    label: "Camera-ready deadline",
    icon: PencilLine,
    colorClasses:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    dotClasses: "bg-emerald-500",
  },
  "early-registration": {
    label: "Early registration deadline",
    icon: Timer,
    colorClasses:
      "bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    dotClasses: "bg-cyan-500",
  },
  "conference-start": {
    label: "Conference begins",
    icon: CalendarDays,
    colorClasses:
      "bg-stone-100 text-stone-900 border-stone-300 dark:bg-stone-800/60 dark:text-stone-100 dark:border-stone-700",
    dotClasses: "bg-stone-600",
  },
  "conference-end": {
    label: "Conference ends",
    icon: CalendarDays,
    colorClasses:
      "bg-stone-100 text-stone-900 border-stone-300 dark:bg-stone-800/60 dark:text-stone-100 dark:border-stone-700",
    dotClasses: "bg-stone-600",
  },
};

export interface VerificationMeta {
  label: string;
  icon: LucideIcon;
  colorClasses: string;
}

export const VERIFICATION_META: Record<VerificationStatus, VerificationMeta> = {
  official: {
    label: "Official",
    icon: BadgeCheck,
    colorClasses:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  },
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    colorClasses:
      "bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  },
  tentative: {
    label: "Tentative",
    icon: Clock,
    colorClasses:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  },
  "previous-cycle": {
    label: "Previous cycle (reference only)",
    icon: History,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  discovered: {
    label: "Auto-discovered, pending review",
    icon: Globe2,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  },
  conflicting: {
    label: "Conflicting sources",
    icon: AlertTriangle,
    colorClasses:
      "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
  },
  unverified: {
    label: "Unverified",
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
};

export interface StatusMeta {
  icon: LucideIcon;
  colorClasses: string;
}

export const CONFERENCE_STATUS_META: Record<ConferenceStatus, StatusMeta> = {
  Open: {
    icon: CheckCircle2,
    colorClasses:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  },
  "Opening Soon": {
    icon: CalendarClock,
    colorClasses:
      "bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  },
  "Abstract Deadline Approaching": {
    icon: Timer,
    colorClasses:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  },
  "Paper Deadline Approaching": {
    icon: Timer,
    colorClasses:
      "bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800",
  },
  "In Review": {
    icon: FileCheck2,
    colorClasses:
      "bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
  },
  "Author Response": {
    icon: MessageSquareText,
    colorClasses:
      "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
  },
  "Notification Soon": {
    icon: MailQuestion,
    colorClasses:
      "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800",
  },
  Closed: {
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  "Camera Ready": {
    icon: PencilLine,
    colorClasses:
      "bg-teal-50 text-teal-900 border-teal-300 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800",
  },
  "Conference Upcoming": {
    icon: CalendarDays,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  },
  "Conference Ongoing": {
    icon: Users,
    colorClasses:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  },
  Completed: {
    icon: CheckCircle2,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  "Dates Not Announced": {
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  "Tentative Dates": {
    icon: Clock,
    colorClasses:
      "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  },
  "Reference Cycle Only": {
    icon: History,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
};
