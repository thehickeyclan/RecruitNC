import type { Metadata } from "next"
import Link from "next/link"
import { RankedAthleteCard } from "@/components/rankings/ranked-athlete-card"
import { loadTopProspects } from "@/lib/rankings/prospects-view"
import { P4P_PUBLIC_CAP } from "@/lib/rankings/pound-for-pound"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasPremiumAccess } from "@/lib/ranking-visibility"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { PUBLIC_TOP_PROSPECTS_RELEASED } from "@/lib/public-rankings-cap"

// Per-viewer: the board is gated, so it cannot be one static document for everybody.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Top 70 College Prospects | RecruitNC",
  description:
    "North Carolina's top college wrestling prospects across the classes of 2027, 2028 and 2029, ranked on this season.",
}

/**
 * The Top 50, across three classes.
 *
 * Sold as "Top 50 North Carolina College Prospects" rather than pound-for-pound: a college
 * coach is not shopping for a pound-for-pound argument, they are asking who the best fifty
 * prospects in the state are. The engine name stays on the admin board, where it describes
 * what the scoring actually does.
 */
export default async function TopProspectsPage() {
  const { viewer } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })

  if (!hasPremiumAccess(viewer) || !PUBLIC_TOP_PROSPECTS_RELEASED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061224] px-4">
        <div className="max-w-md text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            RecruitNC
          </p>
          <h1 className="mt-3 text-3xl font-light uppercase tracking-tight text-white">
            Top {P4P_PUBLIC_CAP} College Prospects
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {PUBLIC_TOP_PROSPECTS_RELEASED
              ? "This list requires rankings access."
              : "This list has not been released yet."}
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

  const board = await loadTopProspects("Male")

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
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/60">
            The top college prospects in North Carolina, across the classes of 2027, 2028 and
            2029 — one list, every class.
          </p>

          {!board.published ? (
            <p className="mt-16 text-center text-sm text-white/50">
              This list has not been published yet.
            </p>
          ) : (
            <>
              <div className="mt-10 grid gap-3">
                {board.athletes.map((athlete) => (
                  <RankedAthleteCard key={athlete.athleteId} athlete={athlete} />
                ))}
              </div>
              {/*
                * Said on the page, because it is the first question a parent asks when their
                * son is 14th in his class and 31st here.
                */}
              <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-white/40">
                Ranked on national results in individual and dual competition, strength of
                competition, quality wins, head-to-head results, in-season performance, and how
                consistently a wrestler seeks out the best. Within a class this list follows that
                class&apos;s published board exactly.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
