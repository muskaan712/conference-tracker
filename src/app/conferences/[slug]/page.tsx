import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllEditions, getEditionBySlug } from "@/lib/conferences";
import { getEventsForEdition } from "@/lib/events";
import { ConferenceDetail } from "@/components/conference-detail";

export const revalidate = 21600;

export function generateStaticParams() {
  return getAllEditions().map((edition) => ({ slug: edition.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const edition = getEditionBySlug(slug);
  if (!edition) return { title: "Conference not found" };
  return {
    title: `${edition.acronym} ${edition.editionYear}`,
    description: edition.description,
    alternates: { canonical: `/conferences/${edition.slug}` },
    openGraph: {
      title: `${edition.acronym} ${edition.editionYear} — ${edition.name}`,
      description: edition.description,
    },
  };
}

export default async function ConferenceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const edition = getEditionBySlug(slug);
  if (!edition) notFound();

  const associatedEvents = getEventsForEdition(slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${edition.name} (${edition.acronym} ${edition.editionYear})`,
    description: edition.description,
    startDate: edition.dates.find((d) => d.type === "conference-start")?.startsAt,
    endDate: edition.dates.find((d) => d.type === "conference-end")?.startsAt,
    eventAttendanceMode: edition.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : edition.isHybrid
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    location: edition.isOnline
      ? { "@type": "VirtualLocation", url: edition.officialWebsiteUrl }
      : {
          "@type": "Place",
          name: edition.venueName ?? edition.city ?? "Location not announced",
          address: {
            "@type": "PostalAddress",
            addressLocality: edition.city,
            addressCountry: edition.countryCode,
          },
        },
    url: edition.officialWebsiteUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ConferenceDetail edition={edition} associatedEvents={associatedEvents} />
    </>
  );
}
