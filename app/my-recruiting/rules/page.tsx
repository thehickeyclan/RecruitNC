/**
 * Step 3 of the recruiting path: what's allowed right now, for this wrestler (28 Oct 2026).
 *
 * Every line is read from the rules library (lib/recruiting/learn/content.ts) and placed on the
 * calendar for the wrestler's class by the same code Scout uses, so nothing here is a rule of its
 * own. The full library, with sources, is one tap away.
 */
import Link from "next/link"
import { ArrowRight, BookOpenCheck, Check, Clock, Scale } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { scoutHref } from "@/lib/recruiting/journey"
import { seniorClassYear } from "@/lib/class-years"
import { d1TrackFor, D1_TRACK_LABEL, LEARN_PAGES, SOURCES } from "@/lib/recruiting/learn/content"
import { allDatedRules, GRADE_NAME, gradeForClass, timelineFor } from "@/lib/recruiting/learn/timeline"
import { resolveRuleDate } from "@/lib/recruiting/scout/dates"
import { allowedNow } from "@/lib/recruiting/allowed-now"
import { loadCommandCenter } from "../load"

export const dynamic = "force-dynamic"
export const metadata = { title: "Rules and timing | Recruiting Command Center" }

const card = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const LEVELS = [
  { level: "Division I", href: "/recruiting/learn/division-1" },
  { level: "Division II", href: "/recruiting/learn/division-2" },
  { level: "Division III", href: "/recruiting/learn/division-3" },
  { level: "Junior college", href: "/recruiting/learn/njcaa" },
]
const NAIA = LEARN_PAGES.find((p) => p.slug === "naia")!

export default async function RulesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = (await searchParams) ?? {}
  const cc = await loadCommandCenter("/my-recruiting/rules")
  const athlete = cc.athletes.find((a) => a.id === params.w) ?? cc.athletes[0] ?? null
  const now = new Date()
  const track = athlete ? d1TrackFor(athlete.gender, athlete.classYear) : null
  const allowed = athlete ? allowedNow({ gender: athlete.gender, classYear: athlete.classYear, now }) : null
  const grade = athlete ? gradeForClass(athlete.classYear, seniorClassYear(now)) : null
  const year = grade ? timelineFor(grade) : null
  const rules = track && athlete?.classYear ? allDatedRules(track) : []
  const dated = (when: string) => {
    if (/any time|^unlimited/i.test(when)) return { open: true, label: "Open now" }
    const d = athlete?.classYear ? resolveRuleDate(when, athlete.classYear, now) : null
    if (d) return { open: d.open, label: d.open ? "Open now" : d.label }
    // "After you have finished sophomore year": open once the wrestler is past that grade.
    const after = /finished (freshman|sophomore|junior) year/i.exec(when)?.[1]?.toLowerCase()
    if (after && grade) {
      const n = ({ freshman: 9, sophomore: 10, junior: 11 } as Record<string, number>)[after]
      return grade > n ? { open: true, label: "Open now" } : { open: false, label: `After ${after} year` }
    }
    return null
  }

  return (
    <PortalShell active="rules">
      <div className="max-w-4xl">
        <p className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Step 3</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Rules and timing</h1>
        <p className="mt-1 text-sm text-white/65">What college coaches may do right now{athlete ? ` for ${athlete.firstName}` : ""}, and when the rest opens.</p>

        {cc.athletes.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Wrestler">
            {cc.athletes.map((a) => (
              <Link key={a.id} href={`/my-recruiting/rules?w=${a.id}`} role="tab" aria-selected={a.id === athlete?.id} className={`rounded-lg border px-4 py-2 text-sm font-bold ${a.id === athlete?.id ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/70 hover:text-white"}`}>
                {a.firstName}
              </Link>
            ))}
          </div>
        ) : null}

        {!athlete || !allowed ? (
          <p className={`${card} mt-6 p-5 text-sm text-white/60`}>Add {athlete ? `${athlete.firstName}'s` : "the wrestler's"} graduation year to the profile and this page fills in for that class.</p>
        ) : (
          <>
            <section className={`${card} mt-6 border-[#D3B574]/50 p-5`} aria-labelledby="now">
              <h2 id="now" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">
                <Scale className="h-4 w-4" aria-hidden /> Right now · Class of {athlete.classYear}
                {grade ? ` · ${GRADE_NAME[grade]}` : ""}
              </h2>
              <p className="mt-2 text-lg font-black leading-7">{allowed.line}</p>
              {allowed.visitLine ? <p className="mt-1 text-sm text-white/70">{allowed.visitLine}</p> : null}
              <p className="mt-2 text-xs text-white/45">Division I dates shown for: {D1_TRACK_LABEL[track!]}.</p>
              <a href={scoutHref(`When can college coaches call ${athlete.firstName}?`)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline">
                Ask Scout about {athlete.firstName}&apos;s dates →
              </a>
            </section>

            <section className="mt-6" aria-labelledby="by-level">
              <h2 id="by-level" className="text-base font-black">
                By level
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {LEVELS.map(({ level, href }) => {
                  const rows = rules.filter((r) => r.level === level)
                  return (
                    <a key={level} href={href} className={`${card} block p-4 hover:border-[#D3B574]/60`}>
                      <p className="flex items-center justify-between text-sm font-black">
                        {level} <ArrowRight className="h-4 w-4 text-white/40" aria-hidden />
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {rows.map((r) => {
                          const d = dated(r.when)
                          return (
                            <li key={r.what} className="flex items-start gap-2 text-xs">
                              {d?.open ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden /> : <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden />}
                              <span className="min-w-0 flex-1 text-white/75">{r.what}</span>
                              <span className={`shrink-0 font-bold ${d?.open ? "text-emerald-300" : "text-white"}`}>{d?.label ?? "See the rule"}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </a>
                  )
                })}
                <a href="/recruiting/learn/naia" className={`${card} block p-4 hover:border-[#D3B574]/60`}>
                  <p className="flex items-center justify-between text-sm font-black">
                    NAIA <ArrowRight className="h-4 w-4 text-white/40" aria-hidden />
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-xs text-white/75">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden /> {NAIA.sections[0].bullets?.[0]}
                  </p>
                </a>
              </div>
            </section>

            {year ? (
              <section className={`${card} mt-6 p-5`} aria-labelledby="this-year">
                <h2 id="this-year" className="text-base font-black">
                  {GRADE_NAME[year.grade]}: what matters this year
                </h2>
                <p className="mt-1 text-sm text-white/65">{year.headline}</p>
                <ul className="mt-3 space-y-2">
                  {year.facts.map((f) => (
                    <li key={f.text} className="flex gap-2 text-sm leading-6 text-white/80">
                      <span className="text-[#D3B574]">›</span>
                      <span>
                        {f.text} <span className="text-xs text-white/35">({f.sources.map((k) => SOURCES[k].label).join("; ")})</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <a href="/recruiting/learn/timeline" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline">
                  The year-by-year timeline →
                </a>
              </section>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Rules by level", href: "/recruiting/learn" },
                { label: "The Eligibility Center", href: "/recruiting/learn/eligibility-center" },
                { label: "Get ready for an official visit", href: "/recruiting/learn/official-visits" },
              ].map((l) => (
                <a key={l.href} href={l.href} className={`${card} flex items-center gap-2 p-3 text-sm font-bold hover:border-[#D3B574]/60`}>
                  <BookOpenCheck className="h-4 w-4 text-[#D3B574]" aria-hidden /> {l.label}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </PortalShell>
  )
}
