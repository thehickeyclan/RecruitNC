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
 */
import type { Metadata } from "next"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Award, BarChart3, BookOpen, Bot, Check, ClipboardList, Cpu, Eye, ListChecks, Map as MapIcon, ShieldCheck, Target } from "lucide-react"

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
import { productName } from "@/lib/recruiting/product-name"

export const dynamic = "force-dynamic"
const SHARE_TITLE = `Recruiting Command Center | ${productName()}`
const SHARE_DESCRIPTION = "Meet Scout, your AI recruiting assistant. Plan every stage, compare colleges and hear from college coaches, on the same platform they use to recruit."
// The link preview when the page is texted or posted: Scout, not the NC United logo (Matt, 17 Oct 2026).
const SHARE_IMAGE = { url: "/images/command-center-share.jpg", width: 1200, height: 630, alt: "Recruiting Command Center: meet Scout, your AI recruiting assistant" }
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

/** A screenshot of the real product, framed like a browser window. */
function Shot({ src, alt, caption = "The real screen, with an example family." }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className={`${card} overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]`}>
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
      <figcaption className="px-4 py-2 text-[11px] text-white/45">{caption}</figcaption>
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
  const d = await loadSalesData(createAdminClient())
  // RecruitWrestlers sells through its own plans page; /plans is NC United's (Matt's product review, 26 Oct 2026).
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  const buyHref = onRw ? "/membership" : d.onSale ? BUY : "/plans"
  const price = formatPrice(SCOUTING_REPORT_PRICES.command_center)
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
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-banner-nchsaa-2026-arena.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-20" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* No state name on the singlet on RecruitWrestlers (Matt, 29 Oct 2026). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={onRw ? "/toc-finals-attack.jpg" : "/toc-finals-looking-ahead-bw.jpg"} alt="" aria-hidden className={`absolute inset-y-0 right-0 hidden h-full w-[48%] object-cover opacity-90 lg:block ${onRw ? "-scale-x-100 object-[30%_40%]" : "object-[50%_30%]"}`} style={{ maskImage: `linear-gradient(to ${onRw ? "left" : "right"}, transparent, black 35%)`, WebkitMaskImage: `linear-gradient(to ${onRw ? "left" : "right"}, transparent, black 35%)` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060f1f] via-[#060f1f]/90 to-[#060f1f]/10" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70"><BrandName /> · Recruiting Command Center</p>
          <h1 className={`mt-5 text-6xl leading-[0.9] sm:text-8xl ${tocDisplayClass()}`}>
            Recruiting shouldn&apos;t depend on who you know.
            <span className="block" style={{ color: SKY }}>
              Now it doesn&apos;t.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
            <span className="sm:hidden">Your wrestler&apos;s best-fit colleges from real results, GPA, budget and where you want to be, plus Scout, your recruiting assistant, 24/7.</span>
            <span className="hidden sm:inline">Your wrestler&apos;s results, GPA, budget, academics and where you want to be, matched against every college wrestling program in the country. A plan for every year, the recruiting rules for your class, and Scout, your personal recruiting assistant, on call 24/7. Men&apos;s and women&apos;s wrestling, every division.</span>
          </p>
          {/* recruitwrestlers.com sells its own two memberships, billed by Guild Ventures (Matt, 22 Oct 2026). */}
          <p className="national-only">
            <span className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-black">{price}</span>
              <span className="text-lg text-white/60">/ month · cancel anytime</span>
            </span>
            <a href="/membership" className="mt-4 inline-block rounded-xl bg-[#A3E635] px-7 py-3.5 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">Join the Command Center →</a>
          </p>
          <div className="ncu-only mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-black">{price}</span>
            <span className="text-lg text-white/60">/ month · cancel anytime</span>
          </div>
          <div className="ncu-only mt-6 flex flex-wrap gap-3">
            <Link href={buyHref} className="rounded-xl px-7 py-3.5 text-base font-black text-[#0A1628] shadow-lg transition hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? "Sign up now →" : "See plans →"}
            </Link>
            <a href="#find-your-colleges" className="rounded-xl border border-white/25 bg-[#060f1f]/40 px-7 py-3.5 text-base font-bold transition hover:bg-white/10">
              Try the college map
            </a>
          </div>
          <p className="ncu-only mt-3 text-sm text-white/50">Cancel anytime · Includes Insider</p>
          <p className="ncu-only mt-1 text-xs text-white/40"><a href="/auth/signin?returnTo=%2Fmy-recruiting" className="underline hover:text-white/80">NC United Blue members: sign in for free access</a></p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* The pain: what recruiting asks of a family today. */}
        <section className="pt-14 sm:pt-20">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>The problem</p>
          <h2 className={`mt-2 max-w-4xl text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Recruiting is a second job no family trained for.</h2>
          <p className="mt-4 max-w-3xl text-base text-white/70 sm:text-lg">
            Hundreds of college programs, five levels with their own contact rules, costs that swing tens of thousands of dollars after aid, and rosters that fill a weight at a time. Most families piece it together from a club coach, a group chat and whatever a recruiting service will tell them. The wrestlers who get recruited are too often the ones whose parents already knew the way.
          </p>
          {/* A phone swipes through the four; a wider screen shows them two by two. */}
          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:mt-8 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
            {[
              ["“I don’t know which colleges are realistic.”", "Best fit from your wrestler's real results, GPA, budget, academics and geography, against every program at every level."],
              ["“I don’t know what we should be doing.”", "A roadmap from 8th grade through signing day that changes as your wrestler does."],
              ["“I don’t know if coaches are interested.”", "See which college programs viewed the profile, and keep every coach conversation in one place."],
              ["“I don’t understand the rules or the costs.”", "The contact dates for your wrestler's class, worked out, and what a year really costs after aid."],
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
            What used to take a well-connected coach and years of phone calls now runs on three things working together.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {([
              [Cpu, "Advanced technology", "Every result your wrestler has, every college roster, every published cost and admissions number, read and computed together."],
              [ShieldCheck, "Compliance built in", "NCAA Division I, II and III, NAIA and junior college rules, men's and women's, checked against the governing bodies, with the dates worked out for your wrestler's class."],
              [Award, "Wrestling expertise", "Built by people who run wrestling rankings and tournaments, and used by the college coaches who recruit: they are on the same platform, viewing profiles and writing to families."],
            ] as Array<[LucideIcon, string, string]>).map(([Icon, title, body]) => (
              <div key={title} className={`${card} p-6`}>
                <Icon className="h-7 w-7" style={{ color: GOLD }} aria-hidden />
                <p className="mt-4 text-xl font-black">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{body}</p>
              </div>
            ))}
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
        </section>

        {/* The product, shown: every picture is the real screen with an invented family. */}
        <Wide
          icon={Target}
          eyebrow="Your best fit"
          title="Which colleges fit your wrestler? Now you know."
          intro="Pick the colleges and say what matters. Compare lines them up on athletic, academic, financial and personal fit, worked out from your wrestler's own results, GPA, test scores, budget, intended major and how far from home you want to be."
          points={["Room at your weight, from the real roster and who graduates before you arrive", "Your GPA and SAT against the middle half admitted", "The full yearly cost, what families paid after aid, and how far from home"]}
        >
          <Shot src={shot("compare")} alt="Compare colleges for Jordan: Appalachian State, Campbell and NC State side by side with athletic fit, team ranking, roster size, room at his weights, wrestlers from his state, acceptance rate, SAT range, graduation rate and cost" />
        </Wide>

        <Wide
          icon={BarChart3}
          eyebrow="College analytics"
          title="Every program, read like a scout reads it."
          intro="Open any college and see what no brochure tells you: how crowded each weight will be the year your wrestler arrives, how the school grades on campus life, what it takes to get in, and what families at every income actually paid."
          points={["Room by weight for your class year, from the current roster", "Admissions, majors and graduation rates from the Department of Education", "Campus life grades and the real cost after grants"]}
        >
          <div className="grid gap-4 md:grid-cols-[2fr_1fr] md:items-start">
            <Shot src={shot("college-analytics")} alt="A college page: room by weight for the class arriving in fall 2028, with the example wrestler's two weights highlighted, then academics and campus life grades" />
            <Shot src={shot("college-fit")} alt="A good fit for Jordan: athletic close, academic stretch, financial good fit; and what families paid after aid at each income" caption="Fit and cost for your family, on every college." />
          </div>
        </Wide>

        <Wide
          icon={Bot}
          eyebrow="Scout · 24/7"
          title="Your personal recruiting assistant. Awake at 11pm on a Sunday."
          intro="Scout knows your wrestler, the rules for your class and every college program in the country. Ask when a coach may call, who has room at your weight, or what a school really costs, and get an answer about you, not a generic article. Then let Scout write the email to the coaches."
          points={["The exact date a coach may call, meet or host your wrestler", "Emails to coaches written from your real results, addressed to the whole staff", "Recruiting only: never weight cutting or medical advice"]}
        >
          <div className="relative grid gap-4 md:grid-cols-2 md:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/scout-mascot.webp" alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -bottom-6 -left-10 z-10 hidden w-[200px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)] lg:block" />
            <Shot src={shot("scout")} alt="Scout answering when a Division I coach can first contact a class of 2028 wrestler: April 1, 2027" />
            <Shot src={shot("scout-email")} alt="Scout drafting a short introduction email to the Campbell coaching staff from the wrestler's results" />
          </div>
        </Wide>

        <Wide
          icon={Eye}
          eyebrow="Coach interest"
          title="See which colleges are looking."
          intro="When a college coach opens your wrestler's profile, you see the program, how often and when. Families stop guessing who is interested and start following up with the ones who are."
          points={["Programs named, with every visit dated", "A week-by-week line of coach views", "Messages from verified college coaches only, with parents in every conversation"]}
        >
          <div className="mx-auto max-w-3xl">
            <Shot src={shot("views")} alt="Six college programs have viewed Jordan: NC State, Campbell, Appalachian State, Mount Olive and Davidson with view counts and dates, and a bar chart of views per week" caption="The real panel, with an example wrestler and invented views." />
          </div>
        </Wide>

        <Wide
          icon={ListChecks}
          eyebrow="Your recruiting board"
          title="Every college, every coach, and the next move."
          intro="A board that runs your recruiting like a pipeline: where you stand with each program, how long it has sat there, who wrote back, which deadline is next, and the one thing to do today."
          points={["Interested to offer, with days in each stage", "Coach views, messages and calls on each card", "Today's moves: apply, email the coach, follow up"]}
        >
          <Shot src={shot("board")} alt="The recruiting board: a pipeline from interested to offer, today's moves, and a card per college with coach views, messages, notes and deadlines" />
        </Wide>

        <Wide
          icon={ClipboardList}
          eyebrow="Interest forms"
          title="Every questionnaire, answered once."
          intro="Each college has its own recruiting questionnaire. Keep your answers in one place, open each form, copy what it asks for, and track which are done."
          points={["Every college on your list, with its form", "Your answers saved privately for your family", "Marked off as you submit"]}
        >
          <Shot src={shot("forms")} alt="Interest forms: four to do, one submitted, and the example family's saved answers ready to copy" />
        </Wide>

        <div className="hidden pt-12 sm:block">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Build your plan</p>
          <h2 className={`mt-2 text-5xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Know what to do, every year.</h2>
          <p className="mt-3 max-w-2xl text-base text-white/65">A roadmap that adapts to your wrestler. As grades, results and requirements change, so does the plan.</p>
        </div>
        <Feature
          icon={Target}
          eyebrow="Your plan"
          title="Know what to do this year"
          points={["A checklist for every grade, 8th to 12th, that ticks itself from the profile and your college list", "New steps when something changes: a state placing to send coaches, a GPA under a division's minimum", "The dates coaches may call, meet and host, for your wrestler's class"]}
          visual={<Shot src={shot("roadmap")} alt="The recruiting roadmap adapted for an example junior: steps added for a state placing and programs that viewed him, and steps ticked from his profile" />}
        />

        <Feature
          flip
          icon={BookOpen}
          eyebrow="Compliance and Learn"
          title="Know the rules before you need them"
          phoneVisual={false}
          points={["Every level's rules, checked against the governing body, men's and women's", "What coaches look at, and where wrestlers from your state actually went", "Paying for college, visits, NIL and the questions families ask"]}
          visual={
            <div className={`${card} p-6`}>
              <p className={`text-6xl ${tocDisplayClass()}`} style={{ color: GOLD }}>Rules, not rumors</p>
              <p className="mt-2 text-sm text-white/60">Each rule cites its source and the date we checked it.</p>
              <Link href="/recruiting/learn/what-coaches-look-for" className="mt-4 inline-flex items-center gap-1 text-sm font-bold hover:underline" style={{ color: GOLD }}>
                Read a free guide <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          }
        />

        {/* The real map, live: tap any college and see what subscribing unlocks (Matt, 17 Oct 2026). */}
        <section id="find-your-colleges" className="scroll-mt-20 py-12">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            <MapIcon className="h-4 w-4" aria-hidden /> Try it
          </p>
          <h2 className={`mt-3 text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Find the right college, not just the biggest name.</h2>
          <p className="mt-3 max-w-2xl text-base text-white/70">
            <span className="sm:hidden">{d.mapPreview?.total ?? "Every"} college programs, every level. Tap one to see what it holds.</span>
            <span className="hidden sm:inline">Explore {d.mapPreview?.total ?? "every"} college wrestling programs across NCAA Division I, II, III, NAIA and junior college, men&apos;s and women&apos;s. Tap any college to see its coaching staff, its recruiting questionnaire and the wrestlers from your state who went there.</span>
          </p>
          <div className="mt-6">
            <CollegeProgramMap accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""} upsellHref={buyHref} heightClass="h-[340px] sm:h-[560px]" showList={false} cooperative />
          </div>
        </section>

        {/* Families, in their own words: approved quotes only (lib/recruiting/testimonials.ts). */}
        {approvedTestimonials().length ? (
          <section className="pt-16">
            <h2 className={`text-center text-4xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>From wrestling families</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
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
            You don&apos;t need to know every recruiting rule, every college coach or every program in the country. You need to know which opportunities fit your wrestler, what to do next, and how to manage it. That&apos;s what the Recruiting Command Center is built for.
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
              {["Your roadmap, 8th grade to signing", "Every college: coaches, full cost, roster, alumni", "Your college list, compare and coach conversations", "Insider: rankings, grade reports and which programs viewed your profile", "Scout, your recruiting assistant, and the full Learn library"].map((l) => (
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
            Just the rankings? <Link href={onRw ? "/membership" : "/plans"} className="underline" style={{ color: GOLD }}>Insider is {formatPrice(SCOUTING_REPORT_PRICES.subscription)}/month</Link>. Or <Link href="/create-profile" className="underline" style={{ color: GOLD }}>claim your free profile</Link>.
          </p>
        </section>

        {/* Questions */}
        <section className="mx-auto max-w-3xl pb-16">
          <h2 className={`text-center text-4xl ${tocDisplayClass()}`}>Questions</h2>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0b1a33]">
            {[
              ["Is it only for North Carolina?", "The rankings and results are North Carolina's today, with more states coming. The college map, Compare, Learn and coach messages work for every family."],
              ["Does the Command Center support women's wrestling?", "Yes. Women's wrestling has its own colleges, rules and rankings, and the Command Center follows your wrestler: a daughter's map, colleges and rules are the women's ones."],
              ["Does it guarantee a scholarship or an offer?", "No. Nothing can. It helps you find the colleges that fit, know what to do next and see real coach activity, so your wrestler's opportunities aren't left to chance."],
              ["Who sees my information?", "Your plan, list and notes are yours alone, and a family's income is never saved. Academics and contact info are seen only by verified college coaches, never the public."],
              ["Can college coaches message my wrestler?", "Yes, verified college coaches can write to your wrestler, and parents are part of every conversation. You stay in control: you can turn off messages from any coach. Messages are free for every family; the Recruiting Command Center ties each conversation to its college and your plan."],
              ["I'm on Insider. What happens if I upgrade?", "Insider is included in the Command Center, so your $9.99 plan is cancelled automatically when the Recruiting Command Center starts, so you never pay for both."],
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
