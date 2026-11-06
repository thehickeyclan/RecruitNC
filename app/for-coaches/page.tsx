/**
 * For college coaches (Matt, 26 Oct 2026): RecruitWrestlers' free coach product, My Recruits, and
 * how to get it. The sign-up itself is /auth/signup?type=college-coach (instant access, reviewed by
 * hand after: lib college-coaches-access-first). recruitwrestlers.com only.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import Image from "next/image"
import { ArrowLeftRight, ArrowRight, Bell, FileText, GraduationCap, MessageSquare, Search, Star, Target, Trophy } from "lucide-react"
import { liveStates, recruitingCoverage } from "@/lib/recruiting/brand"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "For college coaches | RecruitWrestlers" },
  description: "Free for college coaching staff: find high school wrestlers, evaluate them with scouting reports and comparisons, and reach the family.",
}

const SIGNUP = "/auth/signup?type=college-coach"

const FEATURES = [
  { icon: Star, title: "My Recruits", body: "Star a wrestler from any profile, ranking or report and he lands on your board. Your whole staff shares it, with stages from first look to signed." },
  { icon: Search, title: "Every wrestler, searchable", body: "Filter by class, weight they last competed at and state. Results come from the brackets, never typed in." },
  { icon: FileText, title: "Scouting reports", body: "Every result, the wins that matter and the losses, with the opponent's credentials and an AI-written summary. Contact details and academics for verified coaches." },
  { icon: ArrowLeftRight, title: "Compare", body: "Two wrestlers side by side: head to head, common opponents and strength of schedule over the last twelve months." },
  { icon: Target, title: "Perfect Recruit", body: "Tell us what your program needs and every wrestler is checked against it." },
  { icon: MessageSquare, title: "Message families", body: "Write to any wrestler, even with no cell number on file; parents are on every conversation. Tournament reports on your recruits land in your Reports folder." },
]

/**
 * How a coach recruits today, and what changes (Matt, 6 Nov 2026: "our coaches page is all
 * feature"). Each line is the job first, then the fix, so every screen below answers something.
 */
const BEFORE_AFTER = [
  { job: "Building your list", today: "Hours of searching and chasing before you know who even fits", now: "Wrestlers who fit what your program needs, and the ones interested in you, come to you. You verify and engage" },
  { job: "Finding wrestlers", today: "Digging through bracket sites one tournament at a time", now: "Every wrestler in the current classes, results already pulled from the brackets" },
  { job: "Evaluating", today: "A 42-8 record that says nothing about who he beat", now: "Every significant win and notable loss, with the opponent's résumé" },
  { job: "Prepping for a call", today: "Reading a season of brackets before you pick up the phone", now: "An AI summary of every recruit, written only from his verified results" },
  { job: "Reaching the family", today: "Hunting for a cell number through club coaches and old emails", now: "The family is already here. Message any wrestler, with his parents on the thread" },
  { job: "Tracking recruits", today: "A spreadsheet, a whiteboard and notes on three phones", now: "One board your whole staff shares, with every call and message on record" },
  { job: "Tournament weekends", today: "Refreshing brackets all weekend to see how your recruits did", now: "A recap on every recruit after each national tournament: every match, every opponent, with an AI summary" },
  { job: "Recruiting software", today: "An empty database your staff fills in by hand, name by name, result by result", now: "Starts full: every result and credential already in, so your staff adds judgment, not data" },
  { job: "Keeping up", today: "Finding out he committed somewhere else from social media", now: "An alert the day your recruit commits, places or goes quiet" },
] as const

/**
 * The product, shown (Matt, 28 Oct 2026: "we are a product platform.. why not show it?").
 * Screenshots of the real coach portal with invented wrestlers; refresh them with
 * node scripts/coach-screens/capture.cjs after a UI change.
 */
