/**
 * "Get ready for your official visit" (Matt, 28 Oct 2026): the checklist, when visits open and
 * what they cover at each level, and the questions to ask. Every fact is read from the rules
 * library (lib/recruiting/learn/official-visits.ts); our advice is labelled as ours. Part of the
 * Command Center, like the rest of the library.
 */
import type { Metadata } from "next"
import { CheckCircle2, ClipboardCheck, ExternalLink, Lock, MessageCircleQuestion, Plane, Wrench } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import { familyAthleteIds } from "@/lib/coach-messages"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { CHECKED, D1_TRACK_LABEL, d1TrackFor, SOURCES, type D1Track, type SourceKey } from "@/lib/recruiting/learn/content"
import { BEFORE_YOU_GO, limitsByLevel, PARENTS_ON_VISIT, TIMING, VISIT_CHECKLIST, VISIT_QUESTIONS, WHAT_IT_IS, WHO_PAYS_ROWS } from "@/lib/recruiting/learn/official-visits"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { productName } from "@/lib/recruiting/product-name"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: `Get ready for your official visit | ${productName()}`,
  description: "The official-visit checklist, what each level's colleges pay for and when visits open, and the questions to ask the coach.",
}

const card = "rounded-xl border border-white/10 bg-[#0f1c2e] p-5"
const checkedLabel = new Date(`${CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

function Sources({ keys }: { keys: SourceKey[] }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {[...new Set(keys)].map((k) => (
        <a key={k} href={SOURCES[k].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/50 hover:text-white">
          {SOURCES[k].label} <ExternalLink className="h-2.5 w-2.5" aria-hidden />
        </a>
      ))}
    </span>
  )
}

export default async function OfficialVisitGuide() {
  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const open = Boolean(hasPortalAccess(viewer) || viewer.isVerifiedCoach)

  // Division I's dates depend on the wrestler: open on the family's own.
  let track: D1Track = "men-2028"
  let forName: string | null = null
  if (open && userId) {
    const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
    const { data } = ids.length ? await admin.from("athletes").select('"firstName", name, gender, graduationyear').in("id", ids) : { data: [] }
    const w = (data ?? []).filter((a) => a.graduationyear && Number(a.graduationyear) > mostRecentGraduatedClassYear()).sort((a, b) => Number(a.graduationyear) - Number(b.graduationyear))[0]
    if (w) {
      track = d1TrackFor(w.gender as string | null, Number(w.graduationyear))
      forName = String(w.firstName ?? "").trim() || String(w.name ?? "").split(" ")[0] || null
    }
  }
  const levels = limitsByLevel(track)

  return (
    <PortalShell active="learn">
      <div className="max-w-3xl">
        <a href="/my-recruiting/learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Learn
        </a>
        <p className="mt-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">
          <Plane className="h-4 w-4" aria-hidden /> Guide
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Get ready for your official visit</h1>
        <p className="mt-2 text-sm leading-6 text-white/70">{WHAT_IT_IS}</p>

        {!open ? (
          <div className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5">
            <p className="flex items-center gap-2 text-base font-bold">
              <Lock className="h-4 w-4 text-[#D3B574]" aria-hidden /> This guide is part of the Command Center
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75 marker:text-[#D3B574]">
              <li>The checklist before, during and after the visit</li>
              <li>When official visits open, and their limits, at every level</li>
              <li>Who pays for what</li>
              <li>The questions to ask the coach</li>
            </ul>
            <a href="/command-center" className="mt-4 inline-block rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628]">
              See the Command Center
            </a>
          </div>
        ) : (
          <>
            <section className={`${card} mt-6`} aria-labelledby="checklist">
              <h2 id="checklist" className="flex items-center gap-2 text-lg font-black">
                <ClipboardCheck className="h-5 w-5 text-[#D3B574]" aria-hidden /> The checklist
              </h2>
              <ol className="mt-3 space-y-2.5">
                {VISIT_CHECKLIST.map((c, i) => (
                  <li key={c.text} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{i + 1}</span>
                    <span className="min-w-0 text-sm leading-6 text-white/85">
                      {c.href ? (
                        <a href={c.href} className="hover:underline">
                          {c.text}
                        </a>
                      ) : (
                        c.text
                      )}
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${c.kind === "rule" ? "bg-sky-400/15 text-sky-200" : c.kind === "tool" ? "bg-[#D3B574]/15 text-[#D3B574]" : "bg-white/10 text-white/60"}`}>
                        {c.kind === "rule" ? "Rule" : c.kind === "tool" ? "Command Center" : "Our advice"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <details className={`${card} group mt-4`}>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-black [&::-webkit-details-marker]:hidden">
                <CheckCircle2 className="h-5 w-5 text-[#D3B574]" aria-hidden /> The rules behind steps 1 to 3
                <span className="ml-auto text-xs font-semibold text-white/45 group-open:hidden">Show</span>
              </summary>
              <ul className="mt-3 space-y-3">
                {BEFORE_YOU_GO.map((l) => (
                  <li key={l.text} className="text-sm leading-6 text-white/85">
                    <a href={l.href} className="hover:underline">
                      {l.text}
                    </a>
                    <Sources keys={l.sources} />
                  </li>
                ))}
              </ul>
            </details>

            <section className="mt-6" aria-labelledby="levels">
              <h2 id="levels" className="text-lg font-black">
                When visits open, and the limits
              </h2>
              <p className="text-xs text-white/50">Division I shown for {forName ? `${forName}: ` : ""}{D1_TRACK_LABEL[track]}.</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {levels.map((l) => (
                  <li key={l.level} className={card}>
                    <a href={l.href} className="text-sm font-black hover:underline">
                      {l.level}
                    </a>
                    <p className="mt-1 text-sm font-semibold text-white">{l.when}</p>
                    {l.limit ? <p className="mt-1 text-xs leading-5 text-white/65">{l.limit.charAt(0).toUpperCase() + l.limit.slice(1)}</p> : null}
                    <Sources keys={l.sources} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80">
                {TIMING.deadPeriod.text}
                <span className="mt-1 block text-xs text-white/50">Our advice: {TIMING.advice}</span>
              </p>
            </section>

            <details className={`${card} group mt-6`}>
              <summary className="flex cursor-pointer list-none items-center text-base font-black [&::-webkit-details-marker]:hidden">
                Who pays
                <span className="ml-auto text-xs font-semibold text-white/45 group-open:hidden">Show</span>
              </summary>
              <dl className="mt-3 divide-y divide-white/5">
                {WHO_PAYS_ROWS.rows.map((r) => (
                  <div key={r.label} className="py-2 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-3">
                    <dt className="text-xs font-bold text-white/60">{r.label}</dt>
                    <dd className="text-sm text-white/85">{r.value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/65 marker:text-[#D3B574]">
                {WHO_PAYS_ROWS.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <Sources keys={WHO_PAYS_ROWS.sources} />
            </details>

            <details className={`${card} group mt-4`}>
              <summary className="flex cursor-pointer list-none items-center text-base font-black [&::-webkit-details-marker]:hidden">
                Parents on the visit
                <span className="ml-auto text-xs font-semibold text-white/45 group-open:hidden">Show</span>
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80 marker:text-[#D3B574]">
                {PARENTS_ON_VISIT.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {PARENTS_ON_VISIT.advice ? <p className="mt-3 rounded-lg bg-white/[0.04] p-3 text-sm text-white/75">Our advice: {PARENTS_ON_VISIT.advice}</p> : null}
              <Sources keys={PARENTS_ON_VISIT.sources} />
            </details>

            <section className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/[0.07] p-5" aria-labelledby="questions">
              <h2 id="questions" className="flex items-center gap-2 text-lg font-black">
                <MessageCircleQuestion className="h-5 w-5 text-[#D3B574]" aria-hidden /> Questions to ask
              </h2>
              <p className="text-xs text-white/50">Our advice, not rules.</p>
              {VISIT_QUESTIONS.map((g) => (
                <div key={g.group} className="mt-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-white/50">{g.group}</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {g.questions.map((q) => (
                      <li key={q} className="flex gap-2 text-sm leading-6 text-white/85">
                        <span className="text-[#D3B574]">›</span> {q}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <a href="/my-recruiting/plan#visits" className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-4 hover:border-[#D3B574]/60">
              <Wrench className="h-6 w-6 shrink-0 text-[#D3B574]" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Put the visit in your Command Center</span>
                <span className="block text-xs text-white/55">Dates, who is going and notes. It counts down on your home page.</span>
              </span>
            </a>
          </>
        )}
        <LearnDisclaimer checkedLabel={checkedLabel} />
      </div>
    </PortalShell>
  )
}
