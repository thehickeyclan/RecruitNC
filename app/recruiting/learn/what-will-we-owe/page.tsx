/**
 * "What will we actually owe?" (Matt, 30 Oct 2026): the money guide for a parent who has never done
 * this. The two prices, the four places money comes from, the Net Price Calculator, and what to
 * ask each coach in writing; then the calculator on My List does the sum. Every fact is read from
 * the Learn library (lib/recruiting/learn/what-we-owe.ts); our advice is labelled as ours. Part of
 * the Command Center, like the rest of the library. Income is never asked.
 */
import type { Metadata } from "next"
import { ArrowRight, Calculator, ExternalLink, Lock, MessageCircleQuestion, Wallet } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import { CHECKED, SOURCES, type SourceKey } from "@/lib/recruiting/learn/content"
import { ASK_IN_WRITING, ASK_THE_COACH, BOTTOM_LINE, BY_LEVEL, CALCULATOR, FOUR_SOURCES, LOANS, TWO_PRICES } from "@/lib/recruiting/learn/what-we-owe"
import { OFFER_CALCULATOR } from "@/lib/recruiting/offers"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { productName } from "@/lib/recruiting/product-name"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: `What will we actually owe? | ${productName()}`,
  description: "The two prices, where the money comes from, how to get your own estimate, and what to ask each coach in writing.",
}

