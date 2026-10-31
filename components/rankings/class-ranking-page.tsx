import { BrandName } from "@/components/recruiting/brand-name"
import Link from "next/link"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { lastUpdatedLabel } from "@/lib/rankings/published-date"
import { RankingLegend, RankingMethod } from "@/components/rankings/ranking-method"
import { MarkBoardSeen } from "@/components/rankings/updated-tile"
import { requireRankingBoardAccess } from "@/lib/rankings/ranking-board-access"
import { RankedAthleteCard } from "@/components/rankings/ranked-athlete-card"
import { loadStarredAthleteIds } from "@/lib/recruiting/starred-ids"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { loadPublicClassRanking } from "@/lib/rankings/public-rankings-view"
import { RankingsNav } from "@/components/rankings/rankings-nav"
import { RankingsSummary } from "@/components/rankings/rankings-summary"
import { RankingsWatermark } from "@/components/rankings/rankings-watermark"
import { headers } from "next/headers"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { liveStates } from "@/lib/recruiting/brand"
import { STATE_NAMES } from "@/lib/college-programs/states"

/**
 * A published class ranking, laid out like the Tournament of Champions field.
 *
 * One component serves every class. The pages it replaced were two client components of about
 * 560 lines each, one per year, which had drifted apart — different filters, different empty
 * states, different ways of saying the same thing.
 */
