/**
 * Guild Recruiting's front page: recruit.wrestlingguild.com (Matt approved Phase 1, 16 Oct 2026).
 *
 * A sibling of Guild Training, not a copy: the G, black and Guild gold, but its own product voice.
 * Behind the staging gate until launch (middleware.ts); not indexed. Every number is counted
 * (lib/recruiting/national-stats.ts) and only features that exist are named
 * (lib/recruiting/national-content.ts). No prices, and no ownership line until the legal
 * attribution is approved.
 */
import type { Metadata } from "next"
import Image from "next/image"
import { ArrowRight, Eye, MessageSquare, PhoneCall, Search, ShieldCheck, Trophy, Users, type LucideIcon } from "lucide-react"
import { GuildRecruitingLockup } from "@/components/recruiting/guild-frame"
import { GUILD_GOLD, GUILD_INTEGRITY_RULE, guildMetadata } from "@/lib/recruiting/guild-brand"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { COACH_FEATURES, EVENTS, FAMILY_FEATURES } from "@/lib/recruiting/national-content"
import { loadNationalStats } from "@/lib/recruiting/national-stats"

export const revalidate = 3600

export const metadata: Metadata = guildMetadata(
  "Guild Recruiting | College wrestling recruiting, built on verified results",
  "Where college wrestling coaches find athletes, and families run the recruiting process.",
)

const GOLD_TEXT = "text-[#D4BC82]"
const CARD = "rounded-xl border border-white/10 bg-[#111113]"
const BUTTON = "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold transition-opacity"
const fmt = (n: number) => n.toLocaleString("en-US")

