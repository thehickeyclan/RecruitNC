import Link from "next/link"
import { RankedAthleteCard } from "@/components/rankings/ranked-athlete-card"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { loadPublicClassRanking } from "@/lib/rankings/public-rankings-view"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS, isWatchlistYear } from "@/lib/public-rankings-cap"

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
  /*
   * 2029 is presented as a watch list rather than a ranking. The order behind it is the same
   * one the admin board saves; what changes is what we claim about it. See WATCHLIST_YEARS.
   */
  const watchlist = isWatchlistYear(year)
  const eyebrow = watchlist
    ? "RecruitNC \u00b7 North Carolina prospects to watch"
    : "RecruitNC \u00b7 North Carolina prospect rankings"

  const { viewer } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })
  if (!canSeeProspectRanking(viewer)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061224] px-4">
        <div className="max-w-md text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-light uppercase tracking-tight text-white">
            Class of {year}
            {watchlist ? <span className="block text-xl text-white/70">Prospects to Watch</span> : null}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {watchlist
              ? "This list is for NC United Blue members, verified college coaches and RecruitNC subscribers."
              : "The published rankings are for NC United Blue members, verified college coaches and RecruitNC subscribers."}
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

  const ranking = await loadPublicClassRanking(year, viewer.isAdmin === true)

  return (
    <div className="min-h-screen bg-[#061224]">
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-center text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Class of {year}
          </h1>
          {watchlist ? (
            <p className="mt-2 text-center text-xl font-light uppercase tracking-[0.18em] text-[#D7B95A]">
              Prospects to Watch
            </p>
          ) : null}

          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/60">
            {watchlist ? (
              <>
                {ranking.cap} wrestlers in North Carolina&apos;s Class of {year} worth following, chosen
                on results: who they wrestled, how they did against them, and what they have done
                outside this state. They are listed in our order, but a freshman class has one high
                school season behind it &mdash; read this as who to watch, not a settled verdict.
              </>
            ) : (
              <>
                The top {ranking.cap} wrestlers in North Carolina&apos;s Class of {year}, ranked on
                results: who they wrestled, how they did against them, and what they have done outside
                this state.
              </>
            )}
          </p>

          <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Ranked classes">
            {PUBLISHED_PUBLIC_RANKINGS_YEARS.map((y) => (
              <a
                key={y}
                href={`/public-rankings/${y}`}
                aria-current={y === year ? "page" : undefined}
                className={
                  y === year
                    ? "rounded-sm border-2 border-[#D7B95A] bg-[#D7B95A]/20 px-4 py-1.5 text-sm font-bold text-[#D7B95A]"
                    : "rounded-sm border border-white/15 bg-white/[0.03] px-4 py-1.5 text-sm font-bold text-white/70 hover:border-white/35 hover:text-white"
                }
              >
                {y}
              </a>
            ))}
          </nav>

          {!ranking.published ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              The Class of {year} {watchlist ? "list" : "ranking"} is not published yet.
            </p>
          ) : ranking.athletes.length === 0 ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              {watchlist ? "No wrestlers on file for this class yet." : "No ranked wrestlers on file for this class."}
            </p>
          ) : (
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {ranking.athletes.map((athlete) => (
                <RankedAthleteCard key={athlete.athleteId} athlete={athlete} />
              ))}
            </ul>
          )}

          <p className="mx-auto mt-10 max-w-2xl text-center text-[11px] leading-relaxed text-white/35">
            {watchlist ? "This list is" : "Rankings are"} reviewed by NC United staff before
            publication. A direct win between two listed wrestlers in the last twelve months carries
            the most weight, with the most recent meeting counting highest.
          </p>
        </div>
      </section>
    </div>
  )
}
