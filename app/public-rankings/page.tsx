import { PoweredByRw } from "@/components/recruiting/powered-by-rw"
import { SCOUTING_REPORT_PRICES, formatPrice } from "@/lib/scouting-report-entitlement"
import { loadPlatformStats } from "@/lib/platform-stats"
import { ArrowRight, BarChart3, CalendarDays, Check, Lock, GraduationCap, ListOrdered, Medal, Shuffle, Trophy, Users } from "lucide-react"
import { RankingsExplorer, type ExplorerState } from "@/components/rankings/rankings-explorer"
import { loadPublicClassRanking } from "@/lib/rankings/public-rankings-view"
import { RankingsUpdateBanner } from "@/components/rankings-update-banner"
import { hasAnyRankingBoardGrant, rankingBoardAccessFor } from "@/lib/rankings/ranking-board-access"
import { redirect } from "next/navigation"

import { HardLink } from "@/components/hard-link"
import { CoachMessagingIntro } from "@/components/coach-messages/coach-messaging-intro"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
  PUBLIC_TOP_75_COLLEGE_RELEASED,
  getPublicRankingsMax,
  rankedClassYears,
  releasedClassYears,
} from "@/lib/public-rankings-cap"
import { resolveViewGender } from "@/lib/recruiting/coach-program-server"
import { BrandName } from "@/components/recruiting/brand-name"
import { headers } from "next/headers"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { lastUpdatedLabel } from "@/lib/rankings/published-date"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "College Prospect Rankings",
  description: "College wrestling prospect rankings by state and class, men's and women's: national results, quality wins and strength of competition.",
}

/** Where a locked board sends a visitor on RecruitWrestlers. */
const INSIDER = "/membership#insider"
const LOGIN = `/auth/signin?returnTo=${encodeURIComponent("/rankings")}`

const rankingLinks = [
  {
    href: "/public-rankings/2027",
    eyebrow: "Class rankings",
    title: "Class of 2027",
    description: "The published Top 30.",
    icon: ListOrdered,
  },
  {
    href: "/public-rankings/2028",
    eyebrow: "Class rankings",
    title: "Class of 2028",
    description: "The published Top 30.",
    icon: Users,
  },
  {
    href: "/public-rankings/2029",
    eyebrow: "Class rankings",
    title: "Class of 2029",
    description: "The published Top 15.",
    icon: Users,
  },
  {
    href: "/public-rankings/college-prospects",
    eyebrow: "Classes of 2027 & 2028",
    title: "Top 75 College Prospects",
    description: "Class of 2027 and 2028 Top College Prospects.",
    icon: GraduationCap,
  },
]