const SHOWCASE = [
  { img: "board", icon: Star, kicker: "My Recruits", title: "Your board and your funnel, shared with your staff", points: ["Stages from Prospect to Signed, applied dates, follow-ups", "Résumé, GPA and cell on every row", "\"Interested in you\" when a wrestler marks your program"] },
  { img: "alerts", icon: Bell, kicker: "Alerts", title: "Know the moment something changes", points: ["A red alert when a recruit commits elsewhere", "Placings, interest and quiet spells on your recruits", "New reports and ranking releases in the bell"] },
  {
    img: "report",
    icon: FileText,
    kicker: "Scouting reports",
    title: "Every significant win and notable loss, with the opponent's résumé",
    points: [
      "Significant win: a win over a wrestler who is nationally ranked, ranked in his state, a state champion or placer, or a national placer (NHSCA, Super 32, Fargo)",
      "Notable loss: a loss to a wrestler of that calibre, shown with what he has done",
      "An AI-written summary up top, built only from his verified results",
      "Strength of competition, star rating, academics and contact for verified coaches",
    ],
  },
  {
    img: "tournament",
    icon: Trophy,
    kicker: "Tournament reports",
    title: "After every national tournament, how your recruits did",
    points: [
      "Every match, every opponent's seed and credentials, starting with Super 32",
      "Placement, record, significant wins, notable losses and strength of competition",
      "An AI summary of each recruit's tournament: finish, record and best wins",
      "Your recruits starred, ready within 24 hours of the finals, and downloadable as a PDF",
    ],
  },
  { img: "compare", icon: ArrowLeftRight, kicker: "Compare", title: "Two wrestlers, side by side", points: ["Head to head over the last twelve months", "Common opponents and strength of schedule", "The edge marked, line by line"] },
  { img: "athletes", icon: Search, kicker: "Athletes", title: "Every wrestler in the current classes", points: ["Filter by class, last-competed weight, state and commitment", "Results from the brackets, never typed in", "Star anyone onto your board"] },
  { img: "messages", icon: MessageSquare, kicker: "Messages", title: "Write to the wrestler, with his parents on the thread", points: ["Write to any wrestler, even when there is no cell number on file", "Not on the platform yet: your message waits on his profile, and you are told when the family claims it", "Parents see every message", "Division I contact dates shown before you write"] },
  { img: "commitments", icon: GraduationCap, kicker: "Commitments", title: "Who committed where, as it happens", points: ["Every division, D1 to NAIA", "Reported by families, confirmed by us", "Your recruits flagged the day they commit"] },
] as const

/**
 * Today's recruiting board: the staff spreadsheet (Matt, 6 Nov 2026: "showing a spreadsheet with
 * complexity"), beside the record that is already here. Every wrestler on both sides is made up.
 */
const SHEET_COLS = ["Name", "Yr", "Wt", "School", "Record", "Last call", "Notes"]
const SHEET_ROWS = [
  ["Whitaker, Cole", "27", "157?", "Riverview", "38-4", "10/2", "dad's # via club"],
  ["J. Morales", "2027", "150/157", "", "??", "", "cell?? check Flo"],
  ["Pierce, Jordan", "28", "144", "Lakeview", "41-6", "9/14 LVM", "COMMITTED App St"],
  ["Holloway Evan", "27", "165", "Pine Ridge", "", "", "DUP - see row 41"],
  ["T. Banks", "", "175", "?", "29-11", "8/30", "committed?? verify"],
  ["Dawson, Kyle", "27", "138", "Oak Hill", "33-7", "7/22", "COMMITTED - JUCO"],
  ["Reyes, A.", "2028", "132", "Oak Hill", "35-9", "", "email bounced"],
  ["Cole Whitaker", "2027", "157", "Riverview HS", "", "", ""],
]
/** Rows the staff crossed out: wrestlers who committed somewhere else. */
const SHEET_STRUCK = new Set([2, 5])
const SHEET_FLAG: Record<string, string> = { "157?": "bg-amber-400/25", "??": "bg-red-400/25", "committed?? verify": "bg-red-400/25", "cell?? check Flo": "bg-amber-400/25", "DUP - see row 41": "bg-amber-400/25", "email bounced": "bg-red-400/25", "?": "bg-red-400/25" }

