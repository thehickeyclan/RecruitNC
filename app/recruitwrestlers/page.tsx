/**
 * recruitwrestlers.com - the national recruiting product's front door (Matt, 15 October 2026).
 *
 * Two doors, families and college coaches, and nothing of NC United: its own frame
 * (components/app-chrome.tsx) and served at "/" only on the national domain (middleware.ts).
 * Accounts, sign-in and the Command Center still live on the app's domain, so every button goes
 * there (NATIONAL_BRAND.appOrigin).
 *
 * Only what exists is claimed, from an inventory of the code on 15 October 2026. Every number is
 * counted (lib/recruiting/national-stats.ts). Not advertised on purpose: prices (the Command
 * Center's full tools are NC United Blue in North Carolina; no national price yet), message
 * volume, and states that are not live.
 */
import type { Metadata } from "next"
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  Eye,
  FileText,
  GitCompareArrows,
  GraduationCap,
  Inbox,
  ListChecks,
  Mail,
  Map,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"
import { NATIONAL_BRAND, RECRUITING_BRAND, stateBrand } from "@/lib/recruiting/brand"
import { loadNationalStats, type NationalStats } from "@/lib/recruiting/national-stats"

export const revalidate = 3600

export const metadata: Metadata = {
  // Absolute: the site-wide template would append "| NC United Wrestling".
  title: { absolute: "RecruitWrestlers | College wrestling recruiting, built on verified results" },
  description:
    "The recruiting platform where college wrestling coaches and families meet: verified results, a Command Center for families, and a free recruiting portal for college coaches.",
}

const APP = NATIONAL_BRAND.appOrigin
const GOLD = "text-[#D3B574]"
const PANEL = "rounded-2xl border border-white/10 bg-[#0f1c2e]"
const BUTTON = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors"
const PRIMARY = `${BUTTON} bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]`
const SECONDARY = `${BUTTON} border border-white/20 text-white hover:border-white/50`

function Wordmark({ second, className = "" }: { second: string; className?: string }) {
  return (
    <span className={`font-black uppercase italic tracking-tight ${className}`}>
      <span className="text-white">Recruit</span>
      <span className={GOLD}>{second}</span>
    </span>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className={`text-xs font-black uppercase tracking-[0.25em] ${GOLD}`}>{children}</p>
}

function Feature({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className={`${PANEL} p-5`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D3B574]/15">
        <Icon className={`h-5 w-5 ${GOLD}`} aria-hidden />
      </span>
      <p className="mt-4 text-base font-bold text-white">{title}</p>
      <p className="mt-1 text-sm text-white/60">{body}</p>
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString("en-US")

/** An illustration of the Command Center home, drawn rather than screenshotted: no real family's data. */
function CommandCenterPreview() {
  const tiles = [
    { label: "Profile", value: "100%", sub: "complete" },
    { label: "My list", value: "8", sub: "colleges" },
    { label: "Programs viewed", value: "5", sub: "this season" },
  ]
  const steps = ["Finish your highlight reel", "Send your info to 3 colleges", "Add your next tournament"]
  return (
    <div className={`${PANEL} relative overflow-hidden p-5 shadow-2xl shadow-black/40`} aria-label="Illustration of the Command Center">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${GOLD}`}>Command Center</p>
          <p className="mt-0.5 text-lg font-black text-white">Your recruiting, in one place</p>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-300">Example</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-white/10 bg-[#0A1628] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{t.label}</p>
            <p className="mt-1 text-2xl font-black text-white">{t.value}</p>
            <p className="text-[11px] text-white/45">{t.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-[#0A1628] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Next steps</p>
        <ul className="mt-2 space-y-1.5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm text-white/80">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${i === 0 ? "border-emerald-300 bg-emerald-300/20" : "border-white/25"}`} />
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-3">
        <Eye className={`h-5 w-5 shrink-0 ${GOLD}`} aria-hidden />
        <p className="text-sm text-white/85">
          <span className="font-bold text-white">A Division I program</span> viewed your profile
        </p>
      </div>
    </div>
  )
}

function StatsBand({ stats }: { stats: NationalStats | null }) {
  if (!stats) return null
  const items = [
    { value: fmt(stats.coaches), label: "college coaches on the platform" },
    { value: fmt(stats.programsViewing), label: "college programs viewing wrestlers" },
    { value: fmt(stats.wrestlers), label: "high school wrestler profiles" },
    { value: fmt(stats.collegePrograms), label: "college programs on the map" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className={`${PANEL} px-5 py-4`}>
          <p className="text-3xl font-black text-white sm:text-4xl">{i.value}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/45">{i.label}</p>
        </div>
      ))}
    </div>
  )
}