export default async function PublicRankingsHomepage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { viewer } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })
  // Somebody who ranks a board for us reads the boards, subscriber or not.
  const { data: session } = await (await createClient()).auth.getUser()
  const grants = session.user?.app_metadata?.ranking_board_access
  const onRwHost = stagedBrandForHost((await headers()).get("host")) === "national"
  const member = canSeeProspectRanking(viewer) || hasAnyRankingBoardGrant(grants, "NC")
  const landing = (await searchParams) ?? {}
  /*
   * On RecruitWrestlers a visitor without the rankings gets this same page with the boards locked:
   * what we rank, which states and classes, how - and Insider to open them (Matt, 29 Oct 2026:
   * "where is the sales page?"; it had been a bounce to a bare price table). A Stripe return or a
   * new coach still goes to membership, where those messages live. NC United sells at /rankings.
   */
  const locked = onRwHost && !member && !landing.purchased && landing.welcome !== "coach"
  if (!member && !locked) {
    /*
     * Stripe sends a paying customer here, and the webhook that grants access may not have
     * landed yet. Carrying the flag back means they see "payment received, access activating"
     * rather than the page that sold them the thing they just bought - which reads as a
     * failed purchase.
     */
    const params = (await searchParams) ?? {}
    /* The coach welcome flag rides along too, for the same reason: a redirect that drops it
       swallows the one message a new coach was meant to see. */
    const carried = new URLSearchParams()
    if (params.purchased) carried.set("purchased", "1")
    if (params.welcome === "coach") carried.set("welcome", "coach")
    const query = carried.toString()
    // NC United sells the rankings at /rankings; RecruitWrestlers on its own plans page, never NC United's.
    const sales = stagedBrandForHost((await headers()).get("host")) === "national" ? "/membership" : "/rankings"
    redirect(query ? `${sales}?${query}` : sales)
  }

  // Staff read the boards before the announcement, on the same page customers will use.
  const isAdmin = viewer.isAdmin === true
  const releasedLinks = rankingLinks.filter(({ href }) => {
    if (isAdmin) return true
    if (href === "/public-rankings/college-prospects") return PUBLIC_TOP_75_COLLEGE_RELEASED
    const year = Number(href.split("/").at(-1))
    return PUBLISHED_PUBLIC_RANKINGS_YEARS.includes(year)
  })

  /*
   * Somebody who tried to buy what they already have.
   *
   * The checkout refuses a Blue member or verified coach rather than billing them, and sends
   * them here. Arriving on the boards with no explanation looks like the purchase silently
   * failed, so say plainly what happened: nothing was charged, and this is already yours.
   */
  const alreadyIncluded = Boolean(((await searchParams) ?? {}).included)

  /*
   * Two groups, never one list (Matt, 13 October 2026): the men's classes and the women's classes
   * share years, so a women's card among the men's would read as a fourth class. A women's coach
   * gets her group first. Staff see the women's boards before release, like the men's.
   */
  // A ranker sees the women's classes he ranks before they are released, to check the page.
  const rankerYears = rankedClassYears("Female").filter((y) => rankingBoardAccessFor(grants, "Female", y) != null)
  const womensYears = isAdmin
    ? rankedClassYears("Female")
    : [...new Set([...releasedClassYears("Female"), ...rankerYears])].sort((a, b) => a - b)
  const womensLinks = womensYears.map((year) => ({
    href: `/public-rankings/women/${year}`,
    eyebrow: "Women's class rankings",
    title: `Class of ${year}`,
    description: "The published class rankings.",
    icon: ListOrdered,
  }))
  const { gender: viewGender } = await resolveViewGender()
  const groups = [
    { key: "mens", heading: "Men's Rankings", links: releasedLinks, preview: false, note: null },
    {
      key: "womens",
      heading: "Women's Rankings",
      links: womensLinks,
      // Matt, 14 October 2026: say up front what the women's boards reward, because it is not
      // what the men's do. Women wrestle freestyle in college.
      note:
        "Weighted heavily on freestyle. Women wrestle freestyle in college, so national and state freestyle results and wins over nationally ranked opponents count most. Folkstyle state results are supporting evidence.",
      preview: (isAdmin || rankerYears.length > 0) && releasedClassYears("Female").length === 0,
    },
  ].filter((group) => group.links.length)
  if (viewGender === "Female") groups.reverse()

  /*
   * One tile per state (Matt, 28 Oct 2026: "tiles for each state.. nc available now; the others
   * coming soon"). RecruitWrestlers only - NC United's boards are North Carolina's by definition.
   * A state turns live here when its boards are published; until then it says so and links nowhere.
   */
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  /*
   * A state's tile opens once one of its men's classes is published (ranking_editions), and goes
   * straight to that board; North Carolina's are the class lists below.
   */
  /*
   * Every published edition, both boards, every state: which classes each state offers in the
   * explorer, and when North Carolina's men's boards last changed.
   */
  const { data: editions } = await createAdminClient()
    .from("ranking_editions")
    .select("state, gender, class_year, published_at")
    .not("published_at", "is", null)
    .order("class_year", { ascending: true })
  const editionYears = (code: string, gender: "Male" | "Female") =>
    [...new Set((editions ?? []).filter((e) => e.state === code && e.gender === gender).map((e) => Number(e.class_year)))].sort((a, b) => a - b)
  const releasedMensYears = releasedLinks
    .map(({ href }) => Number(href.split("/").at(-1)))
    .filter((y) => Number.isFinite(y))
  const explorerStates: ExplorerState[] = [
    { code: "NC", name: "North Carolina", mens: releasedMensYears, womens: womensYears },
    ...(onRw
      ? [
          { code: "SC", name: "South Carolina" },
          { code: "VA", name: "Virginia" },
          { code: "MD", name: "Maryland" },
        ].map((st) => ({ ...st, mens: editionYears(st.code, "Male"), womens: editionYears(st.code, "Female") }))
      : []),
  ]
  const liveStateCount = explorerStates.filter((s) => s.mens.length || s.womens.length).length
  /*
   * The state picked in the explorer drives the whole page - its class tiles, its top five, its
   * date (Matt, 29 Oct 2026: "switching the state filter does not change everything to SC").
   */
  const askedState = String(((await searchParams) ?? {}).state ?? "").toUpperCase()
  const picked = explorerStates.find((st) => st.code === askedState && (st.mens.length || st.womens.length)) ?? explorerStates[0]!
  const stateCode = picked.code
  const stateName = picked.name
  const stateQuery = stateCode === "NC" ? "" : `?state=${stateCode}`
  const stateGroups =
    stateCode === "NC"
      ? groups
      : [
          {
            key: "mens",
            heading: "Men's Rankings",
            // North Carolina's boards this state does not have yet show greyed, never as North Carolina's.
            links: [
              ...[...new Set([...releasedMensYears, ...picked.mens])].sort((a, b) => a - b).map((year) => ({
                href: picked.mens.includes(year) ? `/public-rankings/${year}${stateQuery}` : "",
                eyebrow: "Class rankings",
                title: `Class of ${year}`,
                description: picked.mens.includes(year) ? "The published class rankings." : "Coming soon",
                icon: ListOrdered,
              })),
              { href: "", eyebrow: "Classes", title: "Top 75 College Prospects", description: "Coming soon", icon: GraduationCap },
            ],
            preview: false,
            note: null,
          },
          {
            key: "womens",
            heading: "Women's Rankings",
            links: picked.womens.map((year) => ({ href: `/public-rankings/women/${year}${stateQuery}`, eyebrow: "Women's class rankings", title: `Class of ${year}`, description: `The published Top ${getPublicRankingsMax(year, "Female")}.`, icon: ListOrdered })),
            preview: false,
            note: groups.find((g) => g.key === "womens")?.note ?? null,
          },
        ].filter((group) => group.links.length)
  const ncUpdated = (editions ?? [])
    .filter((e) => e.state === stateCode && e.gender === "Male")
    .map((e) => String(e.published_at))
    .sort()
    .at(-1)

  // RecruitWrestlers' boards live at /rankings (middleware); NC United's at /public-rankings.
  const base = onRw ? "/rankings" : "/public-rankings"
  const at = (href: string) => href.replace(/^\/public-rankings/, base)

  // The leading board, five deep, for the members this page is for (the page redirects everyone else).
  const previewYear = picked.mens[0]
  const preview = previewYear != null && !locked && (canSeeProspectRanking(viewer) || isAdmin) ? await loadPublicClassRanking(previewYear, isAdmin, "Male", stateCode).catch(() => null) : null
  const top5 = preview?.athletes.slice(0, 5) ?? []
  // Counted live, so it grows as coaches join (Matt, 29 Oct 2026).
  const platform = locked ? await loadPlatformStats(createAdminClient()).catch(() => null) : null
  const coachCount = platform?.coaches ?? 0
  // Signed out: make the account, then land on Insider's checkout. Signed in: straight to it.
  const signedIn = Boolean(session.user)
  const joinHref = signedIn ? INSIDER : `/auth/signup?returnTo=${encodeURIComponent(INSIDER)}`
  const programCount = platform?.programs ?? 0

  const title = "font-black tracking-tight text-white"
  const panel = "rounded-2xl border border-white/10 bg-[#0f1c2e]"

  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      {/* The banner announces North Carolina's next update; another state's page leaves it off. */}
      {stateCode === "NC" ? <RankingsUpdateBanner /> : null}
      {/* Hero: a real North Carolina wrestler, never a generated one (Matt, 29 Oct 2026). */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* RecruitWrestlers reads state-neutral: no state name on the singlet there (Matt, 29 Oct 2026). */}
        <img
          src={onRw ? "/toc-finals-attack.jpg" : "/toc-finals-north-carolina-bw.jpg"}
          alt=""
          aria-hidden
          className={`absolute inset-y-0 right-0 hidden h-full w-[48%] object-cover opacity-80 md:block ${onRw ? "-scale-x-100 object-[30%_40%]" : "object-[50%_25%]"}`}
          // The mask turns with a flipped photo, so it runs the other way.
          style={{ maskImage: `linear-gradient(to ${onRw ? "left" : "right"}, transparent, black 40%)`, WebkitMaskImage: `linear-gradient(to ${onRw ? "left" : "right"}, transparent, black 40%)` }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D3B574]">
              <BrandName ncu="RecruitNC" national="RecruitWrestlers" /> · Recruiting intelligence
            </p>
            {locked ? (
              /*
               * For families and wrestlers who do not have the rankings yet (Matt, 29 Oct 2026): what
               * college coaches see, how we rank, and the live count of coaches using it.
               */
              <>
                <h1 className={`mt-3 text-4xl sm:text-6xl ${title}`}>See what college coaches see.</h1>
                <p className="mt-3 text-xl font-bold text-white/80 sm:text-2xl">College Prospect Rankings: our No. 1 recruiting resource for college coaches, at every division.</p>
                <p className="mt-4 text-base leading-7 text-white/65">
                  Coaches open these boards to decide who to recruit. We rank men&apos;s and women&apos;s prospects on national competition,
                  quality wins, head-to-head results, common opponents and state performance, and show the evidence behind every place.
                  Insider puts the same boards in front of your family.
                </p>
                {coachCount ? (
                  <p className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    <span><span className="text-4xl font-black text-[#D3B574]">{coachCount.toLocaleString()}</span> <span className="text-sm text-white/70">college coaches use it</span></span>
                    {programCount ? <span><span className="text-4xl font-black text-[#D3B574]">{programCount.toLocaleString()}</span> <span className="text-sm text-white/70">college programs</span></span> : null}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a href={joinHref} className="inline-flex items-center gap-2 rounded-xl bg-[#D3B574] px-6 py-3 text-sm font-black text-[#0A1628] hover:brightness-110">
                    Join Insider · {formatPrice(SCOUTING_REPORT_PRICES.subscription)}/mo <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                  {signedIn ? null : (
                    <a href={LOGIN} className="rounded-xl border border-white/25 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
                      Log in
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className={`mt-3 text-4xl sm:text-6xl ${title}`}>College Prospect Rankings</h1>
                <p className="mt-3 text-xl font-bold text-white/80 sm:text-2xl">Beyond records. Beyond state championships.</p>
                <p className="mt-4 text-base leading-7 text-white/65">
                  We rank men&apos;s and women&apos;s wrestling prospects on national competition, quality wins, head-to-head results,
                  common opponents and state performance, so college coaches at every level can find and evaluate talent.
                </p>
                <p className="mt-4 text-base font-bold text-[#D3B574]">We do the research. You discover the talent.</p>
            <PoweredByRw className="mt-3" />
              </>
            )}
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {(locked ? [] : [
                [Users, "Built for college coaches"],
                [BarChart3, "Men's and women's rankings"],
              ] as const).map(([Icon, label]) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0A1628]/70 px-3 py-2 text-white/80">
                  <Icon className="h-4 w-4 text-[#D3B574]" aria-hidden /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:py-12">
        {/* College coaches who have not messaged anyone yet: renders nothing for everyone else. */}
        <CoachMessagingIntro className="mx-auto max-w-2xl" />
        {alreadyIncluded ? (
          <div className="mx-auto max-w-2xl rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 px-6 py-4 text-center">
            <p className="text-sm font-semibold text-[#D3B574]">
              You already have the rankings &mdash; no payment needed.
            </p>
            <p className="mt-1 text-sm text-white/65">
              They are included with your NC United Blue membership. You have not been charged.
            </p>
          </div>
        ) : null}

        <div className={`${panel} p-5 sm:p-6`}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`text-2xl ${title}`}>Explore prospect rankings</h2>
              <p className="mt-1 text-sm text-white/60">{onRw ? "Pick a state, division and class to open its latest rankings." : "Pick a division and class to open its latest rankings."}</p>
            </div>
            {onRw ? (
              <span className="rounded-full bg-[#D3B574] px-3 py-1 text-xs font-black text-[#0A1628]">
                {liveStateCount} {liveStateCount === 1 ? "state" : "states"} live
              </span>
            ) : null}
          </div>
          <RankingsExplorer states={explorerStates} selected={stateCode} lockedHref={locked ? INSIDER : undefined} base={base} showStates={onRw} initialGender={viewGender === "Female" && womensYears.length ? "womens" : "mens"} />
        </div>

        {stateGroups.map((group) => (
          <div key={group.key} id={group.key} className={`${panel} scroll-mt-24 p-5 sm:p-6`}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                {/* Every board names its state (Matt, 29 Oct 2026). */}
                <h2 className={`text-2xl ${title}`}>{stateName} {group.heading}</h2>
                {group.preview ? (
                  <span className="mt-1 inline-block rounded-full border border-[#D3B574]/50 px-2.5 py-0.5 text-xs font-semibold text-[#D3B574]">
                    Staff preview — not yet released
                  </span>
                ) : null}
              </div>
              {group.key === "mens" && lastUpdatedLabel(ncUpdated) ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {lastUpdatedLabel(ncUpdated)}
                </span>
              ) : null}
            </div>
            {group.note ? <p className="mb-5 max-w-3xl text-sm leading-relaxed text-white/65">{group.note}</p> : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.links.map(({ href, title: cardTitle, description, icon: Icon }) => !href ? (
                <div key={cardTitle} aria-disabled className="h-full rounded-xl border border-dashed border-white/15 p-5 text-white/40">
                  <Icon className="h-6 w-6" aria-hidden />
                  <p className="mt-3 text-2xl font-black">{cardTitle}</p>
                  <p className="mt-1 text-sm">{description}</p>
                </div>
              ) : (
                <HardLink key={href} href={locked ? INSIDER : at(href)} className="group block h-full rounded-xl border border-white/10 bg-[#13294B]/60 p-5 transition hover:-translate-y-0.5 hover:border-[#D3B574]/70">
                  <Icon className="h-6 w-6 text-[#D3B574]" aria-hidden />
                  <p className="mt-3 text-2xl font-black text-white">{cardTitle}</p>
                  <p className="mt-1 text-sm text-white/60">{description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#D3B574]">
                    {locked ? <><Lock className="h-4 w-4" aria-hidden /> Unlock with Insider</> : <>View rankings <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></>}
                  </span>
                </HardLink>
              ))}
            </div>
          </div>
        ))}

        {locked ? (
          /* The other half of Insider: which colleges looked at your wrestler (Matt, 29 Oct 2026). */
          <div className={`${panel} grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_1.2fr] md:items-center`}>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D3B574]">Also in Insider</p>
              <h2 className={`mt-2 text-3xl ${title}`}>See which colleges are looking at your wrestler.</h2>
              <p className="mt-3 text-[15px] leading-7 text-white/70">
                When a college coach opens the profile, Insider names the program, how many times and when. Free accounts see
                that someone looked; Insider shows who.
              </p>
            </div>
            <figure className="overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/rw/views.jpg" alt="Six college programs have viewed the example wrestler, named with logos, view counts and dates" loading="lazy" className="block w-full" />
              <figcaption className="px-3 py-1.5 text-[11px] text-white/45">The real panel, with an example wrestler.</figcaption>
            </figure>
          </div>
        ) : null}

        {locked ? (
          <div className="rounded-2xl border-2 border-[#D3B574] bg-[#0f1c2e] p-6 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D3B574]">Insider</p>
                <h2 className={`mt-2 text-3xl sm:text-4xl ${title}`}>The rankings, and who&apos;s looking.</h2>
                <ul className="mt-4 space-y-2 text-[15px] text-white/80">
                  {[
                    "Every published class ranking, men's and women's, in every live state",
                    "The evidence behind each place: national results and who he beat",
                    "Your wrestler's rank on his profile, and which college programs viewed it",
                  ].map((l) => (
                    <li key={l} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden /> {l}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0A1628] p-5 text-center">
                <p className="text-4xl font-black text-white">{formatPrice(SCOUTING_REPORT_PRICES.subscription)}<span className="text-base font-semibold text-white/55"> / month</span></p>
                <p className="mt-1 text-xs text-white/50">Cancel anytime · included in the Recruiting Command Center</p>
                <a href={joinHref} className="mt-4 block rounded-xl bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628] hover:brightness-110">{signedIn ? "Join Insider →" : "Sign up for Insider →"}</a>
                {signedIn ? null : (
                  <a href={LOGIN} className="mt-2 block rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">Already a member? Log in</a>
                )}
                <a href="/auth/coach-signup" className="mt-3 block text-sm text-white/70 underline hover:text-white">College coach? Free access</a>
              </div>
            </div>
          </div>
        ) : null}

        {top5.length ? (
          <div className={`${panel} p-5 sm:p-6`}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className={`text-2xl ${title}`}>{stateName} Men&apos;s Class of {previewYear}: the top five</h2>
              <HardLink href={at(`/public-rankings/${previewYear}${stateQuery}`)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#D3B574] hover:underline">
                View full rankings <ArrowRight className="h-4 w-4" aria-hidden />
              </HardLink>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-white/50">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-3 font-semibold">#</th>
                    <th className="py-2 pr-3 font-semibold">Athlete</th>
                    <th className="py-2 pr-3 font-semibold">School</th>
                    <th className="py-2 pr-3 font-semibold">Weight</th>
                    <th className="py-2 pr-3 font-semibold">Key results</th>
                    <th className="py-2 font-semibold"><span className="sr-only">Profile</span></th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((a) => (
                    <tr key={a.athleteId} className="border-b border-white/5 last:border-0">
                      <td className="py-3 pr-3 text-base font-black">{a.rank}</td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-3">
                          {a.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white/60">
                              {a.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                            </span>
                          )}
                          <span className="font-bold text-white">{a.name}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-white/75">{a.highSchool ?? "—"}</td>
                      <td className="py-3 pr-3 text-white/75">{a.weightClass ?? "—"}</td>
                      <td className="py-3 pr-3 text-white/75">{a.credentials.slice(0, 2).map((c) => c.label).join(" · ") || "—"}</td>
                      <td className="py-3 text-right">
                        <HardLink href={`/view-profile?id=${encodeURIComponent(a.athleteId)}`} className="inline-block rounded-lg border border-[#D3B574] px-3 py-1.5 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
                          View profile
                        </HardLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className={`${panel} p-5 sm:p-6`}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`text-2xl ${title}`}>{locked ? "How we rank" : "How we evaluate college prospects"}</h2>
              <p className="mt-1 text-sm text-white/60">
                {locked
                  ? "Every result is read, not added up: who he wrestled, who he beat, and where. The same evidence college coaches see beside every place."
                  : "A review of every result, not a points formula."}
              </p>
            </div>
            {previewYear != null && !locked ? (
              <HardLink href={`${at(`/public-rankings/${previewYear}${stateQuery}`)}#how-we-rank`} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/5">
                How we rank <ArrowRight className="h-4 w-4" aria-hidden />
              </HardLink>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              [Trophy, "National performance", "Results at the premier national tournaments, against nationally competitive fields."],
              [BarChart3, "Strength of competition", "Who he wrestled and who he beat: the quality of every win."],
              [Shuffle, "Head-to-head and common opponents", "Direct matchups first, then shared opponents for context."],
              [Medal, "State performance", "State championships, placements and progress season to season."],
            ] as const).map(([Icon, h, body]) => (
              <div key={h} className="rounded-xl border border-white/10 bg-[#13294B]/60 p-5">
                <Icon className="h-6 w-6 text-[#D3B574]" aria-hidden />
                <p className="mt-3 font-bold text-white">{h}</p>
                <p className="mt-1 text-sm leading-6 text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/*
          * The other half of the job. A verified coach lands here when he signs in; the boards
          * say who is good and the profiles say what they did. Shown to coaches only - a family
          * browsing their own class board does not need pointing at a directory of other people's children.
          */}
        {viewer.isVerifiedCoach === true ? (
          <HardLink href="/prospects/all" className={`${panel} flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-[#D3B574]/60 sm:p-6`}>
            <span>
              <span className={`block text-xl ${title}`}>{onRw ? "Every wrestler, ranked or not" : "Every North Carolina wrestler, ranked or not"}</span>
              <span className="mt-1 block text-sm text-white/65">Full profiles: results, film, academics and contact details.</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628]">
              Explore athlete profiles <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </HardLink>
        ) : null}

        {isAdmin && PUBLISHED_PUBLIC_RANKINGS_YEARS.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 px-6 py-4 text-center">
            <p className="text-sm font-semibold text-[#D3B574]">Admin preview — not yet released</p>
            <p className="mt-1 text-sm text-white/60">Only admins can open these boards right now.</p>
          </div>
        ) : null}

        {releasedLinks.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-lg font-semibold text-white">New rankings are coming soon.</p>
            <p className="mt-2 text-sm text-white/55">We will publish each board after its official release.</p>
          </div>
        ) : null}

        <p className="mx-auto max-w-2xl pt-4 text-center text-sm leading-relaxed text-white/55">
          Rankings are updated as new results and verified athlete information become available.
        </p>
      </section>
    </main>
  )
}
