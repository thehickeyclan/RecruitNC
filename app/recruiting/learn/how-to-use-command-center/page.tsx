/**
 * How to use the Command Center (Matt, 28 Oct 2026): the five steps and Scout, for parents.
 * Content: lib/recruiting/learn/how-to-use.ts. Open to everyone, like Working the process.
 */
import type { Metadata } from "next"
import { ArrowRight, Sparkles } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { scoutHref } from "@/lib/recruiting/journey"
import { HOW_TO_STEPS, SCOUT_TIPS } from "@/lib/recruiting/learn/how-to-use"
import { productName } from "@/lib/recruiting/product-name"

export const metadata: Metadata = {
  title: `How to use the Recruiting Command Center | ${productName()}`,
  description: "The five steps of the recruiting path - research, select, rules, reach out, monitor - and how to use Scout.",
}

export default function HowToUsePage() {
  return (
    <PortalShell active="learn">
      <div className="max-w-3xl">
        <a href="/my-recruiting/learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Learn
        </a>
        <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Guide</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">How to use the Command Center</h1>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Recruiting goes in five steps. Your home page shows all five, ticks the ones you have done, and outlines the one to do now. Start there, one step at a time.
        </p>

        <ol className="mt-6 space-y-4">
          {HOW_TO_STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-white/10 bg-[#0f1c2e] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D3B574] text-sm font-black text-[#0A1628]">{s.n}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">{s.title}</h2>
                  <p className="text-sm text-white/65">{s.what}</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-white/80 marker:text-[#D3B574]">
                    {s.how.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={s.where.href} className="inline-flex items-center gap-1 rounded-lg bg-[#D3B574] px-3 py-1.5 text-xs font-black text-[#0A1628] hover:bg-[#e2c98d]">
                      {s.where.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </a>
                    <a href={scoutHref(s.scout)} className="inline-flex items-center gap-1 rounded-lg border border-[#D3B574]/60 px-3 py-1.5 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden /> Ask Scout
                    </a>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/[0.07] p-5" aria-labelledby="scout">
          <h2 id="scout" className="flex items-center gap-2 text-lg font-black">
            <Sparkles className="h-5 w-5 text-[#D3B574]" aria-hidden /> Using Scout
          </h2>
          <ul className="mt-3 space-y-2">
            {SCOUT_TIPS.map((t) => (
              <li key={t} className="flex gap-2 text-sm leading-6 text-white/85">
                <span className="text-[#D3B574]">›</span> {t}
              </li>
            ))}
          </ul>
          <a href="/my-recruiting/scout" className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#D3B574] px-4 py-2 text-sm font-black text-[#0A1628]">
            Open Scout <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </section>
      </div>
    </PortalShell>
  )
}
