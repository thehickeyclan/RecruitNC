/**
 * Learn: the rules library's front page (app/recruiting/learn).
 *
 * What each level allows and when, read from the governing bodies' own documents and dated. The
 * list and the North Carolina page are open to everyone; the level pages are part of NC United
 * Blue, and each one says so itself.
 */
import type { Metadata } from "next"
import { ChevronRight, Lock } from "lucide-react"

import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import { CHECKED, LEARN_PAGES } from "@/lib/recruiting/learn/content"
import { BrandName } from "@/components/recruiting/brand-name"
import { shareMetadata } from "@/lib/share-metadata"

export const metadata = shareMetadata({
  title: "College Wrestling Recruiting Rules",
  description: "When coaches can contact you, the recruiting calendar, signing, scholarships and eligibility, with sources.",
  path: "/recruiting/learn",
  kicker: "RecruitNC · Learn",
  pageTitle: "College Wrestling Recruiting Rules | RecruitNC",
})

const checkedLabel = new Date(`${CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

export default function LearnIndexPage() {
  return (
    <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <a href="/my-recruiting#learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Recruiting Command Center
        </a>
        <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-[#D3B574]"><BrandName /> · Recruiting Portal</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">The rules, level by level</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Men&apos;s and women&apos;s wrestling, at every level, and nothing else. When a coach can contact a wrestler, when visits open, what signing means now, how scholarships work and what
          it takes to be eligible. Read from the NCAA, NAIA, NJCAA and NCHSAA&apos;s own 2026-27 documents, with the
          source under every section.
        </p>
        <p className="mt-2 text-xs text-white/40">Last checked {checkedLabel}.</p>

        <a
          href="/recruiting/learn/timeline"
          className="mt-6 flex items-start gap-3 rounded-xl border border-[#D3B574]/50 bg-[#D3B574]/10 p-4 hover:border-[#D3B574]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-white">Your timeline, grade by grade</span>
            <span className="mt-0.5 block text-sm leading-5 text-white/70">
              Start here. What to do this year, from eighth grade to signing, with these rules placed in the year they matter.
            </span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/50" aria-hidden />
        </a>

        <ul className="mt-3 space-y-3">
          {LEARN_PAGES.map((page) => (
            <li key={page.slug}>
              <a
                href={`/recruiting/learn/${page.slug}`}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-4 hover:border-[#D3B574]/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-base font-bold text-white">
                    {page.title}
                    {page.free ? (
                      <span className="rounded-full bg-emerald-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-200">Free</span>
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-[#D3B574]" aria-label="NC United Blue" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm leading-5 text-white/60">{page.summary}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-white/30" aria-hidden />
              </a>
            </li>
          ))}
        </ul>

        <LearnDisclaimer checkedLabel={checkedLabel} />
      </div>
    </main>
  )
}
