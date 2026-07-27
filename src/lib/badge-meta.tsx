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
  GraduationCap,
  Globe2,
  HelpCircle,
  History,
  Layers,
  MailQuestion,
  MessageSquareText,
  PencilLine,
  Presentation,
  Rocket,
  ScrollText,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type {
  CoLocatedEventType,
  DeadlineType,
  EventLifecycleStatus,
  ProceedingsStatus,
} from "./schema";
import type { ConferenceStatus } from "./status";
import type { VerificationStatus } from "./schema";

export interface DeadlineTypeMeta {
  label: string;
  icon: LucideIcon;
  colorClasses: string;
  dotClasses: string;
}

/**
 * Colour follows the visual-refresh mapping: main-conference dates are blue,
 * workshop/associated-event dates are pink, tutorials a lighter blue (cyan),
 * shared tasks / competitions / challenges yellow, notification-family dates
 * blue-purple (indigo), camera-ready pink-purple (fuchsia). Colour is always
 * paired with the label and an icon — never the only signal.
 */
export const DEADLINE_TYPE_META: Record<DeadlineType, DeadlineTypeMeta> = {
  abstract: {
    label: "Abstract deadline",
    icon: FileText,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    dotClasses: "bg-blue-500",
  },
  "full-paper": {
    label: "Full paper deadline",
    icon: ScrollText,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    dotClasses: "bg-blue-500",
  },
  "arr-submission": {
    label: "ARR submission deadline",
    icon: ScrollText,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    dotClasses: "bg-blue-500",
  },
  "arr-commitment": {
    label: "ARR commitment deadline",
    icon: FileCheck2,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    dotClasses: "bg-indigo-500",
  },
  "workshop-proposal": {
    label: "Workshop proposal deadline",
    icon: Presentation,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
    dotClasses: "bg-pink-500",
  },
  "workshop-paper": {
    label: "Workshop paper deadline",
    icon: Presentation,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
    dotClasses: "bg-pink-500",
  },
  demo: {
    label: "Demo track deadline",
    icon: Sparkles,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
    dotClasses: "bg-pink-500",
  },
  "industry-track": {
    label: "Industry track deadline",
    icon: Rocket,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    dotClasses: "bg-blue-500",
  },
  "dataset-resource-track": {
    label: "Dataset / resource track deadline",
    icon: FlaskConical,
    colorClasses:
      "bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    dotClasses: "bg-cyan-500",
  },
  "author-response": {
    label: "Author response window",
    icon: MessageSquareText,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    dotClasses: "bg-indigo-500",
  },
  rebuttal: {
    label: "Rebuttal window",
    icon: MessageSquareText,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    dotClasses: "bg-indigo-500",
  },
  notification: {
    label: "Notification",
    icon: MailQuestion,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    dotClasses: "bg-indigo-500",
  },
  "camera-ready": {
    label: "Camera-ready deadline",
    icon: PencilLine,
    colorClasses:
      "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
    dotClasses: "bg-fuchsia-500",
  },
  "early-registration": {
    label: "Early registration deadline",
    icon: Timer,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
    dotClasses: "bg-yellow-500",
  },
  "conference-start": {
    label: "Conference begins",
    icon: CalendarDays,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    dotClasses: "bg-blue-600",
  },
  "conference-end": {
    label: "Conference ends",
    icon: CalendarDays,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
    dotClasses: "bg-blue-600",
  },
  "tutorial-proposal": {
    label: "Tutorial proposal deadline",
    icon: GraduationCap,
    colorClasses:
      "bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    dotClasses: "bg-cyan-500",
  },
  "special-session-proposal": {
    label: "Special session proposal deadline",
    icon: Users,
    colorClasses:
      "bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    dotClasses: "bg-cyan-500",
  },
  "workshop-abstract": {
    label: "Workshop abstract deadline",
    icon: Presentation,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
    dotClasses: "bg-pink-500",
  },
  "tutorial-material": {
    label: "Tutorial material deadline",
    icon: GraduationCap,
    colorClasses:
      "bg-cyan-50 text-cyan-900 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    dotClasses: "bg-cyan-500",
  },
  "shared-task-registration": {
    label: "Shared task registration deadline",
    icon: Target,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
    dotClasses: "bg-yellow-500",
  },
  "shared-task-data-release": {
    label: "Shared task data release",
    icon: Target,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
    dotClasses: "bg-yellow-500",
  },
  "shared-task-submission": {
    label: "Shared task submission deadline",
    icon: Target,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
    dotClasses: "bg-yellow-500",
  },
  "competition-registration": {
    label: "Competition registration deadline",
    icon: Trophy,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
    dotClasses: "bg-yellow-500",
  },
  "competition-submission": {
    label: "Competition submission deadline",
    icon: Trophy,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
    dotClasses: "bg-yellow-500",
  },
  "challenge-deadline": {
    label: "Challenge deadline",
    icon: Trophy,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
    dotClasses: "bg-yellow-500",
  },
  "doctoral-consortium-deadline": {
    label: "Doctoral consortium deadline",
    icon: GraduationCap,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
    dotClasses: "bg-pink-500",
  },
  "event-start": {
    label: "Event begins",
    icon: CalendarDays,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
    dotClasses: "bg-pink-600",
  },
  "event-end": {
    label: "Event ends",
    icon: CalendarDays,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
    dotClasses: "bg-pink-600",
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
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  },
  "Abstract Deadline Approaching": {
    icon: Timer,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
  },
  "Paper Deadline Approaching": {
    icon: Timer,
    colorClasses:
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
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
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  },
  Closed: {
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  "Camera Ready": {
    icon: PencilLine,
    colorClasses:
      "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
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
      "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800",
  },
  "Reference Cycle Only": {
    icon: History,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
};

export interface EventTypeMeta {
  icon: LucideIcon;
  colorClasses: string;
}

/** All associated-event types share the pink "workshops & expressive accents" family, distinguished by icon. */
const EVENT_PINK_CLASSES =
  "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800";

export const EVENT_TYPE_META: Record<CoLocatedEventType, EventTypeMeta> = {
  workshop: { icon: Presentation, colorClasses: EVENT_PINK_CLASSES },
  tutorial: { icon: GraduationCap, colorClasses: EVENT_PINK_CLASSES },
  "shared-task": { icon: Target, colorClasses: EVENT_PINK_CLASSES },
  competition: { icon: Trophy, colorClasses: EVENT_PINK_CLASSES },
  challenge: { icon: Trophy, colorClasses: EVENT_PINK_CLASSES },
  "demo-track": { icon: Sparkles, colorClasses: EVENT_PINK_CLASSES },
  "industry-track": { icon: Rocket, colorClasses: EVENT_PINK_CLASSES },
  "doctoral-consortium": { icon: GraduationCap, colorClasses: EVENT_PINK_CLASSES },
  "special-session": { icon: Users, colorClasses: EVENT_PINK_CLASSES },
  hackathon: { icon: Wrench, colorClasses: EVENT_PINK_CLASSES },
  symposium: { icon: Layers, colorClasses: EVENT_PINK_CLASSES },
  other: { icon: HelpCircle, colorClasses: EVENT_PINK_CLASSES },
};

export interface LifecycleMeta {
  icon: LucideIcon;
  colorClasses: string;
}

/**
 * "proposed" / "proposal-call-open" are deliberately styled as a muted,
 * unconfirmed state — see UNCONFIRMED_EVENT_LIFECYCLE_STATUSES in schema.ts —
 * so the UI never reads a proposal as a confirmed publication target.
 */
export const EVENT_LIFECYCLE_META: Record<EventLifecycleStatus, LifecycleMeta> = {
  proposed: {
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  "proposal-call-open": {
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  accepted: {
    icon: CheckCircle2,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  },
  "officially-announced": {
    icon: BadgeCheck,
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  },
  "cfp-open": {
    icon: FileText,
    colorClasses:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  },
  "submission-closed": {
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  "in-review": {
    icon: FileCheck2,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  },
  "notification-released": {
    icon: MailQuestion,
    colorClasses:
      "bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
  },
  "camera-ready": {
    icon: PencilLine,
    colorClasses:
      "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
  },
  scheduled: {
    icon: CalendarDays,
    colorClasses:
      "bg-pink-50 text-pink-900 border-pink-300 dark:bg-pink-950/40 dark:text-pink-200 dark:border-pink-800",
  },
  completed: {
    icon: CheckCircle2,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  cancelled: {
    icon: AlertTriangle,
    colorClasses:
      "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
  },
  "not-returning": {
    icon: AlertTriangle,
    colorClasses:
      "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
  },
  unverified: {
    icon: HelpCircle,
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
};

export interface ProceedingsMeta {
  icon: LucideIcon;
  label: string;
  colorClasses: string;
}

export const PROCEEDINGS_META: Record<ProceedingsStatus, ProceedingsMeta> = {
  archival: {
    icon: BadgeCheck,
    label: "Archival proceedings",
    colorClasses:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  },
  "non-archival": {
    icon: FileText,
    label: "Non-archival",
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  "separate-proceedings": {
    icon: ScrollText,
    label: "Separate proceedings",
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  },
  "parent-conference-proceedings": {
    icon: ScrollText,
    label: "Published in parent conference proceedings",
    colorClasses:
      "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800",
  },
  "no-proceedings": {
    icon: HelpCircle,
    label: "No proceedings",
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
  unknown: {
    icon: HelpCircle,
    label: "Proceedings status unknown",
    colorClasses:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  },
};