export async function ClassRankingPage({ year, gender = "Male", state: askedState }: { year: number; gender?: "Male" | "Female"; state?: string }) {
  /*
   * RecruitWrestlers ranks every live state, one board per state, with a state filter and a
   * state pill on each tile (Matt, 26 Oct 2026). NC United is North Carolina only.
   */
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  const states = liveStates(onRw)
  const state = states.some((s) => s.code === String(askedState ?? "").toUpperCase()) ? String(askedState).toUpperCase() : "NC"
  const stateName = STATE_NAMES[state] ?? state
  // "Women's " in front of every heading on the women's board; nothing on the men's, as before.
  const womens = gender === "Female"
  const board = womens ? "Women's " : ""
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
  /*
   * The ranker reads his own board as customers will, before it is released (Matt, 13 October
   * 2026): Brandon Palmer ranks the women's classes and has to check the published page, and he
   * is neither an admin nor a subscriber. A grant on this exact board - the same one that opens
   * the admin board to him - opens this page and nothing else.
   */
  const ranker = viewer.isAdmin === true ? false : (await requireRankingBoardAccess(gender, year, "read", state)).ok
  const preview = viewer.isAdmin === true || ranker
  if (!canSeeProspectRanking(viewer) && !ranker) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#061224] px-4">
        <div className="max-w-md text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            <BrandName /> · {stateName} prospect rankings
          </p>
          <h1 className="mt-3 text-3xl font-light uppercase tracking-tight text-white">
            {board}Class of {year}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            {onRw
              ? "The published rankings are for Insider and Recruiting Command Center members and verified college coaches."
              : "The published rankings are for NC United Blue members, verified college coaches and RecruitNC subscribers."}
          </p>
          <Link
            href={onRw ? "/membership" : "/rankings"}
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

  const ranking = await loadPublicClassRanking(year, preview, gender, state)
  // Another state's published classes, so its tabs grey out the boards it does not have yet.
  const stateYears =
    state === "NC"
      ? undefined
      : [
          ...new Set(
            ((await createAdminClient().from("ranking_editions").select("class_year").eq("state", state).eq("gender", gender).not("published_at", "is", null)).data ?? []).map((r) =>
              Number((r as { class_year: number }).class_year),
            ),
          ),
          year,
        ]
  const basePath = gender === "Female" ? `/public-rankings/women/${year}` : `/public-rankings/${year}`
  // Coaches and admins get the My Recruits star on every card (Matt, 14 October 2026).
  const canStar = (viewer.isAdmin === true || viewer.isVerifiedCoach === true) && Boolean(userId)
  const starred = canStar ? await loadStarredAthleteIds(createAdminClient(), String(userId)).catch(() => new Set<string>()) : null

  return (
    <div className="min-h-screen bg-[#061224]">
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
            <BrandName /> · College Prospect Rankings
          </p>
          <h1 className="mt-3 text-center text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
            {stateName}
            <span className="block text-2xl text-[#D7B95A] sm:text-3xl">{board}Class of {year}</span>
          </h1>

          <MarkBoardSeen board={`${state}:${gender}:${year}`} publishedAt={ranking.publishedAt} />
          {/* The stamp sits under the title, where a reader decides whether the board is current. */}
          {lastUpdatedLabel(ranking.publishedAt) ? (
            <p className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D7B95A]/40 bg-[#D7B95A]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#D7B95A]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                {lastUpdatedLabel(ranking.publishedAt)}
              </span>
            </p>
          ) : null}

          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/60">
            {womens
              ? `The top ${ranking.cap} women's wrestlers in ${stateName}'s Class of ${year}, ranked on results: freestyle and national events first, then who they beat.`
              : `The top ${ranking.cap} college prospects in ${stateName}'s Class of ${year}: national results, direct wins and the strength of the opponents behind them.`}{" "}
            <a href="#how-we-rank" className="font-semibold text-white/80 underline underline-offset-4 hover:text-white">
              How we rank
            </a>
          </p>
          {states.length > 1 ? (
            <nav className="mx-auto mt-6 max-w-xl rounded-full border border-white/10 bg-white/[0.04] p-1" aria-label="State">
              <ul className="flex flex-wrap justify-center gap-1">
                {states.map((s) => (
                  <li key={s.code}>
                    <Link
                      href={s.code === "NC" ? basePath : `${basePath}?state=${s.code}`}
                      aria-current={s.code === state ? "page" : undefined}
                      className={`block rounded-full px-4 py-1.5 text-sm font-bold transition ${s.code === state ? "bg-[#A3E635] text-[#0B1426]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <RankingsSummary athletes={ranking.athletes} />

          <RankingsNav current={year} isAdmin={preview} gender={gender} state={state === "NC" ? undefined : state} stateYears={stateYears} />
          {preview && (state === "NC" ? !isPublicRankingsYearPublished(year, gender) : !ranking.publishedAt) ? (
            <p className="mx-auto mt-6 max-w-xl rounded-sm border border-[#D7B95A]/50 bg-[#D7B95A]/10 px-4 py-2 text-center text-xs font-semibold text-[#D7B95A]">
              Staff preview. This board is not released: only admins and its ranker can see this page.
            </p>
          ) : null}


          {!ranking.published ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              {state === "NC"
                ? `The ${board}Class of ${year} is not published yet.`
                : `${stateName}'s ${board}Class of ${year} rankings are being finalized and publish soon.`}
            </p>
          ) : ranking.athletes.length === 0 ? (
            <p className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
              No ranked wrestlers on file for this class.
            </p>
          ) : (
            <>
              {/* Tells a coach the names open profiles, and that the scouting report is behind them. */}
              <p className="mt-8 text-center text-sm text-white/70">
              Tap any wrestler for full results, significant wins and the scouting report.
              </p>
              <RankingLegend isNew={ranking.athletes.some((a) => a.isNew === true)} />
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {ranking.athletes.map((athlete) => (
                <RankedAthleteCard key={athlete.athleteId} athlete={athlete} star={starred ? { starred: starred.has(athlete.athleteId) } : undefined} stateCode={onRw ? state : undefined} />
              ))}
            </ul>
            </>
          )}

          <RankingsWatermark userId={userId} />

          <RankingMethod womens={womens} />

          <p className="mx-auto mt-10 max-w-2xl text-center text-[11px] leading-relaxed text-white/35">
            Rankings are reviewed by <BrandName ncu="NC United" /> staff before publication. A direct win between two ranked
            wrestlers in the last twelve months carries the most weight, with the most recent meeting
            counting highest.
          </p>
        </div>
      </section>
    </div>
  )
}