const card = "rounded-xl border border-white/10 bg-[#0f1c2e] p-5"
const checkedLabel = new Date(`${CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

function Sources({ keys }: { keys: SourceKey[] }) {
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {[...new Set(keys)].map((k) => (
        <a key={k} href={SOURCES[k].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/50 hover:text-white">
          {SOURCES[k].label} <ExternalLink className="h-2.5 w-2.5" aria-hidden />
        </a>
      ))}
    </span>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8" aria-labelledby={`owe-${n}`}>
      <h2 id={`owe-${n}`} className="flex items-center gap-2.5 text-lg font-black">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D3B574] text-sm font-black text-[#0A1628]">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default async function WhatWillWeOwe() {
  const admin = createAdminClient()
  const { viewer } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const open = Boolean(hasPortalAccess(viewer) || viewer.isVerifiedCoach)

  return (
    <PortalShell active="learn">
      <div className="max-w-3xl">
        <a href="/my-recruiting/learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Learn
        </a>
        <p className="mt-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">
          <Wallet className="h-4 w-4" aria-hidden /> Guide
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">What will we actually owe?</h1>
        <p className="mt-2 text-sm leading-6 text-white/70">Four things to know, then one number per college. We never ask about your income.</p>

        {!open ? (
          <div className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5">
            <p className="flex items-center gap-2 text-base font-bold">
              <Lock className="h-4 w-4 text-[#D3B574]" aria-hidden /> This guide is part of the Command Center
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75 marker:text-[#D3B574]">
              <li>The two prices every college has</li>
              <li>The four places college money comes from</li>
              <li>How to get your own estimate before any offer</li>
              <li>What to ask each coach, in writing</li>
              <li>A calculator that turns each offer into what you&apos;ll owe</li>
            </ul>
            <a href="/command-center" className="mt-4 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628]">
              See the Command Center
            </a>
          </div>
        ) : (
          <>
            <Step n={1} title="Every college has two prices">
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {TWO_PRICES.map((c) => (
                  <div key={c.title} className={card}>
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#D3B574]">{c.tag}</p>
                    <p className="mt-1 text-base font-black">{c.title}</p>
                    {c.lines.map((l) => (
                      <p key={l} className="mt-1.5 text-sm leading-6 text-white/75">
                        {l}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </Step>

            <Step n={2} title="Money comes from four places">
              <ol className="mt-3 grid gap-3 sm:grid-cols-2">
                {FOUR_SOURCES.map((c, i) => (
                  <li key={c.title} className={card}>
                    <p className="flex items-center justify-between gap-2">
                      <span className="text-base font-black">{c.title}</span>
                      <span className="text-[11px] font-bold text-white/40">{i + 1} of 4</span>
                    </p>
                    <p className="text-xs font-bold text-[#D3B574]">{c.tag}</p>
                    <p className="mt-2 text-sm leading-6 text-white/80">{c.lines[0]}</p>
                    {c.lines.length > 1 ? (
                      <details className="group mt-1">
                        <summary className="cursor-pointer list-none text-xs font-semibold text-white/50 hover:text-white [&::-webkit-details-marker]:hidden">
                          <span className="group-open:hidden">More</span>
                          <span className="hidden group-open:inline">Less</span>
                        </summary>
                        {c.lines.slice(1).map((l) => (
                          <p key={l} className="mt-1.5 text-sm leading-6 text-white/70">
                            {l}
                          </p>
                        ))}
                        <Sources keys={c.sources} />
                      </details>
                    ) : null}
                  </li>
                ))}
              </ol>
              <details className={`${card} group mt-3`}>
                <summary className="flex cursor-pointer list-none items-center text-sm font-black [&::-webkit-details-marker]:hidden">
                  Athletic money at each level
                  <span className="ml-auto text-xs font-semibold text-white/45 group-open:hidden">Show</span>
                </summary>
                <dl className="mt-3 divide-y divide-white/5">
                  {BY_LEVEL.rows.map((r) => (
                    <div key={r.label} className="py-2 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-3">
                      <dt className="text-xs font-bold text-white/60">{r.label}</dt>
                      <dd className="text-sm text-white/85">{r.value}</dd>
                    </div>
                  ))}
                </dl>
                <Sources keys={BY_LEVEL.sources} />
              </details>
            </Step>

            <Step n={3} title="Get your own estimate, before any offer">
              <div className={`${card} mt-3`}>
                <p className="text-base font-black">The Net Price Calculator</p>
                <p className="mt-1.5 text-sm leading-6 text-white/80">{CALCULATOR.what}</p>
                <p className="mt-3 rounded-lg bg-white/[0.04] p-3 text-sm leading-6 text-white/75">Our advice: {CALCULATOR.advice}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={OFFER_CALCULATOR} className="inline-flex items-center gap-1.5 rounded-lg bg-[#D3B574] px-3 py-2 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d]">
                    Each college&apos;s calculator, on My List <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                  <a href={SOURCES.netPrice.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 hover:border-[#D3B574]/50">
                    The government&apos;s search <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </div>
            </Step>

            <Step n={4} title="Ask each coach three things, in writing">
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {ASK_THE_COACH.map((q) => (
                  <li key={q.ask} className="rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-4">
                    <MessageCircleQuestion className="h-5 w-5 text-[#D3B574]" aria-hidden />
                    <p className="mt-2 text-xl font-black">{q.ask}</p>
                    <details className="group mt-1">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-white/55 hover:text-white [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">Why</span>
                        <span className="hidden group-open:inline">Hide</span>
                      </summary>
                      <p className="mt-1.5 text-sm leading-6 text-white/80">{q.why}</p>
                      <a href={q.href} className="mt-1 inline-block text-xs font-semibold text-[#D3B574] hover:underline">
                        The rule
                      </a>
                    </details>
                  </li>
                ))}
              </ul>
              <ul className="mt-3 space-y-1.5">
                {ASK_IN_WRITING.map((l) => (
                  <li key={l} className="flex gap-2 text-sm leading-6 text-white/75">
                    <span className="text-[#D3B574]">›</span> Our advice: {l}
                  </li>
                ))}
              </ul>
            </Step>

            <section className="mt-8 rounded-xl border border-[#D3B574]/60 bg-[#D3B574]/5 p-5" aria-labelledby="owe-sum">
              <h2 id="owe-sum" className="flex items-center gap-2 text-lg font-black">
                <Calculator className="h-5 w-5 text-[#D3B574]" aria-hidden /> Then: one number per college
              </h2>
              <p className="text-xs text-white/50">{BOTTOM_LINE.intro}</p>
              <ol className="mt-3 space-y-2">
                {BOTTOM_LINE.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm leading-6 text-white/85">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm font-semibold text-amber-100">{LOANS} A loan never lowers what you owe.</p>
              <a href={OFFER_CALCULATOR} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#D3B574] px-4 py-2.5 text-sm font-black text-[#0A1628] hover:bg-[#e2c98d]">
                Do the sum for each offer <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <Sources keys={BOTTOM_LINE.sources} />
            </section>
          </>
        )}
        <LearnDisclaimer checkedLabel={checkedLabel} />
      </div>
    </PortalShell>
  )
}