function Label({ children }: { children: React.ReactNode }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.35em] ${GOLD_TEXT}`}>{children}</p>
}

function Feature({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className={`${CARD} p-5`}>
      <Icon className={`h-5 w-5 ${GOLD_TEXT}`} aria-hidden />
      <p className="mt-3 text-base font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-white/55">{body}</p>
    </div>
  )
}

/** The family's funnel, drawn as an example - no real family's data. */
function FunnelPreview() {
  const steps = [
    { n: 9, label: "Viewed the profile" },
    { n: 4, label: "Reached out" },
    { n: 2, label: "Visits" },
    { n: 1, label: "Offers" },
  ]
  return (
    <div className={`${CARD} p-5 shadow-2xl shadow-black`} aria-label="Example of the Command Center">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Who&apos;s reaching out</p>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">Example</span>
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className="rounded-md px-2 py-3 text-center" style={{ backgroundColor: `rgba(184, 157, 96, ${0.12 + i * 0.12})` }}>
            <p className="text-2xl font-black text-white">{s.n}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-white/75">{s.label}</p>
          </li>
        ))}
      </ol>
      <ul className="mt-4 space-y-2 text-sm">
        {[
          ["A Division II program", "Phone call", "Oct 14"],
          ["A Division I program", "Viewed the profile", "Oct 12"],
          ["An NAIA program", "Camp invite", "Oct 9"],
        ].map(([who, what, when]) => (
          <li key={who + what} className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
            <span className="text-white/85">
              <span className="font-semibold text-white">{who}</span> · {what}
            </span>
            <span className="text-xs text-white/40">{when}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function GuildRecruitingHome() {
  const stats = await loadNationalStats().catch(() => null)
  const live = RECRUITING_BRAND.states.filter((s) => s.live)
  const coming = RECRUITING_BRAND.states.filter((s) => !s.live)

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" aria-label="Guild Recruiting">
            <GuildRecruitingLockup />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 md:flex">
            <a href="#families" className="hover:text-white">Families</a>
            <a href="#coaches" className="hover:text-white">College coaches</a>
            <a href="/recruiting/college-map" className="hover:text-white">Colleges</a>
            <a href="/recruiting/learn" className="hover:text-white">Learn</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/signin" className="hidden text-sm font-medium text-white/80 hover:text-white sm:inline">
              Sign in
            </a>
            <a href="/create-profile" className={`${BUTTON} px-4 py-2 text-black hover:opacity-90`} style={{ backgroundColor: GUILD_GOLD }}>
              Get started
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
          <div>
            <Label>Guild Recruiting</Label>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              College recruiting,
              <br />
              <span style={{ color: GUILD_GOLD }}>built on verified results.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/65">Where college wrestling coaches find athletes, and families run the recruiting process.</p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              <a href="/create-profile" className={`${CARD} group block p-5 hover:border-[#B89D60]/70`}>
                <Users className={`h-5 w-5 ${GOLD_TEXT}`} aria-hidden />
                <p className="mt-3 text-lg font-bold">Wrestlers and parents</p>
                <p className="mt-1 text-sm text-white/55">Find your profile and open your Command Center.</p>
                <span className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>
                  Find your profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
              <a href="/auth/signup?type=college-coach" className={`${CARD} group block p-5 hover:border-[#B89D60]/70`}>
                <ShieldCheck className={`h-5 w-5 ${GOLD_TEXT}`} aria-hidden />
                <p className="mt-3 text-lg font-bold">College coaches</p>
                <p className="mt-1 text-sm text-white/55">Free for college staff. Access the moment you sign up.</p>
                <span className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold ${GOLD_TEXT}`}>
                  Create a coach account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            </div>
          </div>
          {/* The Guild emblem: earned, like a Hall of Fame trophy (Matt, 16 Oct 2026). */}
          <div className="relative mx-auto w-full max-w-[520px]">
            <Image src="/guild/guild-emblem.png" alt="The Wrestling Guild emblem: two wrestlers in front of the gold G" width={1100} height={1007} priority sizes="(min-width: 1024px) 520px, 90vw" className="h-auto w-full drop-shadow-[0_30px_60px_rgba(184,157,96,0.18)]" />
          </div>
        </section>

        {/* Numbers */}
        {stats ? (
          <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="By the numbers">
            <div className="grid grid-cols-2 divide-white/10 overflow-hidden rounded-xl border border-white/10 md:grid-cols-4 md:divide-x">
              {[
                { n: stats.coaches, label: "College coaches on the platform" },
                { n: stats.programsViewing, label: "Programs viewing athletes" },
                { n: stats.wrestlers, label: "Athlete profiles" },
                { n: stats.collegePrograms, label: "College programs mapped" },
              ].map((s) => (
                <div key={s.label} className="bg-[#0B0B0C] px-5 py-6">
                  <p className="text-4xl font-black" style={{ color: GUILD_GOLD }}>
                    {fmt(s.n)}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/45">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* The difference */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <Label>The difference</Label>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">College coaches work here.</h2>
              <p className="mt-3 max-w-2xl text-white/60">Not a profile emailed out in hope. Coaches search, track and contact athletes from the same platform families use, and families see who is reaching out.</p>
            </div>
            <FunnelPreview />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Feature icon={Search} title="Coaches search here" body="Every profile is in the search college staff use, with the weight each athlete last competed at." />
            <Feature icon={Eye} title="You see who looked" body="When a college program opens a profile, the family sees the program and when." />
            <Feature icon={PhoneCall} title="Track who reached out" body="Calls, texts, visits and offers, logged in one place beside the verified views." />
          </div>
        </section>

        {/* Families */}
        <section id="families" className="border-y border-white/10 bg-[#0B0B0C] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Label>For families</Label>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">The Command Center.</h2>
                <p className="mt-3 text-white/60">The whole recruiting process, from freshman year to signing day, in one place.</p>
              </div>
              <a href="/create-profile" className={`${BUTTON} text-black hover:opacity-90`} style={{ backgroundColor: GUILD_GOLD }}>
                Find your profile <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FAMILY_FEATURES.map((f) => (
                <Feature key={f.title} {...f} />
              ))}
            </div>
            <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/recruitwrestlers/college-map.jpg" alt="Map of every college wrestling program, coloured by division" width={1600} height={818} loading="lazy" className="h-auto w-full" />
              </div>
              <div>
                <p className="text-xl font-bold">Every college program on one map.</p>
                <p className="mt-2 text-white/60">D1, D2, D3, NAIA and junior college, men&apos;s and women&apos;s, with the full yearly cost and what families like yours actually paid.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Coaches */}
        <section id="coaches" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Label>For college coaches</Label>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Recruit on results, not highlight tapes.</h2>
                <p className="mt-3 text-white/60">Free for college coaching staff. One account and your whole staff on one board.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/auth/signup?type=college-coach" className={`${BUTTON} text-black hover:opacity-90`} style={{ backgroundColor: GUILD_GOLD }}>
                  Create a free account <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/auth/signin" className={`${BUTTON} border border-white/20 text-white hover:border-white/50`}>
                  Sign in
                </a>
              </div>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COACH_FEATURES.map((f) => (
                <Feature key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* Verified results + states */}
        <section className="border-y border-white/10 bg-[#0B0B0C] py-16">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <Label>Verified results</Label>
              <p className="mt-3 text-2xl font-black tracking-tight">Imported from the events themselves.</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {EVENTS.map((e) => (
                  <li key={e} className="flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-white/80">
                    <Trophy className={`h-3.5 w-3.5 ${GOLD_TEXT}`} aria-hidden /> {e}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Label>State by state</Label>
              <p className="mt-3 text-2xl font-black tracking-tight">Your state, on one national platform.</p>
              <ul className="mt-5 space-y-2">
                {live.map((s) => (
                  <li key={s.code} className={`${CARD} flex items-center justify-between px-4 py-3`}>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Live</span>
                  </li>
                ))}
                {coming.map((s) => (
                  <li key={s.code} className={`${CARD} flex items-center justify-between px-4 py-3 opacity-75`}>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/45">Coming soon</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* The rule */}
        <section className="py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="rounded-xl border p-6 sm:p-8" style={{ borderColor: "rgba(184, 157, 96, 0.45)" }}>
              <div className="flex items-start gap-4">
                <ShieldCheck className={`mt-0.5 h-6 w-6 shrink-0 ${GOLD_TEXT}`} aria-hidden />
                <div>
                  <p className="text-lg font-bold">Our integrity rule</p>
                  <p className="mt-2 leading-7 text-white/70">{GUILD_INTEGRITY_RULE}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Be seen by the coaches <span style={{ color: GUILD_GOLD }}>who are already looking.</span>
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/create-profile" className={`${BUTTON} text-black hover:opacity-90`} style={{ backgroundColor: GUILD_GOLD }}>
                Find your profile <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/auth/signup?type=college-coach" className={`${BUTTON} border border-white/20 text-white hover:border-white/50`}>
                <MessageSquare className="h-4 w-4" aria-hidden /> I&apos;m a college coach
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <GuildRecruitingLockup />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
            <a href="#families" className="hover:text-white">Families</a>
            <a href="#coaches" className="hover:text-white">College coaches</a>
            <a href="/recruiting/college-map" className="hover:text-white">Colleges</a>
            <a href="/recruiting/learn" className="hover:text-white">Learn</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
