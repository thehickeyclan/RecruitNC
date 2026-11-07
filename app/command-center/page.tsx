import { ARENA_PHOTO } from "@/lib/arena-photo"
/**
 * The Recruiting Command Center's own sales page (Matt, 15 Oct 2026: "people will want to know more
 * info before they sign up"). What it is, shown rather than described: the plan, the college list,
 * the real college map, compare and cost, coach messages and Learn, with the coach numbers that
 * make it worth having, then the plans and the questions families ask.
 *
 * Rebuilt 29 Oct 2026 (Matt: "get rid of the blurred shot... implicate pain, inflection point"): the
 * pain, why it can be solved now, then the real product. Every picture is a screenshot of the real
 * screen with an invented family (scripts/command-center-screens/capture.cjs, app/dev/screens); the
 * map and the numbers are live. Buying goes through /plans or /membership, where the checkout lives.
 *
 * Reordered 3 Nov 2026 (Matt's review: "far too heavy on coach profile views... it never takes a
 * family through the journey in the order that actually convinces them"). The journey, in his
 * order: the verified RESULTS a family already has here, then what we compute from them and hand a
 * college coach, then who is looking, then the map, the list and the plan — and only then the
 * price. The results engine is the hardest thing here to copy, so it leads instead of surfacing as
 * a line two thirds of the way down. The example in it is a real wrestler with a public
 * commitment, not another invented family, and every line of it links to the live profile.
 *
 * Revised 6 Nov 2026 (Matt: "can't have Brieon info up, it should be made up data... majors don't
 * matter... ensure it has what we have been adding"): the results example is an invented wrestler,
 * the commitments block is gone, majors are out of the copy, and the survey, the college page's
 * check against it, the interested button and the GPA and test check-ins are in. Plainer words.
 */
import type { Metadata } from "next"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Award, BarChart3, BookOpen, Bot, Check, ClipboardList, Cpu, Eye, Heart, ListChecks, Map as MapIcon, ShieldCheck, Target, Trophy } from "lucide-react"

import { CollegeProgramMap } from "@/components/colleges/college-program-map"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import { loadSalesData } from "@/lib/recruiting/sales-data"
import { approvedTestimonials } from "@/lib/recruiting/testimonials"
import { SCOUTING_REPORT_PRICES, formatPrice } from "@/lib/scouting-report-entitlement"
import { RwMembershipPlans } from "@/components/recruiting/rw-membership-plans"
import { createAdminClient } from "@/lib/supabase/admin"
import { BrandName } from "@/components/recruiting/brand-name"
import { headers } from "next/headers"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { rankingsCoverage, recruitingCoverage } from "@/lib/recruiting/brand"
import { shareCardUrl } from "@/lib/share-metadata"
import { createClient } from "@/lib/supabase/server"
import { sendCollegeCoachesToTheirPortal } from "@/lib/recruiting/families-only"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { loadFamilyUpgrade } from "@/lib/recruiting/family-upgrade"
import { FamilyUpgradePage } from "@/components/recruiting/family-upgrade-page"

export const dynamic = "force-dynamic"
const SHARE_TITLE = "Recruiting Command Center"
const SHARE_DESCRIPTION = "Meet Scout, your AI recruiting assistant. Plan every stage, compare colleges and hear from college coaches, on the same platform they use to recruit."
// The link preview when the page is texted or posted: Scout, not the NC United logo (Matt, 17 Oct 2026).
// RecruitWrestlers' deployment gets its own lime card; the gold Scout card is NC United's (launch review, 30 Oct 2026).
const SHARE_IMAGE = /recruitwrestlers/i.test(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "")
  ? { url: shareCardUrl({ title: "Recruiting Command Center", description: "Meet Scout, your recruiting assistant. Best-fit colleges, your plan and coach interest, in one place.", kicker: "RecruitWrestlers" }), width: 1200, height: 630, alt: "Recruiting Command Center on RecruitWrestlers" }
  : { url: "/images/command-center-share.jpg", width: 1200, height: 630, alt: "Recruiting Command Center: meet Scout, your AI recruiting assistant" }
export const metadata: Metadata = {
  title: SHARE_TITLE,
  description: "Plan, track colleges, compare full costs and hear from college coaches: the recruiting portal for wrestling families, men's and women's.",
  openGraph: { title: SHARE_TITLE, description: SHARE_DESCRIPTION, url: "/command-center", type: "website", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: SHARE_TITLE, description: SHARE_DESCRIPTION, images: [SHARE_IMAGE.url] },
}

const GOLD = "#D3B574"
const SKY = "#38bdf8"
const card = "rounded-2xl border border-white/10 bg-[#0b1a33]"
const BUY = "/plans?plan=command_center"

/**
 * The example on the results block: an invented wrestler with invented opponents (Matt, 6 Nov 2026:
 * no real kid on the sales page). The shape is exactly what a real profile shows.
 */
