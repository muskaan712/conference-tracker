import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllEvents, getEventBySlug } from "@/lib/events";
import { getEditionBySlug } from "@/lib/conferences";
import { EventDetail } from "@/components/event-detail";

export const revalidate = 21600;

export function generateStaticParams() {
  return getAllEvents().map((event) => ({ slug: event.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: `${event.acronym ?? event.name}`,
    description:
      event.description ?? `${event.name}, co-located with a tracked conference edition.`,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: event.name,
      description: event.description ?? undefined,
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  const parent = getEditionBySlug(event.parentConferenceEditionSlug);

  return <EventDetail event={event} parent={parent} />;
}
