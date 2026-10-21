/**
 * The Recruiting Command Center's own sales page (Matt, 15 Oct 2026: "people will want to know more
 * info before they sign up"). What it is, shown rather than described: the plan, the college list,
 * the real college map, compare and cost, coach messages and Learn, with the coach numbers that
 * make it worth having, then the plans and the questions families ask.
 *
 * Open to signed-out visitors. Every sketch of the product is labelled as an example; the map and
 * the numbers are live. Buying goes through /plans, where the checkout lives.
 */
import type { Metadata } from "next"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, BarChart3, BookOpen, Bot, Check, ListChecks, Map as MapIcon, MessageSquare, ShieldCheck, Target } from "lucide-react"

import { CollegeProgramMap } from "@/components/colleges/college-program-map"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import { loadSalesData } from "@/lib/recruiting/sales-data"
import { approvedTestimonials } from "@/lib/recruiting/testimonials"
import { SCOUTING_REPORT_PRICES, formatPrice } from "@/lib/scouting-report-entitlement"
import { createAdminClient } from "@/lib/supabase/admin"
import { BrandName } from "@/components/recruiting/brand-name"

export const dynamic = "force-dynamic"
const SHARE_TITLE = "Recruiting Command Center | RecruitNC"
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

function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${card} relative overflow-hidden p-4`}>
      <span className="absolute right-3 top-3 rounded bg-white/10 px-1.5 text-[10px] font-semibold text-white/60">Example</span>
      {children}
    </div>
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
  const price = formatPrice(SCOUTING_REPORT_PRICES.command_center)
  const stats = d.platform
    ? ([
        [d.platform.coaches, <>College coaches on <BrandName /></>],
        [d.platform.programs, "College programs"],
        [d.platform.profilesViewed, "NC wrestlers viewed by coaches"],
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
        <img src="/toc-finals-looking-ahead-bw.jpg" alt="" aria-hidden className="absolute inset-y-0 right-0 hidden h-full w-[48%] object-cover object-[50%_30%] opacity-90 lg:block" style={{ maskImage: "linear-gradient(to right, transparent, black 35%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 35%)" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060f1f] via-[#060f1f]/90 to-[#060f1f]/10" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70"><BrandName /> · Recruiting Command Center</p>
          <h1 className={`mt-5 text-6xl leading-[0.9] sm:text-8xl ${tocDisplayClass()}`}>
            College recruiting is complicated.
            <span className="block" style={{ color: SKY }}>
              Your plan shouldn&apos;t be.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
            <span className="sm:hidden">One place to plan, find colleges, compare them and hear from coaches. Men&apos;s and women&apos;s wrestling, every division.</span>
            <span className="hidden sm:inline">Hundreds of college wrestling programs, each with its own rules, costs, roster and expectations, and most families are left to figure it out alone. Now there&apos;s one place to manage it: build your plan, discover colleges, compare your options, track coach interest and know what to do next. Men&apos;s and women&apos;s wrestling, every division.</span>
          </p>
          {/* On recruitwrestlers.com there is no national price yet (Matt, 20 Oct 2026): NC United's offer stays NC United's. */}
          <p className="national-only">
            <span className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-black">{price}</span>
              <span className="text-lg text-white/60">/ month · memberships open at launch</span>
            </span>
            <a href="/create-profile" className="mt-4 inline-block rounded-xl bg-[#A3E635] px-7 py-3.5 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">Claim your free profile →</a>
          </p>
          <div className="ncu-only mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-black">{price}</span>
            <span className="text-lg text-white/60">/ month · cancel anytime</span>
          </div>
          <div className="ncu-only mt-6 flex flex-wrap gap-3">
            <Link href={d.onSale ? BUY : "/plans"} className="rounded-xl px-7 py-3.5 text-base font-black text-[#0A1628] shadow-lg transition hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? "Sign up now →" : "See plans →"}
            </Link>
            <a href="#find-your-colleges" className="rounded-xl border border-white/25 bg-[#060f1f]/40 px-7 py-3.5 text-base font-bold transition hover:bg-white/10">
              Try the college map
            </a>
          </div>
          <p className="ncu-only mt-3 text-sm text-white/50">Cancel anytime · Includes Rankings</p>
          <p className="ncu-only mt-1 text-xs text-white/40"><a href="/auth/signin?returnTo=%2Fmy-recruiting" className="underline hover:text-white/80">NC United Blue members: sign in for free access</a></p>
        </div>
      </section>

      {/* The reason it works */}
      <section className="border-b border-white/10 bg-[#0b1a33]/60">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className={`text-center text-4xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>
            This isn&apos;t just a recruiting guide. <span style={{ color: GOLD }}>College coaches are already here.</span>
          </h2>
          {stats.length ? (
            <div className="mt-6 grid grid-cols-2 gap-y-6 lg:grid-cols-4">
              {stats.map(([n, label], i) => (
                <div key={i} className={`px-4 text-center ${i > 0 ? "lg:border-l lg:border-white/10" : ""}`}>
                  <p className={`text-5xl ${tocDisplayClass()}`} style={{ color: GOLD }}>{Number(n).toLocaleString()}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/60">{label}</p>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-6 text-center text-xs text-white/45">Counted live from real activity on <BrandName />.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* The problem, in a family's own words, and what changes (17 Oct 2026 review). */}
        <section className="pt-16">
          <h2 className={`text-center text-3xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>Recruiting has changed. Families need better tools.</h2>
          {/* A phone swipes through the four; a wider screen shows them two by two. */}
          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:mt-8 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
            {[
              ["“I don’t know what we should be doing.”", "A recruiting roadmap from 8th grade through signing day that changes as your wrestler does."],
              ["“I don’t know which colleges are realistic.”", "Every wrestling program at every level, with athletic, academic, financial and personal fit compared side by side."],
              ["“I don’t know if coaches are interested.”", "See which college programs viewed the profile, keep every coach conversation in one place, and track each college."],
              ["“I don’t understand the rules or the costs.”", "Recruiting rules checked against each governing body, and the full yearly cost of every college, not just tuition."],
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

        <div className="pt-12 sm:pt-16">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Find your colleges</p>
          <h2 className={`mt-2 text-4xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Find the right college, not just the biggest name.</h2>
        </div>
        {/* The real map, live: tap any college and see what subscribing unlocks (Matt, 17 Oct 2026). */}
        <section id="find-your-colleges" className="scroll-mt-20 py-12">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            <MapIcon className="h-4 w-4" aria-hidden /> Try it
          </p>
          <p className="mt-2 max-w-2xl text-base text-white/70">
            <span className="sm:hidden">{d.mapPreview?.total ?? "Every"} college programs, every level. Tap one to see what it holds.</span>
            <span className="hidden sm:inline">Explore {d.mapPreview?.total ?? "every"} college wrestling programs across NCAA Division I, II, III, NAIA and junior college, men&apos;s and women&apos;s. Tap any college to see its coaching staff, its recruiting questionnaire and the wrestlers from your state who went there, then save it to your list and compare.</span>
          </p>
          <div className="mt-6">
            <CollegeProgramMap accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""} upsellHref={d.onSale ? BUY : "/plans"} heightClass="h-[340px] sm:h-[560px]" showList={false} cooperative />
          </div>
        </section>

        <Feature
          flip
          icon={BarChart3}
          eyebrow="Compare"
          title="The real cost, and the right fit"
          phoneVisual={false}
          points={["Athletic, academic, financial and personal fit, side by side", "The full yearly cost, not tuition alone", "What families actually paid after aid, where it's published"]}
          visual={
            <Example>
              <div className="space-y-3 pt-5">
                {[["Athletic fit", 85], ["Academic fit", 70], ["Financial fit", 55], ["Personal fit", 90]].map(([l, w]) => (
                  <div key={l as string}>
                    <p className="text-xs text-white/60">{l}</p>
                    <div className="mt-1 flex gap-1.5">
                      {[0, 1, 2].map((n) => (
                        <span key={n} className="h-2 flex-1 rounded-full bg-white/10">
                          <span className="block h-full rounded-full" style={{ width: `${Math.max(20, (w as number) - n * 18)}%`, backgroundColor: [GOLD, SKY, "#A78BFA"][n] }} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Example>
          }
        />

        {/* On a phone the feature's own title says it; this intro is for wider screens. */}
        <div className="hidden pt-16 sm:block">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Build your plan</p>
          <h2 className={`mt-2 text-5xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Know what to do, every year.</h2>
          <p className="mt-3 max-w-2xl text-base text-white/65">A roadmap that adapts to your wrestler. As grades, results and requirements change, so does the plan.</p>
        </div>
        <Feature
          icon={Target}
          eyebrow="Your plan"
          title="Know what to do this year"
          points={["A checklist for every grade, 8th to 12th, that ticks itself from the profile and your college list", "New steps when something changes: a state placing to send coaches, a GPA under a division's minimum", "The dates coaches may call, meet and host, for your wrestler's class"]}
          visual={
            <figure className={`${card} overflow-hidden`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/roadmap.jpg" alt="The recruiting roadmap adapted for an example junior: steps added for a state placing and programs that viewed him, and steps ticked from his profile" loading="lazy" className="block w-full" />
              <figcaption className="px-4 py-2 text-[11px] text-white/45">The real screen, with an example family.</figcaption>
            </figure>
          }
        />

        <Feature
          flip
          icon={BookOpen}
          eyebrow="Learn"
          title="Know the rules before you need them"
          phoneVisual={false}
          points={["Every level's rules, checked against the governing body, men's and women's", "What coaches look at, from where NC wrestlers actually went", "Paying for college, visits, NIL and the questions families ask"]}
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

        {/* On a phone the feature's own title says it; this intro is for wider screens. */}
        <div className="hidden pt-16 sm:block">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Manage your recruiting</p>
          <h2 className={`mt-2 text-5xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Every college, every coach, one place.</h2>
          <p className="mt-3 max-w-2xl text-base text-white/65">Track each college, see verified coach activity, and keep every conversation tied to the college it&apos;s about.</p>
        </div>
        <Feature
          icon={ListChecks}
          eyebrow="My College List"
          title="Every college, and the next step"
          points={["Your stage with each program, from interested to offer", "Verified coach activity: who viewed the profile, who wrote", "Draft a coach email from your wrestler's verified results"]}
          visual={
            <figure className={`${card} overflow-hidden`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/college-list.jpg" alt="My College List: six colleges with fit, full cost, verified coach activity, status and next step" loading="lazy" className="block w-full" />
              <figcaption className="px-4 py-2 text-[11px] text-white/45">The real screen, with an example family.</figcaption>
            </figure>
          }
        />

        <Feature
          flip
          icon={MessageSquare}
          eyebrow="Messages"
          title="Hear from college coaches"
          phoneVisual={false}
          points={["Free for every family: only verified college coaches can start a conversation", "Parents are part of every conversation, alongside their wrestler", "In the Command Center, each conversation shows its college and your list moves on its own"]}
          visual={
            <Example>
              <div className="space-y-3 pt-5 text-sm">
                <div className="max-w-[80%] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <span className="block h-2 w-40 rounded bg-white/30" />
                  <span className="mt-2 block h-2 w-28 rounded bg-white/20" />
                </div>
                <div className="ml-auto max-w-[70%] rounded-2xl bg-[#1f5fbf] px-4 py-3">
                  <span className="block h-2 w-32 rounded bg-white/50" />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-white/50">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> Verified college coach
                </p>
              </div>
            </Example>
          }
        />

        {/* On a phone the feature's own title says it; this intro is for wider screens. */}
        <div className="hidden pt-16 sm:block">
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Your assistant</p>
          <h2 className={`mt-2 text-5xl leading-[0.95] sm:text-6xl ${tocDisplayClass()}`}>Meet Scout.</h2>
          <p className="mt-3 max-w-2xl text-base text-white/65">Your wrestling recruiting assistant. Scout knows your family, the rules for your wrestler&apos;s class and every college program in the country, so every answer is about you.</p>
        </div>
        <Feature
          icon={Bot}
          eyebrow="Scout"
          title="Ask anything about recruiting"
          points={["The exact date a coach may call, meet or host your wrestler, worked out for their class", "Every college program: its coaches, the lineup at your weight, the NC wrestlers who went there and what it really costs", "Writes your emails to coaches from your real results, addressed to the whole staff", "Recruiting only: never weight cutting or medical advice"]}
          visual={
            <div className="relative">
              {/* Scout himself, crouched beside the screen as in Matt's mock-up. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/scout-mascot.webp" alt="" aria-hidden loading="lazy" className="pointer-events-none absolute -bottom-4 -left-3 z-10 w-[40%] max-w-[260px] drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)] sm:-left-12" />
              <figure className={`${card} ml-[24%] overflow-hidden`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screens/scout.jpg" alt="Scout answering when a Division I coach can first contact a class of 2028 wrestler: April 1, 2027" loading="lazy" className="block w-full" />
                <figcaption className="px-4 py-2 text-[11px] text-white/45">The real screen, with an example family.</figcaption>
              </figure>
            </div>
          }
        />

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
            <div className="mx-auto block max-w-xl rounded-3xl border-2 border-[#A3E635] bg-[#15243B] p-6 text-center sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">Two memberships</p>
              <div className="mt-5 grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-black uppercase tracking-wider text-white">Insider</p>
                  <p className="mt-1 text-3xl font-black">{formatPrice(SCOUTING_REPORT_PRICES.subscription)}<span className="text-base font-semibold text-white/55"> / month</span></p>
                  <p className="mt-2 text-sm text-white/70">Every class ranking, and which college programs viewed your profile.</p>
                </div>
                <div className="rounded-2xl border border-[#A3E635]/60 bg-[#A3E635]/[0.06] p-4">
                  <p className="text-sm font-black uppercase tracking-wider text-[#A3E635]">Recruiting Command Center</p>
                  <p className="mt-1 text-3xl font-black">{price}<span className="text-base font-semibold text-white/55"> / month</span></p>
                  <p className="mt-2 text-sm text-white/70">Everything in Insider, plus the plan, every college, your list, coach messages and Scout.</p>
                </div>
              </div>
              <p className="mt-5 text-sm text-white/70">Memberships open at launch. Claim your free profile now: college coaches can already find it.</p>
              <a href="/create-profile" className="mt-6 block rounded-xl bg-[#A3E635] px-6 py-4 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">Claim your free profile →</a>
            </div>
          </div>
          <div className="ncu-only mx-auto max-w-xl rounded-3xl border-2 p-6 text-center sm:p-8" style={{ borderColor: SKY, backgroundColor: "#0b1a33" }}>
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: SKY }}>Recruiting Command Center</p>
            <p className="mt-3 text-5xl font-black sm:text-6xl">
              {price}
              <span className="text-xl font-semibold text-white/55"> / month</span>
            </p>
            <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-white/80">
              {["Your roadmap, 8th grade to signing", "Every college: coaches, full cost, roster, alumni", "Your college list, compare and coach conversations", "Rankings and which programs viewed your profile", "Scout, your recruiting assistant, and the full Learn library"].map((l) => (
                <li key={l} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {l}</li>
              ))}
            </ul>
            <Link href={d.onSale ? BUY : "/plans"} className="mt-8 block rounded-xl px-6 py-4 text-base font-black text-[#0A1628] hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? "Sign up now →" : "See plans →"}
            </Link>
            <p className="mt-3 text-xs text-white/50">Cancel anytime · Includes Rankings</p>
            <p className="mt-1 text-[11px] text-white/40"><a href="/auth/signin?returnTo=%2Fmy-recruiting" className="underline hover:text-white/80">NC United Blue members: sign in for free access</a></p>
          </div>
          <p className="ncu-only mt-6 text-center text-sm text-white/55">
            Just the rankings? <Link href="/plans" className="underline" style={{ color: GOLD }}>Rankings is {formatPrice(SCOUTING_REPORT_PRICES.subscription)}/month</Link>. Or <Link href="/create-profile" className="underline" style={{ color: GOLD }}>claim your free profile</Link>.
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
              ["I'm on Rankings. What happens if I upgrade?", "Your $9.99 plan is cancelled automatically when the Recruiting Command Center starts, so you never pay for both."],
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
            <Link href={d.onSale ? BUY : "/plans"} className="inline-block rounded-xl px-8 py-4 text-base font-black text-[#0A1628] hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? `Sign up now, ${price}/month →` : "See plans →"}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
