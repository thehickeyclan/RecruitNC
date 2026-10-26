/**
 * For college coaches (Matt, 26 Oct 2026): RecruitWrestlers' free coach product, My Recruits, and
 * how to get it. The sign-up itself is /auth/signup?type=college-coach (instant access, reviewed by
 * hand after: lib college-coaches-access-first). recruitwrestlers.com only.
 */
import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { ArrowLeftRight, FileText, MessageSquare, Search, Star, Target } from "lucide-react"
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
      <section className="px-4 py-14">
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
