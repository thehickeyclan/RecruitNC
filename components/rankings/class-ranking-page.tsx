import { RankedAthleteCard } from "@/components/rankings/ranked-athlete-card"
import { loadPublicClassRanking } from "@/lib/rankings/public-rankings-view"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"

/**
 * A published class ranking, laid out like the Tournament of Champions field.
 *
 * One component serves every class. The pages it replaced were two client components of about
 * 560 lines each, one per year, which had drifted apart — different filters, different empty
 * states, different ways of saying the same thing.
 */
export async function ClassRankingPage({ year }: { year: number }) {
  const ranking = await loadPublicClassRanking(year)

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