function EmptyVsFull() {
  return (
    <div className="mt-8 grid items-stretch gap-4 md:grid-cols-[1.4fr_auto_1fr]">
      <div className="min-w-0 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Today: the staff spreadsheet</p>
        <div className="mt-4 overflow-hidden rounded-md border border-white/15 bg-[#F4F6F8] text-[#1F2937]">
          <div className="flex items-center gap-2 border-b border-black/10 bg-[#E5E9EE] px-2 py-1 text-[10px] text-black/50">
            <span className="font-bold text-[#107C41]">▦</span> Recruits_2027_FINAL_v3 (Coach J edits).xlsx
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px] leading-tight">
              <thead>
                <tr>
                  {SHEET_COLS.map((c) => (
                    <th key={c} className="whitespace-nowrap border border-black/10 bg-[#E5E9EE] px-1.5 py-1 text-left font-bold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHEET_ROWS.map((r, i) => (
                  <tr key={i} className={SHEET_STRUCK.has(i) ? "text-black/40 line-through decoration-red-500/80" : ""}>
                    {r.map((v, j) => (
                      <td key={j} className={`whitespace-nowrap border border-black/10 px-1.5 py-1 ${SHEET_FLAG[v] ?? ""}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-1 border-t border-black/10 bg-[#E5E9EE] px-2 py-1 text-[10px] text-black/60">
            {["2027", "2027 OLD", "2028", "Visits", "Do not use", "+"].map((t, i) => (
              <span key={t} className={`rounded-sm px-1.5 ${i === 0 ? "bg-white font-bold" : ""}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-white/50">Typed in by hand, out of date by Monday, and different on every coach&apos;s laptop.</p>
      </div>
      <div className="hidden items-center md:flex">
        <ArrowRight className="h-6 w-6 text-[#A3E635]" aria-hidden />
      </div>
      <div className="rounded-2xl border border-[#A3E635]/50 bg-[#15243B] p-5 shadow-xl shadow-black/30">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A3E635]">RecruitWrestlers</p>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black">Cole Whitaker</p>
            <p className="text-xs text-[#A8B3C5]">Class of 2027 · 157 lbs · Riverview HS</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#A3E635] px-2.5 py-1 text-[11px] font-black text-[#0B1426]">Interested in you</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["State champion", "Super 32 All-American", "Fits your needs"].map((c) => (
            <span key={c} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-[#0B1426] p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3E635]">AI summary</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A8B3C5]">Won the state title at 157 and placed at Super 32, beating two nationally ranked wrestlers along the way.</p>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#A3E635] px-3 py-1.5 text-xs font-black text-[#0B1426]">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Message family
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold">
            <Star className="h-3.5 w-3.5" aria-hidden /> Add to My Recruits
          </span>
        </div>
        <p className="mt-4 text-sm font-semibold text-white">Already here. You verify and engage.</p>
      </div>
    </div>
  )
}

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#0B1426] shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#15243B] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-3 truncate rounded bg-white/5 px-2 py-0.5 text-[11px] text-white/40">recruitwrestlers.com</span>
      </div>
      <Image src={src} alt={alt} width={1440} height={1050} sizes="(max-width: 1024px) 100vw, 60vw" className="h-auto w-full" />
    </div>
  )
}

export default async function ForCoaches({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  if (!onRw) notFound()
  /*
   * ?state=GA from the coach emails (Matt, 5 Nov 2026: every link goes here, the account up top):
   * signing up lands the coach on that state's wrestlers. Only a live state; anything else is ignored.
   */
  const code = String((await searchParams).state ?? "").toUpperCase()
  const state = liveStates(true).find((s) => s.code === code) ?? null
  const signup = state ? `${SIGNUP}&returnTo=${encodeURIComponent(`/prospects/all?state=${state.code}`)}` : SIGNUP
  return (
    <main className="min-h-screen bg-[#0B1426] text-white">
      <section className="border-b border-white/10 bg-gradient-to-br from-[#15243B] via-[#11203A] to-[#0B1426] px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">For college coaches · free</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Find, evaluate and recruit high school wrestlers.</h1>
          <p className="mt-5 max-w-2xl text-lg text-[#A8B3C5]">
            Every wrestler in the current classes across {recruitingCoverage(true)}, on the same platform as their families, with their results, the wins that matter, AI-written scouting summaries and a way to reach the family. Free for college coaching staff.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signup} className="rounded-xl bg-[#A3E635] px-6 py-3.5 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">
              Create your free account →
            </Link>
            <Link href={`/auth/signin?returnTo=${encodeURIComponent(state ? `/prospects/all?state=${state.code}` : "/my-recruits")}`} className="rounded-xl border border-white/20 px-6 py-3.5 text-base font-bold text-white hover:border-[#A3E635] hover:text-[#A3E635]">
              Coach sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-[#A8B3C5]">
            Access is instant{state ? <>, and you go straight to {state.name}&apos;s wrestlers</> : null}. We confirm every coach against their program&apos;s staff directory.
          </p>
        </div>
      </section>
      <section className="border-b border-white/10 px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">Recruiting today</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">Most staffs recruit with a dozen tabs, a spreadsheet and a phone.</h2>
          {/* The legacy recruiting systems (Matt, 6 Nov 2026), never named. */}
          <p className="mt-4 max-w-3xl text-lg text-[#A8B3C5]">
            Recruiting software built before AI hands you an empty database to fill in. RecruitWrestlers starts full, on the same platform as your recruits and their families.
          </p>
          <EmptyVsFull />
          <div className="mt-8 hidden grid-cols-[180px_1fr_auto_1fr] gap-x-4 px-5 text-xs font-black uppercase tracking-[0.2em] sm:grid">
            <span />
            <span className="text-white/40">Today</span>
            <span />
            <span className="text-[#A3E635]">With RecruitWrestlers</span>
          </div>
          <ul className="mt-3 space-y-3">
            {BEFORE_AFTER.map(({ job, today, now }) => (
              <li key={job} className="grid gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-[#15243B] p-5 sm:grid-cols-[180px_1fr_auto_1fr] sm:items-center">
                <p className="font-black">{job}</p>
                <p className="text-sm text-white/50">{today}</p>
                <ArrowRight className="hidden h-4 w-4 text-[#A3E635] sm:block" aria-hidden />
                <p className="text-sm font-semibold text-white">{now}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl space-y-16 sm:space-y-24">
          <p className="text-center text-xs text-white/40">Example screens. Every wrestler shown is made up.</p>
          {SHOWCASE.map(({ img, icon: Icon, kicker, title, points }, i) => (
            <div key={img} className={`grid items-center gap-8 lg:gap-12 ${i % 2 ? "lg:grid-cols-[2fr_1fr]" : "lg:grid-cols-[1fr_2fr]"}`}>
              <div className={i % 2 ? "lg:order-2" : ""}>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#A3E635]">
                  <Icon className="h-4 w-4" aria-hidden />
                  {kicker}
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
                <ul className="mt-5 space-y-2.5">
                  {points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[#A8B3C5]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A3E635]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <BrowserFrame src={`/screens/coach-${img}.jpg`} alt={`${kicker}: ${title}`} />
            </div>
          ))}
        </div>
      </section>
      <section className="border-t border-white/10 px-4 py-14">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-[#15243B] p-5">
              <Icon className="h-6 w-6 text-[#A3E635]" aria-hidden />
              <p className="mt-3 text-lg font-black">{title}</p>
              <p className="mt-1.5 text-sm text-[#A8B3C5]">{body}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-5xl rounded-2xl border border-[#A3E635]/50 bg-[#A3E635]/[0.06] p-6 text-center">
          <p className="text-xl font-black">Free for every college coaching staff. No card, no trial.</p>
          <Link href={signup} className="mt-4 inline-block rounded-xl bg-[#A3E635] px-6 py-3 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">
            Create your free account →
          </Link>
        </div>
      </section>
    </main>
  )
}
