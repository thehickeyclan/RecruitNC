"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { RankingCredentialPills } from "@/components/rankings/ranking-credential-pills"
import type { PublicRankedAthlete } from "@/lib/rankings/public-rankings-view"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NC"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

/** Up 4, down 2, or new — measured against the previous published edition, never against a live score. */
function movement(rank: number, previous: number | null): { label: string; className: string } | null {
  if (previous == null || previous === rank) return null
  const delta = previous - rank
  return delta > 0
    ? { label: `▲ ${delta}`, className: "text-emerald-300" }
    : { label: `▼ ${Math.abs(delta)}`, className: "text-red-300" }
}

const TONE_CLASS: Record<string, string> = {
  green: "text-emerald-200/80",
  gold: "text-[#D7B95A]",
  blue: "text-sky-200/80",
  purple: "text-purple-200/80",
  orange: "text-orange-200/80",
  red: "text-red-200/80",
  default: "text-white/60",
}

/**
 * One ranked wrestler, built to read like a Tournament of Champions field card.
 *
 * The difference is the evidence drawer. A ranking is an assertion about a teenager against their
 * classmates, and the old page made that assertion with nothing behind it — a number and a name.
 * Every line in the drawer is the same evidence the staff board weighs, so the answer to "why is
 * my son 12th" is on the page rather than in an email.
 */
export function RankedAthleteCard({ athlete }: { athlete: PublicRankedAthlete }) {
  const [open, setOpen] = useState(false)
  const profileHref = `/view-profile?id=${encodeURIComponent(athlete.athleteId)}`
  const move = movement(athlete.rank, athlete.previousRank)
  const meta = [
    athlete.weightClass ? `${athlete.weightClass} lbs` : null,
    athlete.graduationYear ? `Class of ${athlete.graduationYear}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] transition-colors hover:border-[#D7B95A]/40">
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
              <span className="text-4xl font-black text-white/20">{initials(athlete.name)}</span>
            </div>
          )}
          <span className="absolute left-0 top-0 bg-[#D7B95A] px-2.5 py-1 text-sm font-black text-[#060f1f]">
            #{athlete.rank}
          </span>
          {move ? (
            <span className={`absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold ${move.className}`}>
              {move.label}
            </span>
          ) : null}
        </div>
      </a>

      <div className="p-3 sm:p-4">
        <a
          href={profileHref}
          className="block text-sm font-bold leading-snug text-white underline-offset-4 hover:text-[#D7B95A] hover:underline sm:text-base"
        >
          {athlete.name}
        </a>
        <p className="mt-1 text-[11px] uppercase leading-snug tracking-[0.12em] text-white/45">{meta}</p>
        {athlete.highSchool ? (
          <p className="mt-0.5 text-[11px] leading-snug text-white/55">{athlete.highSchool}</p>
        ) : null}
        {athlete.club ? <p className="text-[11px] leading-snug text-white/35">{athlete.club}</p> : null}

        <RankingCredentialPills credentials={athlete.credentials} />

        {athlete.collegeCommit ? (
          <p className="mt-2 text-[11px] font-semibold leading-snug text-emerald-300">
            Committed · {athlete.collegeCommit}
          </p>
        ) : null}

        {/* An outside number, labelled as one. It orders nothing on this page. */}
        {athlete.rankWrestlerRank ? (
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-white/35">
            RankWrestler #{athlete.rankWrestlerRank}
          </p>
        ) : null}

        {athlete.evidence.length > 0 ? (
          <div className="mt-3 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex min-h-[36px] w-full items-center justify-between gap-2 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/50 hover:text-white/80"
            >
              Why this ranking
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open ? (
              <ul className="mt-2 space-y-1">
                {athlete.evidence.map((line, i) => (
                  <li key={i} className={`text-[11px] leading-snug ${TONE_CLASS[line.tone] ?? TONE_CLASS.default}`}>
                    • {line.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}
