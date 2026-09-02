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
        {/*
          The name gets the whole width and wraps rather than truncating. It is the one thing on the
          card that must never be cut — sharing its row with a credential pill clipped it.
        */}
        <a
          href={profileHref}
          className="block text-sm font-bold leading-snug text-white underline-offset-4 hover:text-emerald-300 hover:underline sm:text-base"
        >
          {athlete.name}
        </a>
        {/* Club names run long too — let them wrap rather than clipping mid-word. */}
        <p className="mt-1 text-[11px] uppercase leading-snug tracking-[0.12em] text-white/45">{meta || "NC United"}</p>
        <TocCredentialPills credentials={athlete.credentials} />
        {athlete.coaches.length > 0 ? (
          <div className="mt-1.5 text-[11px] leading-snug text-white/60">
            <span className="text-white/40">Coached by</span>
            <ul className="mt-0.5 space-y-0.5">
              {athlete.coaches.map((coach) => (
                <li key={coach.name} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      coach.hasCredential ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="truncate" title={coach.name}>
                    {coach.name}
                  </span>
                  <span className="sr-only">
                    {coach.hasCredential ? "credential purchased" : "approved, credential not yet purchased"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] italic leading-snug text-white/30">No coaches submitted</p>
        )}
      </div>
    </li>
  )
}
