import { tocDisplayClass } from "@/components/toc/toc-theme"
import type { PublicFieldAthlete } from "@/lib/toc/public-announced-field"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NC"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

/**
 * One announced wrestler. Deliberately shows class year and club only — TOC athletes compete unattached,
 * so nothing here identifies a school. Athletes without a released photo get an on-brand initials tile
 * rather than a broken frame, since the field will always be a mix.
 */
export function TocPublicAthleteCard({ athlete }: { athlete: PublicFieldAthlete }) {
  return (
    <li className="overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] transition-colors hover:border-[#CC0000]/40">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0B1D3A]">
        {athlete.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- athlete photos come from mixed external hosts
          <img
            src={athlete.photoUrl}
            alt={athlete.name}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B1D3A] to-[#061224]">
            <span className={`text-4xl text-white/20 ${tocDisplayClass()}`}>{initials(athlete.name)}</span>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <p className="truncate text-sm font-bold text-white sm:text-base" title={athlete.name}>
          {athlete.name}
        </p>
        <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-white/45">
          {[athlete.graduationYear ? `Class of ${athlete.graduationYear}` : null, athlete.club]
            .filter(Boolean)
            .join(" · ") || "NC United"}
        </p>
      </div>
    </li>
  )
}
