import { tocDisplayClass } from "@/components/toc/toc-theme"
import { TocCredentialPills } from "@/components/toc/field/toc-credential-pills"
import type { PublicFieldAthlete } from "@/lib/toc/public-announced-field"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NC"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

/**
 * One announced wrestler: photo, name linking to their profile, class and club, then credential pills.
 *
 * Everything here comes from {@link PublicFieldAthlete}, assembled server-side with no school, seed, or ranking.
 * No client state and no fetching — the card is a link and a few labels.
 */
export function TocPublicAthleteCard({ athlete }: { athlete: PublicFieldAthlete }) {
  const meta = [athlete.graduationYear ? `Class of ${athlete.graduationYear}` : null, athlete.club]
    .filter(Boolean)
    .join(" · ")
  const profileHref = `/view-profile?id=${encodeURIComponent(athlete.athleteId)}`
  /** "Coached by Miller", "Coached by Miller and Jones" — read the way it is announced from the mat. */
  const coachedBy =
    athlete.coaches.length === 0
      ? null
      : athlete.coaches.length === 1
        ? athlete.coaches[0]
        : `${athlete.coaches.slice(0, -1).join(", ")} and ${athlete.coaches[athlete.coaches.length - 1]}`

  return (
    <li className="overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] transition-colors hover:border-emerald-400/40">
      <a href={profileHref} className="block">
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
      </a>

      <div className="p-3 sm:p-4">
        {/* Name and top credential share a row; the club needs the full width below it. */}
        <div className="flex items-start justify-between gap-2">
          <a
            href={profileHref}
            className="min-w-0 flex-1 truncate text-sm font-bold text-white underline-offset-4 hover:text-emerald-300 hover:underline sm:text-base"
            title={athlete.name}
          >
            {athlete.name}
          </a>
          <TocCredentialPills credentials={athlete.credentials} inline />
        </div>
        {/* Club names run long — let them wrap rather than clipping mid-word. */}
        <p className="mt-1 text-[11px] uppercase leading-snug tracking-[0.12em] text-white/45">{meta || "NC United"}</p>
        {coachedBy && (
          <p className="mt-1.5 text-[11px] leading-snug text-white/60">
            <span className="text-white/40">Coached by</span> {coachedBy}
          </p>
        )}
      </div>
    </li>
  )
}