const EXAMPLE = {
  name: "Jordan Hayes",
  line: "Class of 2028 · 157 lbs · North Carolina",
  wins: { total: 31, stateChampions: 6, statePlacers: 19 },
  top: [
    { name: "Tanner Whitlock", from: "GA", credential: "2026 GA 6A State Champion", result: "DEC 6-3", event: "NHSCA National Duals" },
    { name: "Eli Brandvold", from: "PA", credential: "2026 PIAA 3A State Runner-up · NHSCA All-American", result: "DEC 4-2", event: "Super 32" },
    { name: "Mason Calloway", from: "VA", credential: "2026 VHSL Class 6 State Champion", result: "MD 11-2", event: "Beast of the East" },
    { name: "Cole Ardmore", from: "SC", credential: "2026 SCHSL 5A State Champion", result: "FALL 3:41", event: "Ironman" },
  ],
  strength: [
    ["7", "wins over state-ranked opponents in the last 12 months"],
    ["4", "national tournaments wrestled"],
    ["9", "major preseason and postseason tournaments, career"],
  ] as Array<[string, string]>,
}

/**
 * Every state championship we hold a result from, outside North Carolina's own (lib/state-placers).
 * Stable: it is the country less NC, and the row count beside it is read live.
 */
const OPPONENT_RESULT_STATES = 49

/** A screenshot of the real product, framed like a browser window. */
function Shot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className={`${card} overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]`}>
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      </div>
      {/* A tap opens the full-size screen: on a phone the shrunken screenshot is too small to read. */}
      <a href={src} target="_blank" rel="noopener" className="block cursor-zoom-in" aria-label={`${alt} (open full size)`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="block w-full" />
      </a>
      {/* The caption is on two or three screens, not every one: nine of them read like a page
          apologising for its own screenshots (Matt, 3 Nov 2026). */}
      <figcaption className="px-4 py-2 text-xs text-white/50">
        {caption ? <span>{caption} </span> : null}
        <span className="md:hidden">Tap to open full size.</span>
      </figcaption>
    </figure>
  )
}

