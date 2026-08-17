"use client"

import { useState } from "react"
import { ChevronDown, ExternalLink } from "lucide-react"

import { tocDisplayClass } from "@/components/toc/toc-theme"
import type { PublicFieldAthlete } from "@/lib/toc/public-announced-field"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NC"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

/**
 * One announced wrestler. Tapping the card expands a summary in place rather than navigating, so a reader can
 * scan the field without losing their spot.
 *
 * Everything rendered here comes from {@link PublicFieldAthlete}, which is assembled server-side and carries no
 * school, seed, or ranking. Nothing is fetched on expand — the summary is already in the payload — so opening a
 * card cannot reach data the page was not allowed to publish.
 */
export function TocPublicAthleteCard({ athlete }: { athlete: PublicFieldAthlete }) {
  const [open, setOpen] = useState(false)

  const meta = [athlete.graduationYear ? `Class of ${athlete.graduationYear}` : null, athlete.club]
    .filter(Boolean)
    .join(" · ")

  const hasSummary = athlete.results.length > 0 || Boolean(athlete.collegeCommit)

  return (
    <li className="overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] transition-colors hover:border-emerald-400/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="block w-full cursor-pointer text-left"
      >
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
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-bold text-white sm:text-base" title={athlete.name}>
              {athlete.name}
            </p>
            <ChevronDown
              className={`mt-0.5 h-4 w-4 shrink-0 text-white/35 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </div>
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-white/45">{meta || "NC United"}</p>
        </div>
      </button>

      {open ? (
        <div className="border-t border-white/10 px-3 pb-4 pt-3 sm:px-4">
          {athlete.collegeCommit ? (
            <p className="text-[11px] uppercase tracking-[0.12em] text-emerald-300/90">
              Committed · {athlete.collegeCommit}
            </p>
          ) : null}

          {athlete.results.length > 0 ? (
            <ul className={athlete.collegeCommit ? "mt-2 space-y-1" : "space-y-1"}>
              {athlete.results.map((r) => (
                <li key={r} className="text-[11px] leading-snug text-white/60">
                  {r}
                </li>
              ))}
            </ul>
          ) : null}

          {!hasSummary ? <p className="text-[11px] text-white/40">No national results on file yet.</p> : null}

          <a
            href={`/view-profile?id=${encodeURIComponent(athlete.athleteId)}`}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#C8A94A] underline-offset-4 hover:underline"
          >
            See profile
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      ) : null}
    </li>
  )
}