const FAMILY_FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: ListChecks, title: "A plan for every month", body: "What to do now for your grade: profile, college list, questionnaires, emails." },
  { icon: ClipboardList, title: "Your college list", body: "Every school you're considering, with cost, fit, your stage and the next step." },
  { icon: Map, title: "Every program on one map", body: "D1, D2, D3, NAIA and junior college, men's and women's." },
  { icon: GitCompareArrows, title: "Compare colleges", body: "Your scores against admitted students, real cost at your income, rosters." },
  { icon: Mail, title: "Email coaches, ready to send", body: "Drafts built from your verified results, plus the info every questionnaire asks." },
  { icon: Eye, title: "See who's looking", body: "Which college programs viewed your profile, and when." },
  { icon: MessageSquare, title: "Messages from coaches", body: "College coaches write to you here. Parents see every message." },
  { icon: GraduationCap, title: "Learn the process", body: "Rules by level, eligibility, paying for college, the timeline." },
]

const COACH_FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: Search, title: "Search every wrestler", body: "Class, weight last competed, honors, committed or not." },
  { icon: BarChart3, title: "Prospect rankings", body: "Men's and women's class boards, built on verified results." },
  { icon: FileText, title: "Scouting reports", body: "Results, significant wins, head to head, academics and contact." },
  { icon: Star, title: "One board for your staff", body: "Star wrestlers, move them through your funnel, log every call and visit." },
  { icon: Inbox, title: "Message families directly", body: "The wrestler and every parent see it, and can reply." },
  { icon: GitCompareArrows, title: "Compare two wrestlers", body: "Head to head, common opponents and strength of schedule." },
  { icon: Target, title: "Your perfect recruit", body: "Set your needs once; every wrestler is flagged against them." },
  { icon: CalendarCheck, title: "Where they compete next", body: "Your recruits' upcoming events, so you know where to watch." },
]

const EVENTS = [
  "State championships",
  "NHSCA Nationals",
  "Super 32",
  "Fargo",
  "Journeymen",
  "National Duals",
  "Ultimate Club Duals",
  "Women's Nationals",
]

