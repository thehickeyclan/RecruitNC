/**
 * Working the process: the practical steps of recruiting, as our advice (lib/recruiting/learn/working.ts).
 * Open to everyone, like the tournaments page: it is how families find the portal.
 */
import type { Metadata } from "next"
import { MessageCircleQuestion } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { COACH_QUESTIONS, WORKING_STEPS } from "@/lib/recruiting/learn/working"

export const metadata: Metadata = {
  title: "Working the recruiting process, step by step | RecruitNC",
  description: "The practical side of college wrestling recruiting: questionnaires, writing to coaches, following up, camps, social media and coach calls.",
}

export default function WorkingTheProcessPage() {
  return (
    <PortalShell active="learn">
      <div className="max-w-3xl">
        <a href="/my-recruiting/learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Learn
        </a>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Working the process</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          The practical side of recruiting, step by step. This is our advice from what works for wrestling families, not a rule. The rules, with their
          sources, are in the rest of Learn.
        </p>

        <ol className="mt-6 space-y-4">
          {WORKING_STEPS.map((step, i) => (
            <li key={step.heading} className="rounded-xl border border-white/10 bg-[#0f1c2e] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D3B574] text-sm font-black text-[#0A1628]">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">{step.heading}</h2>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-white/80 marker:text-[#D3B574]">
                    {step.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  {step.tool ? (
                    <a href={step.tool.href} className="mt-3 inline-block rounded-lg border border-[#D3B574]/60 px-3 py-1.5 text-xs font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
                      {step.tool.label} →
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-8 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/[0.07] p-5">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <MessageCircleQuestion className="h-5 w-5 text-[#D3B574]" aria-hidden /> Questions to ask a college coach
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-white/85">
            {COACH_QUESTIONS.map((q) => (
              <li key={q} className="flex gap-2">
                <span className="text-[#D3B574]">›</span> {q}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PortalShell>
  )
}
