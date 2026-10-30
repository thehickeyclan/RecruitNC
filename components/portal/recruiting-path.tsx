"use client"

import { useState } from "react"
import { ArrowRight, Check, ChevronRight, Info, Sparkles } from "lucide-react"

import { scoutHref, type JourneyStep } from "@/lib/recruiting/journey"

/**
 * "Your recruiting path" (Matt, 28 Oct 2026): the five steps as cards. Each shows a number and a
 * short label, one button and one Scout question; the explanation is behind the ⓘ. The step to do
 * now is outlined and says "Start here".
 */
export function RecruitingPath({ steps, firstName }: { steps: JourneyStep[]; firstName: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const done = steps.filter((s) => s.status === "done").length
  return (
    <section aria-labelledby="cc-path" className="mt-6" data-tour="path">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="cc-path" className="text-lg font-black text-white sm:text-xl">
          {firstName}&apos;s recruiting path
        </h2>
        <span className="text-xs font-bold text-white/50">
          {done} of {steps.length} steps done
        </span>
      </div>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => {
          const now = s.status === "now"
          const isDone = s.status === "done"
          return (
            <li
              key={s.key}
              className={`relative flex flex-col rounded-xl border p-4 ${now ? "border-[#D3B574] bg-[#D3B574]/[0.08] ring-1 ring-[#D3B574]/50" : "border-white/10 bg-[#0f1c2e]"}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${isDone ? "bg-emerald-500 text-[#0A1628]" : now ? "bg-[#D3B574] text-[#0A1628]" : "bg-white/10 text-white/60"}`}
                  aria-label={isDone ? `Step ${s.n}, done` : `Step ${s.n}`}
                >
                  {isDone ? <Check className="h-4 w-4" aria-hidden /> : s.n}
                </span>
                {now ? <span className="whitespace-nowrap rounded-full bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#0A1628]">Start here</span> : null}
                <button
                  type="button"
                  onClick={() => setOpen((k) => (k === s.key ? null : s.key))}
                  aria-expanded={open === s.key}
                  aria-label={`About ${s.title}`}
                  className="ml-auto mr-6 rounded-full p-1 text-white/40 hover:text-white sm:mr-0"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className={`mt-2 text-sm font-black ${isDone ? "text-white/70" : "text-white"}`}>{s.title}</p>
              <p className={`mt-0.5 text-sm leading-5 ${s.key === "rules" ? "text-white/70" : "font-semibold text-white"}`}>{s.label}</p>
              {/* On a phone only the step to do now is open; the others are one tap to their page. */}
              {!now ? (
                <a href={s.cta.href} aria-label={s.cta.label} className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 sm:hidden">
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </a>
              ) : null}
              {s.progress ? (
                <div className={`mt-2 h-1.5 overflow-hidden rounded-full bg-white/10 ${now ? "" : "hidden sm:block"}`} aria-hidden>
                  <div className={`h-full rounded-full ${isDone ? "bg-emerald-400" : "bg-[#D3B574]"}`} style={{ width: `${Math.round((s.progress.value / s.progress.of) * 100)}%` }} />
                </div>
              ) : null}
              {open === s.key ? <p className="mt-2 text-xs leading-5 text-white/60">{s.detail}</p> : null}
              <div className={`mt-auto pt-3 ${now ? "" : "hidden sm:block"}`}>
                <a
                  href={s.cta.href}
                  className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-black ${now ? "bg-[#D3B574] text-[#0A1628] hover:bg-[#e2c98d]" : "border border-white/20 text-white hover:border-[#D3B574]"}`}
                >
                  {s.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <a href={scoutHref(s.scout.question)} className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-[#D3B574] hover:underline">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Ask Scout: {s.scout.label}
                </a>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