/** A section heading over a full-width screenshot. */
function Wide({ icon: Icon, eyebrow, title, intro, points, children }: { icon: LucideIcon; eyebrow: string; title: string; intro: string; points: string[]; children: React.ReactNode }) {
  return (
    <section className="py-10 md:py-14">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
        <Icon className="h-4 w-4" aria-hidden /> {eyebrow}
      </p>
      <h2 className={`mt-3 max-w-4xl text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>{title}</h2>
      <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">{intro}</p>
      <ul className="mt-4 grid gap-2 text-[15px] leading-6 text-white/80 sm:grid-cols-3 sm:gap-4">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5">
            <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {p}
          </li>
        ))}
      </ul>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Feature({
  icon: Icon,
  eyebrow,
  title,
  points,
  visual,
  flip = false,
  phoneVisual = true,
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  points: string[]
  visual: React.ReactNode
  flip?: boolean
  /** An illustration, not a real screen: left out on a phone, where every screen of scrolling counts. */
  phoneVisual?: boolean
}) {
  return (
    <section className="grid items-center gap-6 py-8 md:grid-cols-2 md:gap-8 md:py-12">
      <div className={flip ? "md:order-2" : ""}>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
          <Icon className="h-4 w-4" aria-hidden /> {eyebrow}
        </p>
        <h2 className={`mt-3 text-3xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>{title}</h2>
        <ul className="mt-4 space-y-2 text-[15px] leading-6 text-white/80 sm:mt-5 sm:space-y-2.5 sm:text-base">
          {points.map((p) => (
            <li key={p} className="flex gap-2.5">
              <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={`${flip ? "md:order-1" : ""} ${phoneVisual ? "" : "hidden md:block"}`}>{visual}</div>
    </section>
  )
}

export default async function CommandCenterSalesPage() {
  const admin = createAdminClient()
  /*
   * Signed in with no Command Center: a short page about their own wrestler, not this one, which
   * is written for strangers (Matt, 5 Nov 2026: Mandi Nelsen had claimed Tyde and was still told to
   * find and claim the profile and to sign up). Coaches are sent to their own portal; a family that
   * already has the Command Center, and staff, still see this page. Signed out: unchanged.
   */
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await sendCollegeCoachesToTheirPortal(admin, user.id)
    const portal = await resolvePortalViewer({ supabase, admin }).catch(() => null)
    if (portal && !hasPortalAccess(portal.viewer)) {
      return <FamilyUpgradePage upgrade={await loadFamilyUpgrade(admin, portal.userId ?? user.id)} />
    }
  }
  const [d, opponentResults] = await Promise.all([
    loadSalesData(admin),
    // The denominator behind every opponent credential on a profile. A head count, not a read.
    Promise.resolve(admin.from("state_tournament_placers").select("id", { count: "exact", head: true }))
      .then(({ count }) => count ?? null)
      .catch(() => null),
  ])
  // RecruitWrestlers sells through its own plans page; /plans is NC United's (Matt's product review, 26 Oct 2026).
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  const buyHref = onRw ? "/membership" : d.onSale ? BUY : "/plans"
  const price = formatPrice(SCOUTING_REPORT_PRICES.command_center)
  const insiderPrice = formatPrice(SCOUTING_REPORT_PRICES.subscription)
  // Each site shows its own product: screenshots captured in its own theme (scripts/command-center-screens).
  const shot = (name: string) => `/screens/${onRw ? "rw" : "ncu"}/${name}.jpg`
  const stats = d.platform
    ? ([
        [d.platform.coaches, <>College coaches on <BrandName /></>],
        [d.platform.programs, "College programs"],
        [d.platform.profilesViewed, onRw ? "Wrestlers viewed by coaches" : "NC wrestlers viewed by coaches"],
        [d.platform.coachViews, "Profile views by coaches"],
      ] as Array<[number, React.ReactNode]>).filter(([n]) => Number(n) > 0)
    : []

  return (
    <div className="min-h-screen bg-[#060f1f] text-white">
      {/* Hero. The price used to sit here, before the page had proved anything; it is now the band
          under the college map, once a family has seen the record, the coaches and the programs. */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ARENA_PHOTO} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-20" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* No state name on the singlet on RecruitWrestlers (Matt, 29 Oct 2026). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={onRw ? "/toc-finals-attack.jpg" : "/toc-finals-looking-ahead-bw.jpg"} alt="" aria-hidden className={`absolute inset-y-0 right-0 hidden h-full w-[48%] object-cover opacity-90 lg:block ${onRw ? "-scale-x-100 object-[30%_40%]" : "object-[50%_30%]"}`} style={{ maskImage: `linear-gradient(to ${onRw ? "left" : "right"}, transparent, black 35%)`, WebkitMaskImage: `linear-gradient(to ${onRw ? "left" : "right"}, transparent, black 35%)` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060f1f] via-[#060f1f]/90 to-[#060f1f]/10" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70"><BrandName /> · Recruiting Command Center</p>
          {/* The family deck's cover, word for word (lib/business/deck/slides.ts): the wrestler first, then the opportunity. */}
          <h1 className={`mt-5 text-6xl leading-[0.9] sm:text-8xl ${tocDisplayClass()}`}>
            Your wrestler is putting in the work.
            <span className="block" style={{ color: SKY }}>
              Now let&apos;s find the right opportunity.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
            Find the colleges that fit. See which coaches are looking. Know what to do next.
            {d.platform?.coaches ? <span className="font-semibold text-white"> {d.platform.coaches} college coaches are already on it.</span> : null}
          </p>
          {/* recruitwrestlers.com sells its own two memberships, billed by Guild Ventures (Matt, 22 Oct 2026). */}
          {/* /athletes redirects to commitments; the lookup is /create-profile, step one of the family funnel. */}
          <p className="national-only">
            <a href="/create-profile" className="mt-7 mr-3 inline-block rounded-xl bg-[#A3E635] px-7 py-3.5 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">Find your wrestler&apos;s profile →</a>
            <a href="#what-it-costs" className="mt-7 inline-block rounded-xl border border-white/25 bg-[#060f1f]/40 px-7 py-3.5 text-base font-bold hover:bg-white/10">See what it costs</a>
          </p>
          <div className="ncu-only mt-7 flex flex-wrap gap-3">
            <Link href="/create-profile" className="rounded-xl px-7 py-3.5 text-base font-black text-[#0A1628] shadow-lg transition hover:brightness-110" style={{ backgroundColor: SKY }}>
              Find your wrestler&apos;s profile →
            </Link>
            <a href="#what-it-costs" className="rounded-xl border border-white/25 bg-[#060f1f]/40 px-7 py-3.5 text-base font-bold transition hover:bg-white/10">
              See what it costs
            </a>
          </div>
          <p className="mt-3 text-sm text-white/50">Your profile is free. {formatPrice(SCOUTING_REPORT_PRICES.subscription)} a month to see who&apos;s looking. {price} a month for the full Command Center.</p>
          <p className="ncu-only mt-1 text-xs text-white/40"><a href="/auth/signin?returnTo=%2Fmy-recruiting" className="underline hover:text-white/80">NC United Blue members: sign in for free access</a></p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* The results engine, first: the one thing a family already owns here, and the hardest
            thing in the business to copy (Matt, 3 Nov 2026). It used to appear only as a line
            called "Advanced technology", two thirds of the way down the page. */}
        <section className="pt-14 sm:pt-20">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>
            <Trophy className="h-4 w-4" aria-hidden /> Start with the results
          </p>
          <h2 className={`mt-2 max-w-4xl text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>
            Your wrestler&apos;s record is already here.
          </h2>
          <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
            Before you sign up or pay anything, look up your wrestler. Every tournament, every placement and
            every opponent by name is already on file. College coaches come here to read that record, and we
            show them what it really means.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {([
              [ListChecks, "The record", "Every tournament and every match, season by season, with the placement and the opponent. It's here even if your family has never heard of us."],
              [Award, "The wins that count", "Every big win shows who the opponent really was. Not \u201cbeat a good kid\u201d: beat the Georgia 6A state champion, 6-3, at the National Duals."],
              [BarChart3, "Strength of competition", "Wins over ranked opponents, national tournaments wrestled, and the major preseason and postseason tournaments. Every number traces back to a real match."],
            ] as Array<[LucideIcon, string, string]>).map(([Icon, title, body]) => (
              <div key={title} className={`${card} p-6`}>
                <Icon className="h-7 w-7" style={{ color: GOLD }} aria-hidden />
                <p className="mt-4 text-xl font-black">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{body}</p>
              </div>
            ))}
          </div>

          {/* An invented wrestler shaped exactly like a real profile: no real kid on a sales page (Matt, 6 Nov 2026). */}
          <div className={`${card} mt-6 overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/10 bg-white/[0.04] px-5 py-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-black" aria-hidden>JH</span>
              <div className="min-w-0">
                <p className="text-lg font-black leading-tight">{EXAMPLE.name}</p>
                <p className="mt-0.5 text-xs text-white/55">{EXAMPLE.line}</p>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 sm:ml-auto">Example profile</p>
            </div>
            <div className="grid md:grid-cols-[3fr_2fr]">
              <div className="p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Significant wins</p>
                <p className="mt-1 text-sm text-white/70">
                  {EXAMPLE.wins.total} wins · {EXAMPLE.wins.stateChampions} over state champions · {EXAMPLE.wins.statePlacers} over state placers
                </p>
                <ul className="mt-4 space-y-3">
                  {EXAMPLE.top.map((w) => (
                    <li key={w.name} className="grid gap-x-4 gap-y-1 border-t border-white/10 pt-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
                      <span className="min-w-0">
                        <span className="font-bold">{w.name}</span>
                        <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-white/40">{w.from}</span>
                        <span className="block text-xs leading-5" style={{ color: GOLD }}>{w.credential}</span>
                      </span>
                      <span className="text-xs text-white/55 sm:text-right">
                        {w.result} · {w.event}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-white/40">and {EXAMPLE.wins.total - EXAMPLE.top.length} more, each showing who the opponent was.</p>
              </div>
              <div className="border-t border-white/10 p-5 md:border-l md:border-t-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Strength of competition</p>
                <dl className="mt-3 space-y-4">
                  {EXAMPLE.strength.map(([n, label]) => (
                    <div key={label}>
                      <dt className={`text-4xl ${tocDisplayClass()}`} style={{ color: GOLD }}>{n}</dt>
                      <dd className="mt-0.5 text-xs leading-5 text-white/60">{label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <p className="border-t border-white/10 px-5 py-3 text-xs text-white/50">
              Example wrestler and opponents, made up for this page. Every real profile is laid out the same way.{" "}
              <Link href="/create-profile" className="font-bold underline hover:text-white/80">Look up your wrestler&apos;s profile</Link>.
            </p>
          </div>

          <p className="mt-6 max-w-3xl text-base text-white/70">
            Those opponent details aren&apos;t typed in by hand. They come from{" "}
            <strong className="font-bold text-white">{opponentResults ? opponentResults.toLocaleString() : "over 100,000"} state tournament results across {OPPONENT_RESULT_STATES} states</strong>,
            matched wrestler by wrestler. A win in November shows who that opponent turned out to be in
            February, and a college coach can click any line to see where it came from.
          </p>
        </section>

        {/* The pain: what recruiting asks of a family once the record exists. */}
        <section className="pt-16 sm:pt-24">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>The problem</p>
          <h2 className={`mt-2 max-w-4xl text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>A record is not a recruiting plan.</h2>
          <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
            Hundreds of college programs. Five levels, each with its own rules for when coaches can call. Costs that swing by tens of thousands of dollars after aid. Rosters that fill up one weight at a time. Most families piece it together from a club coach, a group chat and a recruiting service. Too often the kids who get recruited are the ones whose parents already knew how it works.
          </p>
          {/* A phone swipes through the four; a wider screen shows them two by two. */}
          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:mt-8 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
            {[
              ["“I don’t know which colleges are realistic.”", "Tell us what matters to your family. Every college page then shows how that school lines up: level, distance, campus and cost."],
              ["“I don’t know what we should be doing.”", "A plan for every grade, 8th through signing day, that updates as your wrestler's results and grades change."],
              ["“I don’t know if coaches are interested.”", "See which college programs viewed the profile, and tell a program's coaches you're interested with one tap."],
              ["“I don’t understand the rules or the costs.”", "The exact dates coaches can contact your wrestler's class, and what a year really costs after aid."],
            ].map(([challenge, answer]) => (
              <div key={challenge} className={`${card} grid w-[85%] shrink-0 snap-center gap-3 p-5 sm:grid-cols-2 sm:gap-4 sm:p-6 md:w-auto`}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/45">The challenge</p>
                  <p className="mt-2 text-lg font-bold leading-6 text-white/90">{challenge}</p>
                </div>
                <div className="sm:border-l sm:border-white/10 sm:pl-4">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: SKY }}>Recruiting Command Center</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">{answer}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-white/40 md:hidden">Swipe for more →</p>
        </section>

        {/* The inflection point: why this can be solved now, and not five years ago. */}
        <section className="pt-16 sm:pt-24">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Why now</p>
          <h2 className={`mt-2 max-w-4xl text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>
            For the first time, every family can have a recruiting team.
          </h2>
          <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
            What used to take a well-connected coach and years of phone calls now comes down to three things working together.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {([
              [Cpu, "The results engine", `Your wrestler's results, checked against ${opponentResults ? opponentResults.toLocaleString() : "over 100,000"} state tournament results from ${OPPONENT_RESULT_STATES} states, plus every college roster, cost and admissions number.`],
              [ShieldCheck, "Compliance built in", "NCAA Division I, II and III, NAIA and junior college rules, men's and women's, taken from the official rulebooks, with the dates worked out for your wrestler's class."],
              [Award, "Wrestling expertise", "Built by people who run wrestling rankings and tournaments. The college coaches who recruit are on here too, viewing profiles and writing to families."],
            ] as Array<[LucideIcon, string, string]>).map(([Icon, title, body]) => (
              <div key={title} className={`${card} p-6`}>
                <Icon className="h-7 w-7" style={{ color: GOLD }} aria-hidden />
                <p className="mt-4 text-xl font-black">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who is reading it: the coach numbers, then the panel a family watches. */}
        <Wide
          icon={Eye}
          eyebrow="Coach interest"
          title="See which colleges are looking."
          intro="When a college coach opens your wrestler's profile, you see the program, how often and when. Stop guessing who's interested and follow up with the ones who are. And when you like a program, tell its coaches with one tap."
          points={["Every program named, with the date of each visit", "Coach views week by week", "\u201cTell the coaches you\u2019re interested\u201d puts your wrestler on that staff\u2019s dashboard right away"]}
        >
          <div className="mx-auto max-w-3xl">
            <Shot src={shot("views")} alt="Six college programs have viewed Jordan: NC State, Campbell, Appalachian State, Mount Olive and Davidson with view counts and dates, and a bar chart of views per week" caption="The real panel, with an example wrestler and invented views." />
          </div>
          {stats.length ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1a33]/60 px-4 py-8">
              <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-white/60">College coaches are already here</p>
              <div className="mt-5 grid grid-cols-2 gap-y-6 lg:grid-cols-4">
                {stats.map(([n, label], i) => (
                  <div key={i} className={`px-4 text-center ${i > 0 ? "lg:border-l lg:border-white/10" : ""}`}>
                    <p className={`text-5xl ${tocDisplayClass()}`} style={{ color: GOLD }}>{Number(n).toLocaleString()}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/60">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-white/45">Counted live from real activity on <BrandName />.</p>
            </div>
          ) : null}
        </Wide>

        {/* The survey and the college page's check against it (6 Nov 2026): the newest thing a family gets. */}
        <Wide
          icon={Heart}
          eyebrow="What matters to your family"
          title="Tell us what matters. Every college page checks it."
          intro="A few minutes of questions for parents and wrestlers: your goals, how far from home, what you can spend, the size and feel of the school, and the levels you're aiming for. From then on, every college page shows how that school stacks up against your answers."
          points={["Level, distance, campus and cost checked on every college page", "Good fit, stretch or concern, with the reason spelled out", "Colleges worth a look, and the suggestions get better the more you use it"]}
        >
          <div className="mx-auto max-w-4xl">
            <Shot src={shot("college-fit")} alt="A good fit for Jordan: athletic, academic, level, distance, campus and cost, each marked good fit or stretch against the family's answers" caption="The real college page card, with an example family." />
          </div>
        </Wide>

        {/* The real map, live: tap any college and see what subscribing unlocks (Matt, 17 Oct 2026).
            Moved up from the bottom of the page — it is the strongest thing on it (3 Nov 2026). */}
        <section id="find-your-colleges" className="scroll-mt-20 py-12">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            <MapIcon className="h-4 w-4" aria-hidden /> Try it
          </p>
          <h2 className={`mt-3 text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Find the right college, not just the biggest name.</h2>
          <p className="mt-3 max-w-2xl text-base text-white/70">
            <span className="sm:hidden">{d.mapPreview?.total ?? "Every"} college programs, every level. Tap one to see more.</span>
            <span className="hidden sm:inline">Explore {d.mapPreview?.total ?? "every"} college wrestling programs across NCAA Division I, II, III, NAIA and junior college, men&apos;s and women&apos;s. Tap any college to see its coaches, its recruiting questionnaire and the wrestlers from your state who went there.</span>
          </p>
          <div className="mt-6">
            <CollegeProgramMap accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""} upsellHref={buyHref} heightClass="h-[340px] sm:h-[560px]" showList={false} cooperative />
          </div>
        </section>

        {/* The price, once the page has earned it: both paid plans named, and the honest limit of
            what either one buys, which used to be the last item behind an accordion. */}
        <section id="what-it-costs" className="scroll-mt-20 py-10 sm:py-14">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>What it costs</p>
          <h2 className={`mt-2 max-w-4xl text-4xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>Two plans. Both monthly. Cancel anytime.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className={`${card} p-6`}>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">Insider</p>
              <p className="mt-2 text-4xl font-black">{insiderPrice}<span className="text-lg font-semibold text-white/50"> / month</span></p>
              <p className="mt-3 text-sm leading-6 text-white/70">The rankings, the grade-by-grade reports and which college programs have viewed your wrestler&apos;s profile.</p>
            </div>
            <div className="rounded-2xl border-2 p-6" style={{ borderColor: SKY, backgroundColor: "#0b1a33" }}>
              <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: SKY }}>Recruiting Command Center</p>
              <p className="mt-2 text-4xl font-black">{price}<span className="text-lg font-semibold text-white/50"> / month</span></p>
              <p className="mt-3 text-sm leading-6 text-white/70">Everything in Insider, plus the What matters survey and college fit, your plan, your college board, Compare and full costs, interest forms, coach messages and Scout.</p>
              <p className="national-only">
                <a href="/membership" className="mt-5 inline-block rounded-xl bg-[#A3E635] px-6 py-3 text-sm font-black text-[#0B1426] hover:bg-[#BEF264]">Join the Command Center →</a>
              </p>
              <Link href={buyHref} className="ncu-only mt-5 inline-block rounded-xl px-6 py-3 text-sm font-black text-[#0A1628] hover:brightness-110" style={{ backgroundColor: SKY }}>
                {d.onSale ? "Sign up now →" : "See plans →"}
              </Link>
            </div>
          </div>
          {/* The most trust-building line on the page, said out loud instead of hidden in the FAQ. */}
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">
            <strong className="font-bold text-white">No one can guarantee a scholarship or an offer, and we don&apos;t.</strong>{" "}
            What we do: help you find the colleges that fit your wrestler, make sure the record a coach reads is
            complete and accurate, and tell you what to do next, so nothing is left to chance.
          </p>
          <p className="mt-3 text-sm text-white/55">
            Or <Link href="/create-profile" className="underline" style={{ color: GOLD }}>claim your free profile</Link>: college coaches can already find it.
          </p>
        </section>

        {/* The product, shown: every picture is the real screen with an invented family. */}
        <Wide
          icon={Target}
          eyebrow="Your best fit"
          title="Which colleges fit your wrestler? Now you know."
          intro="Pick a few colleges and see them side by side: athletic, academic, cost and distance, worked out from your wrestler's own results, GPA, test scores and your family's answers."
          points={["Room at your weight, from the real roster and who graduates before you arrive", "Your GPA and SAT next to the students who get in", "The full yearly cost, what families paid after aid, and how far from home"]}
        >
          <Shot src={shot("compare")} alt="Compare colleges for Jordan: Appalachian State, Campbell and NC State side by side with athletic fit, team ranking, roster size, room at his weights, wrestlers from his state, acceptance rate, SAT range, graduation rate and cost" />
        </Wide>

        <Wide
          icon={BarChart3}
          eyebrow="Every college page"
          title="Every program, the way a coach sees it."
          intro="Open any college and see what no brochure tells you: how crowded each weight will be the year your wrestler arrives, what it takes to get in, how students rate campus life, and what families at every income actually paid."
          points={["Room at each weight for your wrestler's class, from the current roster", "Admissions and graduation rates from the U.S. Department of Education", "Campus life grades and the real cost after grants"]}
        >
          <div className="mx-auto max-w-4xl">
            <Shot src={shot("college-analytics")} alt="A college page: room by weight for the class arriving in fall 2028, with the example wrestler's two weights highlighted, then academics and campus life grades" />
          </div>
        </Wide>

        <Wide
          icon={ListChecks}
          eyebrow="Your recruiting board"
          title="Every college, every coach, and the next move."
          intro="One board for every college on your list: where you stand with each program, how long it's been in that stage, who wrote back, the next deadline, and the one thing to do today."
          points={["From interested to offer, with days in each stage", "Coach views, messages and calls on each card", "Today's to-dos: apply, email the coach, follow up"]}
        >
          <Shot src={shot("board")} alt="The recruiting board: a pipeline from interested to offer, today's moves, and a card per college with coach views, messages, notes and deadlines" caption="Real screens throughout, with an example family." />
        </Wide>

        <Wide
          icon={ClipboardList}
          eyebrow="Interest forms"
          title="Every questionnaire, answered once."
          intro="Every college has its own recruiting questionnaire. Save your answers once, open each form, copy them in, and keep track of which ones are done."
          points={["Every college on your list, with its form", "Your answers saved privately for your family", "Checked off as you submit"]}
        >
          <Shot src={shot("forms")} alt="Interest forms: four to do, one submitted, and the example family's saved answers ready to copy" />
        </Wide>

        <div className="hidden pt-12 sm:block">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Build your plan</p>
          <h2 className={`mt-2 text-5xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Know what to do, every year.</h2>
          <p className="mt-3 max-w-2xl text-base text-white/65">A plan that keeps up with your wrestler. As grades and results change, so does the plan.</p>
        </div>
        <Feature
          icon={Target}
          eyebrow="Your plan"
          title="Know what to do this year"
          points={["A checklist for every grade, 8th to 12th, that checks itself off from the profile and your college board", "A quick GPA check-in each semester and an SAT/ACT reminder, so the plan always has the latest numbers", "New steps when something changes, like a state placing to send coaches or a GPA under a division's minimum"]}
          visual={<Shot src={shot("roadmap")} alt="The recruiting roadmap adapted for an example junior: steps added for a state placing and programs that viewed him, and steps ticked from his profile" />}
        />

        <Feature
          flip
          icon={BookOpen}
          eyebrow="Compliance and Learn"
          title="Know the rules before you need them"
          phoneVisual={false}
          points={["Every level's rules from the official rulebooks, men's and women's", "The exact dates coaches can call, meet and host your wrestler's class", "Paying for college, visits, NIL, the transfer portal and the questions families ask"]}
          visual={
            <div className={`${card} p-6`}>
              <p className={`text-6xl ${tocDisplayClass()}`} style={{ color: GOLD }}>Rules, not rumors</p>
              <p className="mt-2 text-sm text-white/60">Every rule shows where it came from and when we checked it.</p>
              <Link href="/recruiting/learn/what-coaches-look-for" className="mt-4 inline-flex items-center gap-1 text-sm font-bold hover:underline" style={{ color: GOLD }}>
                Read a free guide <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          }
        />

        <Wide
          icon={Bot}
          eyebrow="Scout · 24/7"
          title="Your recruiting assistant. Up at 11pm on a Sunday."
          intro="Scout knows your wrestler, the rules for your class and every college program in the country. Ask when a coach can call, who has room at your weight, or what a school really costs, and get an answer about your wrestler, not a generic article. Then have Scout write the email to the coaches."
          points={["When a coach can call, meet or host your wrestler", "Emails to coaches written from your wrestler's real results", "Answers about your wrestler, any time of day"]}
        >
          <div className="relative grid gap-4 md:grid-cols-2 md:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/scout-mascot.webp" alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -bottom-6 -left-10 z-10 hidden w-[200px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)] lg:block" />
            <Shot src={shot("scout")} alt="Scout answering when a Division I coach can first contact a class of 2028 wrestler: April 1, 2027" />
            <Shot src={shot("scout-email")} alt="Scout drafting a short introduction email to the Campbell coaching staff from the wrestler's results" />
          </div>
        </Wide>

        {/* Families, in their own words: approved quotes only (lib/recruiting/testimonials.ts). */}
        {approvedTestimonials().length ? (
          <section className="pt-16">
            <h2 className={`text-center text-4xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>From wrestling families</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {approvedTestimonials().map((t) => (
                <figure key={t.name} className={`${card} flex flex-col p-6`}>
                  <blockquote className="flex-1 text-base leading-7 text-white/85">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-bold text-white">{t.name}</span>
                    <span className="block text-white/50">{t.detail}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* The emotional promise, without promising outcomes. */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-[#13294B] to-[#0b1a33] px-5 py-8 text-center sm:mt-16 sm:px-12 sm:py-12">
          <h2 className={`text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Stop guessing. Start recruiting with a plan.</h2>
          <p className="mx-auto mt-4 hidden max-w-2xl text-base text-white/75 sm:block">
            You don&apos;t need to know every rule, every coach or every program in the country. You need to know which colleges fit your wrestler and what to do next. That&apos;s what the Recruiting Command Center is for.
          </p>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.25em]" style={{ color: GOLD }}>You don&apos;t have to figure out college wrestling recruiting on your own.</p>
        </section>

        {/* One offer: the Command Center. The other plans are a link, not a second decision. */}
        <section className="py-10 sm:py-16">
          <div className="national-only">
            <div className="block">
              <RwMembershipPlans returnTo="/command-center" />
              <p className="mt-6 text-center text-sm text-[#A8B3C5]">
                Or <a href="/create-profile" className="text-[#A3E635] underline">claim your free profile</a>: college coaches can already find it.
              </p>
            </div>
          </div>
          <div className="ncu-only mx-auto max-w-xl rounded-3xl border-2 p-6 text-center sm:p-8" style={{ borderColor: SKY, backgroundColor: "#0b1a33" }}>
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Recruiting Command Center</p>
            <p className="mt-3 text-5xl font-black sm:text-6xl">
              {price}
              <span className="text-xl font-semibold text-white/55"> / month</span>
            </p>
            <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-white/80">
              {["What matters to your family, checked on every college page", "Your plan, 8th grade to signing", "Every college: coaches, full cost, roster room, alumni", "Your college board, Compare and coach messages", "Insider: rankings, grade reports and which programs viewed your profile", "Scout, your recruiting assistant, and the full Learn library"].map((l) => (
                <li key={l} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {l}</li>
              ))}
            </ul>
            <Link href={buyHref} className="mt-8 block rounded-xl px-6 py-4 text-base font-black text-[#0A1628] hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? "Sign up now →" : "See plans →"}
            </Link>
            <p className="mt-3 text-xs text-white/50">Cancel anytime · Includes Insider</p>
            <p className="mt-1 text-[11px] text-white/40"><a href="/auth/signin?returnTo=%2Fmy-recruiting" className="underline hover:text-white/80">NC United Blue members: sign in for free access</a></p>
          </div>
          <p className="ncu-only mt-6 text-center text-sm text-white/55">
            Just the rankings? <Link href={onRw ? "/membership" : "/plans"} className="underline" style={{ color: GOLD }}>Insider is {insiderPrice}/month</Link>. Or <Link href="/create-profile" className="underline" style={{ color: GOLD }}>claim your free profile</Link>.
          </p>
        </section>

        {/* Questions. The guarantee answer is no longer here: it is said out loud beside the price. */}
        <section className="mx-auto max-w-3xl pb-16">
          <h2 className={`text-center text-4xl ${tocDisplayClass()}`}>Questions</h2>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0b1a33]">
            {[
              ["Where do the results come from?", `State tournaments from ${OPPONENT_RESULT_STATES} states (${opponentResults ? opponentResults.toLocaleString() : "over 100,000"} results), plus national tournaments, duals and in-season matches. Each one is matched to a wrestler, which is how a win on your wrestler's profile can show that the opponent went on to win a state title. If a result is wrong or missing, any family can send a correction from the profile.`],
              onRw
                ? ["Which states are covered?", `Profiles and results are live for ${recruitingCoverage(true)}; rankings for ${rankingsCoverage(true)}, with more states opening one at a time. The college map, Compare, Learn, Scout and coach messages work for every family, in every state.`]
                : ["Is it only for North Carolina?", "The rankings and results are North Carolina's. The college map, Compare, Learn and coach messages work for every family."],
              ["Does the Command Center support women's wrestling?", "Yes. Women's wrestling has its own colleges, rules and rankings, and the Command Center follows your wrestler: a daughter's map, colleges and rules are the women's ones."],
              ["Who sees my information?", "Your plan, your board, your notes and your survey answers are for your family only. Academics and contact info are seen only by verified college coaches, never the public."],
              ["Can college coaches message my wrestler?", "Yes. Verified college coaches can write to your wrestler, and parents see every message. You can turn off messages from any coach. Messages are free for every family; the Command Center puts each one on that college's card on your board."],
              ["I'm on Insider. What happens if I upgrade?", `Insider is included in the Command Center. When you upgrade, your ${insiderPrice} Insider plan is canceled automatically, so you never pay for both.`],
              ["Can parents and the wrestler both use it?", "Yes. Every account linked to your wrestler gets the Command Center, and parents and wrestlers each answer their own part of the survey."],
              ["Can I cancel?", "Anytime, from your account."],
            ].map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-white/40 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-white/65">{a}</p>
              </details>
            ))}
          </div>
          <div className="national-only">
            <div className="mt-10 block text-center">
              <a href="/create-profile" className="inline-block rounded-xl bg-[#A3E635] px-8 py-4 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">Claim your free profile →</a>
            </div>
          </div>
          <div className="ncu-only mt-10 text-center">
            <Link href={buyHref} className="inline-block rounded-xl px-8 py-4 text-base font-black text-[#0A1628] hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? `Sign up now, ${price}/month →` : "See plans →"}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
