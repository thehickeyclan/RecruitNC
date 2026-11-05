import { Check } from "lucide-react"

import type { JourneyKey, JourneyStep } from "@/lib/recruiting/journey"

/** The side menu's words for the five steps. */
const SHORT: Record<JourneyKey, string> = { research: "Research", select: "Select", rules: "Rules", reach: "Reach out", monitor: "Monitor" }

/**
 * The five steps on one line, for a family's first day (Matt, 5 Nov 2026): they see the whole
 * path, with no second "Start here" and no buttons. The "Start here" card above it is the one
 * thing to do. Each step is a link to its own page; done steps tick.
 */
export function RecruitingPathStrip({ steps, firstName }: { steps: JourneyStep[]; firstName: string }) {
  return (
    <section aria-labelledby="cc-path" className="mt-6" data-tour="path">
      <h2 id="cc-path" className="text-sm font-black uppercase tracking-wider text-white/60">
        {firstName}&apos;s recruiting path
      </h2>
      <ol className="mt-2 grid grid-cols-5 gap-1.5 sm:gap-2">
        {steps.map((s) => {
          const done = s.status === "done"
          return (
            <li key={s.key}>
              <a
                href={s.cta.href}
                aria-label={`${s.title}${done ? ", done" : ""}`}
                className="flex h-full flex-col items-center gap-1 rounded-lg border border-white/10 bg-[#0f1c2e] px-1 py-2 text-center hover:border-[#D3B574]/60 sm:flex-row sm:gap-2 sm:px-3 sm:text-left"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${done ? "bg-emerald-500 text-[#0A1628]" : "bg-white/10 text-white/70"}`}
                  aria-label={done ? `Step ${s.n}, done` : `Step ${s.n}`}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.n}
                </span>
                <span className="text-[11px] font-bold leading-tight text-white/85 sm:text-sm">{SHORT[s.key]}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
