"use client"

import { RankingCredentialPills } from "@/components/rankings/ranking-credential-pills"
import { RecruitStarButton } from "@/components/rankings/recruit-star-button"
import type { PublicRankedAthlete } from "@/lib/rankings/public-rankings-view"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NC"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

/**
 * One ranked wrestler, built to read like a Tournament of Champions field card.
 *
 * Deliberately no evidence drawer: the reasoning behind a ranking stays on the admin board.
 */
export function RankedAthleteCard({
  athlete,
  star,
  stateCode,
}: {
  athlete: PublicRankedAthlete
  /** Coaches and admins: the My Recruits star on the photo. Absent for everyone else. */
  star?: { starred: boolean }
  /** RecruitWrestlers ranks more than one state: each tile says whose ranking it is (Matt, 26 Oct 2026). */
  stateCode?: string
}) {
  const profileHref = `/view-profile?id=${encodeURIComponent(athlete.athleteId)}`
  const meta = [
    athlete.weightClass ? `${athlete.weightClass} lbs` : null,
    athlete.graduationYear ? `Class of ${athlete.graduationYear}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="relative overflow-hidden rounded-sm border border-white/10 bg-white/[0.03] transition-colors hover:border-[#D7B95A]/40">
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
          {stateCode ? (
            <span className="absolute bottom-2 left-2 rounded-full bg-[#0B1426]/85 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ring-1 ring-white/25">
              {stateCode}
            </span>
          ) : null}
          {/*
            * Rank and NEW share the top-left; the top-right belongs to the My Recruits star. No up/down
            * arrows (Matt, 31 Oct 2026): a red arrow beside a kid's name starts an argument the card
            * cannot answer. NEW is good news for the wrestler who earns it and costs nobody.
            */}
          <span className="absolute left-0 top-0 flex items-stretch">
            <span className="bg-[#D7B95A] px-2.5 py-1 text-sm font-black text-[#060f1f]">#{athlete.rank}</span>
            {athlete.isNew ? (
              <span className="flex items-center bg-emerald-400 px-1.5 text-[10px] font-black tracking-wider text-[#061224]">NEW</span>
            ) : null}
          </span>
        </div>
      </a>
      {star ? (
        <RecruitStarButton athleteId={athlete.athleteId} name={athlete.name} initiallyStarred={star.starred} />
      ) : null}

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

        {/* Plain text read as plain text: coaches scanned the list and never opened a profile.
            On a phone there is no hover to hint the name is a link. */}
        <a
          href={profileHref}
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#D7B95A] hover:underline"
        >
          View profile <span aria-hidden>→</span>
        </a>
      </div>
    </li>
  )
}
