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
import { ArrowLeftRight, Bell, FileText, GraduationCap, MessageSquare, Search, Star, Target, Trophy } from "lucide-react"
import { recruitingCoverage } from "@/lib/recruiting/brand"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "For college coaches | RecruitWrestlers" },
  description: "Free for college coaching staff: every wrestler's results, scouting reports, contact details and a board for your recruits.",
}

const SIGNUP = "/auth/signup?type=college-coach"

const FEATURES = [
  { icon: Star, title: "My Recruits", body: "Star a wrestler from any profile, ranking or report and he lands on your board. Your whole staff shares it, with stages from first look to signed." },
  { icon: Search, title: "Every wrestler, searchable", body: "Filter by class, weight they last competed at and state. Results come from the brackets, never typed in." },
  { icon: FileText, title: "Scouting reports", body: "Every result, the wins that matter and the losses, with the opponent's credentials. Contact details and academics for verified coaches." },
  { icon: ArrowLeftRight, title: "Compare", body: "Two wrestlers side by side: head to head, common opponents and strength of schedule over the last twelve months." },
  { icon: Target, title: "Perfect Recruit", body: "Tell us what your program needs and every wrestler is checked against it." },
  { icon: MessageSquare, title: "Message families", body: "Write to a wrestler; parents are on every conversation. Tournament reports on your recruits land in your Reports folder." },
]

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
      "Your recruits starred, ready within 24 hours of the finals, and downloadable as a PDF",
    ],
  },
  { img: "compare", icon: ArrowLeftRight, kicker: "Compare", title: "Two wrestlers, side by side", points: ["Head to head over the last twelve months", "Common opponents and strength of schedule", "The edge marked, line by line"] },
  { img: "athletes", icon: Search, kicker: "Athletes", title: "Every wrestler in the current classes", points: ["Filter by class, last-competed weight, state and commitment", "Results from the brackets, never typed in", "Star anyone onto your board"] },
  { img: "messages", icon: MessageSquare, kicker: "Messages", title: "Write to the wrestler, with his parents on the thread", points: ["Parents see every message", "Division I contact dates shown before you write", "Every message counts as contact on your board"] },
  { img: "commitments", icon: GraduationCap, kicker: "Commitments", title: "Who committed where, as it happens", points: ["Every division, D1 to NAIA", "Reported by families, confirmed by us", "Your recruits flagged the day they commit"] },
] as const

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

export default async function ForCoaches() {
  const onRw = stagedBrandForHost((await headers()).get("host")) === "national"
  if (!onRw) notFound()
  return (
    <main className="min-h-screen bg-[#0B1426] text-white">
      <section className="border-b border-white/10 bg-gradient-to-br from-[#15243B] via-[#11203A] to-[#0B1426] px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#A3E635]">For college coaches · free</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Your recruiting board, built on verified results.</h1>
          <p className="mt-5 max-w-2xl text-lg text-[#A8B3C5]">
            Every {recruitingCoverage(true)} wrestler in the current classes, with their results, the wins that matter and a way to reach the family. Free for college coaching staff.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={SIGNUP} className="rounded-xl bg-[#A3E635] px-6 py-3.5 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">
              Get free coach access →
            </Link>
            <Link href="/auth/signin?returnTo=%2Fmy-recruits" className="rounded-xl border border-white/20 px-6 py-3.5 text-base font-bold text-white hover:border-[#A3E635] hover:text-[#A3E635]">
              Coach sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-[#A8B3C5]">Access is instant. We confirm every coach against their program&apos;s staff directory.</p>
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
          <Link href={SIGNUP} className="mt-4 inline-block rounded-xl bg-[#A3E635] px-6 py-3 text-base font-black text-[#0B1426] hover:bg-[#BEF264]">
            Get free coach access →
          </Link>
        </div>
      </section>
    </main>
  )
}
