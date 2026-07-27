import Link from "next/link";
import type { ConferenceEdition } from "@/lib/schema";
import { deriveConferenceStatus } from "@/lib/status";
import { TierBadge, RegionBadge, StatusBadge, CountryFlag } from "./badges";

export function ConferenceTable({
  editions,
  now = new Date(),
}: {
  editions: ConferenceEdition[];
  now?: Date;
}) {
  return (
    <div className="border-border overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-border bg-surface-raised text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
            <th className="px-3 py-2 font-medium">Conference</th>
            <th className="px-3 py-2 font-medium">Tier</th>
            <th className="px-3 py-2 font-medium">Region</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {editions.map((edition) => {
            const status = deriveConferenceStatus(edition.dates, now);
            return (
              <tr
                key={edition.slug}
                className="border-border hover:bg-surface-raised border-b last:border-0"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/conferences/${edition.slug}`}
                    className="hover:text-accent font-medium"
                  >
                    {edition.acronym} {edition.editionYear}
                  </Link>
                  <div className="text-muted-foreground text-xs">{edition.name}</div>
                </td>
                <td className="px-3 py-2.5">
                  <TierBadge tier={edition.ranking.tier} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <RegionBadge category={edition.geographicCategory} />
                    {edition.countryCode ? <CountryFlag countryCode={edition.countryCode} /> : null}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
