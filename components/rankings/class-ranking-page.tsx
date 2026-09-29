import Link from "next/link"
import { RankedAthleteCard } from "@/components/rankings/ranked-athlete-card"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { loadPublicClassRanking } from "@/lib/rankings/public-rankings-view"
import { RankingsNav } from "@/components/rankings/rankings-nav"
import { RankingsSummary } from "@/components/rankings/rankings-summary"
import { RankingsWatermark } from "@/components/rankings/rankings-watermark"

/**
 * A published class ranking, laid out like the Tournament of Champions field.
 *
 * One component serves every class. The pages it replaced were two client components of about
 * 560 lines each, one per year, which had drifted apart — different filters, different empty
 * states, different ways of saying the same thing.
 */
export async function ClassRankingPage({ year }: { year: number }) {
  /*
   * Gated here, server side, because nothing else was gating it.
   *
   * These pages were statically rendered with no auth check at all. The route was missing from
   * the public list in ConditionalAuthGuard, which sounds like protection and is not: that
   * guard is a client component, so it redirects a browser after hydration and does nothing to
   * a fetch. A signed-out `curl` of /public-rankings/2027 returned the entire published board —
   * Worrick, McNair, Tye Johnson, Kostoff, Lopez — as plain HTML, cached for an hour and
   * crawlable.
   *
   * The whole board is the product, so the check has to happen before the names are rendered,
   * not after they have been sent.
   */
  const { viewer, userId } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })
  if (!canSeeProspectRanking(viewer)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061224] px-4">
        <div className="max-w-md text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            RecruitNC · North Carolina prospect rankings
          </p>
          <h1 className="mt-3 text-3xl font-light uppercase tracking-tight text-white">
            Class of {year}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            The published rankings are for NC United Blue members, verified college coaches and
            RecruitNC subscribers.
          </p>
          <Link
            href="/rankings"
            className="mt-6 inline-block rounded-lg bg-[#d6b75d] px-5 py-2.5 text-sm font-semibold text-[#061224] hover:bg-[#c5a84d]"
          >
            See what is included
          </Link>
          <Link
            href="/auth/coach-signup"
            className="mt-4 block text-sm text-white/70 underline hover:text-white"
          >
            College coach? Get free access
          </Link>
        </div>
      </div>
    )
  }

  const ranking = await loadPublicClassRanking(year, viewer.isAdmin === true)

  return (
    <div className="min-h-screen bg-[#061224]">
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            RecruitNC · North Carolina prospect rankings
          </p>
          <h1 className="mt-3 text-center text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Class of {year}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/60">
            The top {ranking.cap} wrestlers in North Carolina&apos;s Class of {year}, ranked on results:
            who they wrestled, how they did against them, and what they have done outside this state.
          </p>

          <RankingsSummary athletes={ranking.athletes} />

          <RankingsNav current={year} isAdmin={viewer.isAdmin === true} />


          {!ranking.published ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              The Class of {year} is not published yet.
            </p>
          ) : ranking.athletes.length === 0 ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              No ranked wrestlers on file for this class.
            </p>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {ranking.athletes.map((athlete) => (
                <RankedAthleteCard key={athlete.athleteId} athlete={athlete} />
              ))}
            </ul>
          )}

          <RankingsWatermark userId={userId} />

          <p className="mx-auto mt-10 max-w-2xl text-center text-[11px] leading-relaxed text-white/35">
            Rankings are reviewed by NC United staff before publication. A direct win between two ranked
            wrestlers in the last twelve months carries the most weight, with the most recent meeting
            counting highest.
          </p>
        </div>
      </section>
    </div>
  )
}
