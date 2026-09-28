import type { Metadata } from "next"
import Link from "next/link"

import { RankedAthleteCard } from "@/components/rankings/ranked-athlete-card"
import { RankingsNav } from "@/components/rankings/rankings-nav"
import { RankingsSummary } from "@/components/rankings/rankings-summary"
import { RankingsWatermark } from "@/components/rankings/rankings-watermark"
import { PUBLIC_TOP_75_COLLEGE_RELEASED } from "@/lib/public-rankings-cap"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPremiumAccess } from "@/lib/ranking-visibility"
import { loadTopHundred } from "@/lib/rankings/top-100-view"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

// Per-viewer: gated inside, so it cannot be cached as one document for everybody.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Top 75 College Prospects | RecruitNC",
  description:
    "North Carolina's top 75 college wrestling prospects from the classes of 2027 and 2028.",
}

export default async function TopHundredPage() {
  const { viewer, userId } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })

  // Released or not, an admin can always read it; nobody else can until it is.
  const mayRead = viewer.isAdmin === true || (PUBLIC_TOP_75_COLLEGE_RELEASED && hasPremiumAccess(viewer))

  if (!mayRead) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061224] px-4">
        <div className="max-w-md text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">RecruitNC</p>
          <h1 className="mt-3 text-3xl font-light uppercase tracking-tight text-white">
            Top 75 College Prospects
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            This list requires rankings access.
          </p>
          <Link
            href="/rankings"
            className="mt-6 inline-block rounded-lg bg-[#d6b75d] px-5 py-2.5 text-sm font-semibold text-[#061224] hover:bg-[#c5a84d]"
          >
            See what is included
          </Link>
        </div>
      </div>
    )
  }

  const board = await loadTopHundred("Male")

  return (
    <div className="min-h-screen bg-[#061224]">
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            RecruitNC · North Carolina prospect rankings
          </p>
          <h1 className="mt-3 text-center text-4xl font-light uppercase tracking-tight text-white sm:text-5xl">
            Top {board.cap} College Prospects
          </h1>
          {/*
            * The scope belongs on the headline, not in the body copy. A reader who does not find
            * a 2029 wrestler here should learn why from the title, before he goes looking.
            */}
          <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6b75d] sm:text-xs">
            Classes of {board.classes.join(" & ")}
          </p>

          <RankingsSummary athletes={board.athletes} />

          <RankingsNav current="top-100" isAdmin={viewer.isAdmin === true} />

          {!board.published || board.athletes.length === 0 ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              This list has not been published yet.
            </p>
          ) : (
            <>
              <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {board.athletes.map((athlete) => (
                  <RankedAthleteCard key={athlete.athleteId} athlete={athlete} />
                ))}
              </ul>

              {/*
                * How this differs from the Top 75, said plainly.
                *
                * Two lists of similar names invite the question of which one counts. This one
                * reaches past the class cuts, which is the whole reason it exists - a coach
                * reading the ranked list never learned that five state champions sat just outside a
                * deep 2027 board.
                */}
              <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-white/40">
                Ranked on results: who they wrestled, how they did against them, strength of
                competition, quality wins and head-to-head. Within a class the order follows that
                class&apos;s published board exactly.
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-white/40">
                Unlike the Top 75 Ranked Prospects, this list is not limited to wrestlers ranked on their class
                board &mdash; it reaches deeper into every class, so wrestlers just outside a cut
                are included on their merits. Weight and graduating class are shown on every card.
              </p>

              <RankingsWatermark userId={userId} />
            </>
          )}
        </div>
      </section>
    </div>
  )
}