export default async function RecruitWrestlersHome() {
  const stats = await loadNationalStats().catch(() => null)
  const live = RECRUITING_BRAND.states.filter((s) => s.live)
  const coming = RECRUITING_BRAND.states.filter((s) => !s.live)

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A1628]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" className="text-xl sm:text-2xl" aria-label={NATIONAL_BRAND.name}>
            <Wordmark second="Wrestlers" />
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-white/70 md:flex">
            <a href="#families" className="hover:text-white">Families</a>
            <a href="#coaches" className="hover:text-white">College coaches</a>
            <a href="#states" className="hover:text-white">States</a>
            <a href={`${APP}/recruiting/learn`} className="hover:text-white">Learn</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={`${APP}/auth/login`} className="hidden text-sm font-semibold text-white/80 hover:text-white sm:inline">
              Sign in
            </a>
            <a href={`${APP}/create-profile`} className={`${PRIMARY} px-4 py-2`}>
              Get started
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-12 pt-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <Eyebrow>College wrestling recruiting</Eyebrow>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Get recruited on <span className={GOLD}>verified results.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/70">
              Where college coaches find wrestlers, and families run the recruiting process.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <a href={`${APP}/create-profile`} className={`${PANEL} group block p-5 hover:border-[#D3B574]/60`}>
                <Users className={`h-6 w-6 ${GOLD}`} aria-hidden />
                <p className="mt-3 text-lg font-black">I&apos;m a wrestler or parent</p>
                <p className="mt-1 text-sm text-white/60">Find your profile and open your Command Center.</p>
                <span className={`mt-3 inline-flex items-center gap-1 text-sm font-bold ${GOLD}`}>
                  Find your profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
              <a href={`${APP}/auth/signup?type=college-coach`} className={`${PANEL} group block p-5 hover:border-[#D3B574]/60`}>
                <ShieldCheck className={`h-6 w-6 ${GOLD}`} aria-hidden />
                <p className="mt-3 text-lg font-black">I&apos;m a college coach</p>
                <p className="mt-1 text-sm text-white/60">Free for college staff. Access the moment you sign up.</p>
                <span className={`mt-3 inline-flex items-center gap-1 text-sm font-bold ${GOLD}`}>
                  Create a coach account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            </div>
          </div>
          <CommandCenterPreview />
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="By the numbers">
          <StatsBand stats={stats} />
        </section>

        {/* The difference */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <Eyebrow>The difference</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">College coaches are already here.</h2>
            <p className="mt-3 text-white/65">Not a profile you email out and hope. The coaches search, track and write to wrestlers on the same platform.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Feature icon={Search} title="Coaches search here" body="Every profile is in the search college staff use, with the weight each wrestler last competed at." />
            <Feature icon={Eye} title="You see who looked" body="When a college program opens your profile, you see the program and when." />
            <Feature icon={MessageSquare} title="They write to you here" body="Coaches message the wrestler and parents directly, and you reply in one place." />
          </div>
        </section>

        {/* Families */}
        <section id="families" className="border-y border-white/10 bg-[#0c1a2c] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Eyebrow>For families</Eyebrow>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">The Command Center.</h2>
                <p className="mt-3 text-white/65">Everything in the recruiting process, from freshman year to signing day, in one place.</p>
              </div>
              <a href={`${APP}/create-profile`} className={PRIMARY}>
                Find your profile <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FAMILY_FEATURES.map((f) => (
                <Feature key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* The product, as it looks: real screens of public pages, no wrestler's data on them. */}
        <section className="py-20" aria-label="Inside the Command Center">
          <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
            <div>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <Eyebrow>College map</Eyebrow>
                  <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Every college wrestling program on one map.</h3>
                  <p className="mt-2 text-white/65">D1, D2, D3, NAIA and junior college, men&apos;s and women&apos;s. Most wrestlers who keep competing do it outside D1.</p>
                </div>
                <a href={`${APP}/recruiting/college-map`} className={`inline-flex items-center gap-1 text-sm font-bold ${GOLD}`}>
                  Open the map <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <a href={`${APP}/recruiting/college-map`} className="mt-6 block overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/recruitwrestlers/college-map.jpg"
                  alt="Map of every college wrestling program in the United States, colored by division"
                  width={1600}
                  height={818}
                  loading="lazy"
                  className="h-auto w-full"
                />
              </a>
            </div>

            <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <Eyebrow>College pages</Eyebrow>
                <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Know what a college really costs.</h3>
                <p className="mt-2 text-white/65">The full yearly cost, what families at each income actually paid, admissions, roster size and team ranking. Not just tuition.</p>
                <ul className="mt-5 space-y-2 text-sm text-white/80">
                  {["Full cost of a year, in state and out", "What families paid, by income", "Test scores of admitted students", "Team ranking and roster size"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D3B574]" aria-hidden /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/recruitwrestlers/college-page.jpg"
                  alt="A college page: program snapshot, the full cost of a year and what families paid by income"
                  width={1200}
                  height={1119}
                  loading="lazy"
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Coaches */}
        <section id="coaches" className="border-y border-white/10 bg-[#0c1a2c] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Eyebrow>For college coaches</Eyebrow>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Recruit on results, not highlight tapes.</h2>
                <p className="mt-3 text-white/65">Free for college coaching staff. One account, every state we cover, your whole staff on one board.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`${APP}/auth/signup?type=college-coach`} className={PRIMARY}>
                  Create a free account <ArrowRight className="h-4 w-4" />
                </a>
                <a href={`${APP}/auth/login`} className={SECONDARY}>
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

        {/* Verified results */}
        <section className="border-y border-white/10 bg-[#0c1a2c] py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
              <div className="max-w-md">
                <Eyebrow>Built on verified results</Eyebrow>
                <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Real results, matched to real wrestlers.</h2>
                <p className="mt-3 text-white/65">Tournament results are imported from the events themselves, not typed in by families.</p>
              </div>
              <ul className="flex flex-1 flex-wrap gap-2">
                {EVENTS.map((e) => (
                  <li key={e} className="flex items-center gap-2 rounded-full border border-white/15 bg-[#0A1628] px-4 py-2 text-sm font-semibold text-white/85">
                    <Trophy className={`h-4 w-4 ${GOLD}`} aria-hidden /> {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* States */}
        <section id="states" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Eyebrow>State by state</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Your state. One national platform.</h2>
            <p className="mt-3 max-w-2xl text-white/65">Each state has its own rankings and results. Coaches see every state from one account.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((s) => (
                <a key={s.code} href={`${APP}/prospects/all`} className={`${PANEL} group block p-6 hover:border-[#D3B574]/60`}>
                  <div className="flex items-center justify-between">
                    <Wordmark second={s.code} className="text-3xl" />
                    <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-300">Live</span>
                  </div>
                  <p className="mt-3 text-sm text-white/60">{s.name}: rankings, results and every wrestler&apos;s profile.</p>
                  <span className={`mt-4 inline-flex items-center gap-1 text-sm font-bold ${GOLD}`}>
                    Open {stateBrand(s.code)} <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              ))}
              {coming.map((s) => (
                <div key={s.code} className={`${PANEL} p-6 opacity-80`}>
                  <div className="flex items-center justify-between">
                    <Wordmark second={s.code} className="text-3xl" />
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-white/60">Coming soon</span>
                  </div>
                  <p className="mt-3 text-sm text-white/60">{s.name}</p>
                </div>
              ))}
              <div className={`${PANEL} flex flex-col justify-center border-dashed p-6`}>
                <p className="text-lg font-black">More states next</p>
                <p className="mt-1 text-sm text-white/60">We open a state once its results are checked.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Learn */}
        <section className="border-t border-white/10 bg-[#0c1a2c] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <Eyebrow>Learn</Eyebrow>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Know how recruiting works.</h2>
              </div>
              <a href={`${APP}/recruiting/learn`} className={`hidden items-center gap-1 text-sm font-bold sm:inline-flex ${GOLD}`}>
                All guides <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { href: "/recruiting/learn/what-coaches-look-for", title: "What college coaches look for", body: "Where wrestlers who went on to college stood in high school, level by level." },
                { href: "/recruiting/learn/working-the-process", title: "Working the process", body: "Lists, questionnaires, emails and visits, in the order that works." },
                { href: "/recruiting/learn/tournaments", title: "Tournaments coaches want to see", body: "The events where college staff actually watch." },
              ].map((g) => (
                <a key={g.href} href={`${APP}${g.href}`} className={`${PANEL} group block p-5 hover:border-[#D3B574]/60`}>
                  <p className="text-base font-bold">{g.title}</p>
                  <p className="mt-1 text-sm text-white/60">{g.body}</p>
                  <span className={`mt-3 inline-flex items-center gap-1 text-sm font-bold ${GOLD}`}>
                    Read <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              Be seen by the coaches who <span className={GOLD}>are already looking.</span>
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={`${APP}/create-profile`} className={PRIMARY}>
                Find your profile <ArrowRight className="h-4 w-4" />
              </a>
              <a href={`${APP}/auth/signup?type=college-coach`} className={SECONDARY}>
                I&apos;m a college coach
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Wordmark second="Wrestlers" className="text-xl" />
            <p className="mt-1 text-sm text-white/45">College wrestling recruiting, built on verified results.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            <a href="#families" className="hover:text-white">Families</a>
            <a href="#coaches" className="hover:text-white">College coaches</a>
            <a href={`${APP}/recruiting/college-map`} className="hover:text-white">College map</a>
            <a href={`${APP}/recruiting/learn`} className="hover:text-white">Learn</a>
            <a href={`${APP}/privacy`} className="hover:text-white">Privacy</a>
          </nav>
        </div>
        <p className="pb-8 text-center text-xs text-white/35">© {new Date().getFullYear()} {NATIONAL_BRAND.name}</p>
      </footer>
    </div>
  )
}
