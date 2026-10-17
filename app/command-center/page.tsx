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
import { ArrowRight, BarChart3, BookOpen, Check, ListChecks, Map as MapIcon, MessageSquare, ShieldCheck, Target } from "lucide-react"

import { CollegeProgramMap } from "@/components/colleges/college-program-map"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import { loadSalesData } from "@/lib/recruiting/sales-data"
import { SCOUTING_REPORT_PRICES, formatPrice } from "@/lib/scouting-report-entitlement"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Recruiting Command Center | RecruitNC",
  description: "Plan, track colleges, compare full costs and hear from college coaches: the recruiting portal for wrestling families, men's and women's.",
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
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  points: string[]
  visual: React.ReactNode
  flip?: boolean
}) {
  return (
    <section className="grid items-center gap-8 py-12 md:grid-cols-2">
      <div className={flip ? "md:order-2" : ""}>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
          <Icon className="h-4 w-4" aria-hidden /> {eyebrow}
        </p>
        <h2 className={`mt-3 text-4xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>{title}</h2>
        <ul className="mt-5 space-y-2.5 text-base text-white/80">
          {points.map((p) => (
            <li key={p} className="flex gap-2.5">
              <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "md:order-1" : ""}>{visual}</div>
    </section>
  )
}

export default async function CommandCenterSalesPage() {
  const d = await loadSalesData(createAdminClient())
  const price = formatPrice(SCOUTING_REPORT_PRICES.command_center)
  const stats = d.platform
    ? ([
        [d.platform.coaches, "College coaches on RecruitNC"],
        [d.platform.programs, "College programs"],
        [d.platform.profilesViewed, "NC wrestlers viewed by coaches"],
        [d.platform.coachViews, "Profile views by coaches"],
      ] as Array<[number, string]>).filter(([n]) => Number(n) > 0)
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
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">RecruitNC · For wrestling families</p>
          <h1 className={`mt-5 text-6xl leading-[0.9] sm:text-8xl ${tocDisplayClass()}`}>
            The recruiting
            <span className="block" style={{ color: SKY }}>
              Command Center
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
            Your recruiting assistant from 8th grade through signing day: the plan, your colleges, the full cost and the college coaches who are looking, in one place. Men&apos;s and women&apos;s wrestling, every level.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-5xl font-black">{price}</span>
            <span className="text-lg text-white/60">/ month · cancel anytime</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={d.onSale ? BUY : "/plans"} className="rounded-xl px-7 py-3.5 text-base font-black text-[#0A1628] shadow-lg transition hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? "Get the Recruiting Command Center →" : "See plans →"}
            </Link>
            <Link href="/plans" className="rounded-xl border border-white/25 bg-[#060f1f]/40 px-7 py-3.5 text-base font-bold transition hover:bg-white/10">
              Compare all plans
            </Link>
          </div>
          <p className="mt-3 text-sm text-white/50">Included in NC United Blue. On Rankings already? It replaces your $9.99 plan.</p>
        </div>
      </section>

      {/* The reason it works */}
      <section className="border-b border-white/10 bg-[#0b1a33]/60">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-center text-sm font-bold uppercase tracking-[0.25em] text-white/70">
            College coaches recruit here. That&apos;s the difference.
          </p>
          {stats.length ? (
            <div className="mt-6 grid grid-cols-2 gap-y-6 lg:grid-cols-4">
              {stats.map(([n, label], i) => (
                <div key={label} className={`px-4 text-center ${i > 0 ? "lg:border-l lg:border-white/10" : ""}`}>
                  <p className={`text-5xl ${tocDisplayClass()}`} style={{ color: GOLD }}>{Number(n).toLocaleString()}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/60">{label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        {/* The real map, live: tap any college and see what subscribing unlocks (Matt, 17 Oct 2026). */}
        <section className="py-12">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            <MapIcon className="h-4 w-4" aria-hidden /> The college map
          </p>
          <h2 className={`mt-3 text-4xl leading-[0.95] sm:text-5xl ${tocDisplayClass()}`}>
            {d.mapPreview?.total ?? "Every"} colleges with wrestling. Tap one.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-white/70">
            Every program at every level, men&apos;s and women&apos;s. Open any college to see its coaching staff, its recruiting questionnaire and the wrestlers from your state who went there, then save it to your list and compare.
          </p>
          <div className="mt-6">
            <CollegeProgramMap accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""} upsellHref={d.onSale ? BUY : "/plans"} heightClass="h-[460px] sm:h-[560px]" />
          </div>
        </section>

        <Feature
          icon={Target}
          eyebrow="Your plan"
          title="Know what to do this year"
          points={["A roadmap for every grade, 8th to 12th, with a checklist you tick off", "The dates coaches may call, meet and host, for your wrestler's class", "The next three steps, always on your home screen"]}
          visual={
            <Example>
              <div className="grid grid-cols-5 gap-2 pt-4">
                {[["8th", "#5B9BFF"], ["9th", "#38BDF8"], ["10th", "#A78BFA"], ["11th", "#F5C04E"], ["12th", "#F87171"]].map(([g, c], i) => (
                  <div key={g} className="rounded-lg border-t-4 bg-[#060f1f] p-2" style={{ borderTopColor: c }}>
                    <p className="text-xs font-black">{g}</p>
                    {[0, 1, 2, 3].map((n) => (
                      <div key={n} className="mt-2 flex items-center gap-1">
                        <span className={`h-2.5 w-2.5 rounded-sm border ${n < (i === 3 ? 2 : i < 3 ? 4 : 0) ? "border-transparent" : "border-white/30"}`} style={n < (i === 3 ? 2 : i < 3 ? 4 : 0) ? { backgroundColor: c } : undefined} />
                        <span className="h-1.5 flex-1 rounded bg-white/15" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Example>
          }
        />

        <Feature
          flip
          icon={ListChecks}
          eyebrow="My College List"
          title="Every college, and the next step"
          points={["Your stage with each program, from interested to offer", "Verified coach activity: who viewed the profile, who wrote", "Draft a coach email from your wrestler's verified results"]}
          visual={
            <Example>
              <div className="pt-4 text-[12px]">
                {[
                  ["Interested", "Send intro", "bg-sky-400/20 text-sky-200"],
                  ["Viewed 2×", "Questionnaire", "bg-emerald-400/20 text-emerald-200"],
                  ["Coach replied", "Plan a visit", "bg-amber-300/20 text-amber-100"],
                  ["Visited", "Compare", "bg-violet-400/20 text-violet-200"],
                ].map(([status, next, tone], i) => (
                  <div key={i} className="flex items-center gap-2 border-b border-white/5 py-2.5 last:border-0">
                    <span className="h-7 w-7 rounded bg-white/90" />
                    <span className="h-2 flex-1 rounded bg-white/25" />
                    <span className={`rounded px-2 py-0.5 font-semibold ${tone}`}>{status}</span>
                    <span className="rounded border border-white/15 px-2 py-0.5 text-white/70">{next}</span>
                  </div>
                ))}
              </div>
            </Example>
          }
        />

        <Feature
          flip
          icon={BarChart3}
          eyebrow="Compare"
          title="The real cost, and the right fit"
          points={["Athletic, academic, financial and personal fit, side by side", "The full yearly cost, not tuition alone", "What families at your income actually paid, where it's published"]}
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

        <Feature
          icon={MessageSquare}
          eyebrow="Messages"
          title="Hear from college coaches"
          points={["Free for every family: only verified college coaches can start a conversation", "Parents see every message; stop or report a coach anytime", "In the Command Center, each conversation shows its college and your list moves on its own"]}
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

        <Feature
          flip
          icon={BookOpen}
          eyebrow="Learn"
          title="Know the rules before you need them"
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

        {/* The plans, short */}
        <section className="py-12">
          <h2 className={`text-center text-4xl sm:text-5xl ${tocDisplayClass()}`}>Choose your plan</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { name: "Rankings", price: formatPrice(SCOUTING_REPORT_PRICES.subscription), line: "Class rankings, the Top 75, and which programs viewed your profile", color: GOLD, href: "/plans" },
              { name: "Recruiting Command Center", price, line: "Everything in Rankings, plus your recruiting assistant from 8th grade through signing", color: SKY, href: d.onSale ? BUY : "/plans", best: true },
              { name: "NC United Blue", price: "$55", line: "Everything in the Recruiting Command Center, plus practices run by college coaches, the state's best partners and the national team pathway", color: "#7dd3fc", href: "/blue" },
            ].map((p) => (
              <Link key={p.name} href={p.href} className={`${card} flex flex-col border-2 p-6 transition hover:-translate-y-0.5`} style={{ borderColor: p.best ? p.color : "rgba(255,255,255,0.1)" }}>
                <p className="text-sm font-black uppercase tracking-widest" style={{ color: p.color }}>{p.name}</p>
                <p className="mt-2 text-4xl font-black">
                  {p.price}
                  <span className="text-base font-semibold text-white/50"> / month</span>
                </p>
                <p className="mt-2 flex-1 text-sm text-white/65">{p.line}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold" style={{ color: p.color }}>
                  {p.best && d.onSale ? "Get it" : "Details"} <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-white/55">
            Not ready? <Link href="/create-profile" className="underline" style={{ color: GOLD }}>Claim your free profile</Link> and see how many coaches have viewed it.
          </p>
        </section>

        {/* Questions */}
        <section className="mx-auto max-w-3xl pb-16">
          <h2 className={`text-center text-4xl ${tocDisplayClass()}`}>Questions</h2>
          <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0b1a33]">
            {[
              ["Is it only for North Carolina?", "The rankings and results are North Carolina's today, with South Carolina next. The college map, Compare, Learn and the coach messages work for every family."],
              ["Does it work for girls?", "Yes. Women's wrestling has its own colleges, rules and rankings, and the Command Center follows your wrestler: a daughter's map, colleges and rules are the women's ones."],
              ["Who sees my information?", "Your plan, list and notes are yours alone, and a family's income is never saved. Academics and contact info are seen only by verified college coaches, never the public."],
              ["Can college coaches message my wrestler?", "Only verified college coaches can start a conversation, and parents see every message and can stop a coach at any time. Messages are free for every family; the Recruiting Command Center ties each conversation to its college and your plan."],
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
          <div className="mt-10 text-center">
            <Link href={d.onSale ? BUY : "/plans"} className="inline-block rounded-xl px-8 py-4 text-base font-black text-[#0A1628] hover:brightness-110" style={{ backgroundColor: SKY }}>
              {d.onSale ? `Get the Recruiting Command Center, ${price}/month →` : "See plans →"}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
