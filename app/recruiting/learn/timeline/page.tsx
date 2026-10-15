/**
 * The grade-by-grade timeline: what to do this year, from eighth grade to signing.
 *
 * It opens on the family's own wrestler - his grade unfolded, and the Division I dates for his
 * class (boys) or hers (girls). The dates themselves come from the verified rules library; this
 * page only places them in a year (lib/recruiting/learn/timeline.ts).
 *
 * Part of NC United Blue, like the level pages. Locked, it still shows what each year is for.
 */
import type { Metadata } from "next"
import { PortalShell } from "@/components/portal/portal-shell"
import { ChevronDown, Lock } from "lucide-react"

import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { CHECKED, D1_TRACK_LABEL, SOURCES, d1TrackFor, type D1Track } from "@/lib/recruiting/learn/content"
import { GRADE_NAME, TIMELINE, alwaysOpen, gradeForClass, openingsFor, type Grade } from "@/lib/recruiting/learn/timeline"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Wrestling recruiting timeline, grade by grade | RecruitNC",
  description: "What a wrestling family should be doing each year from eighth grade to signing, with the dates college coaches may first call, meet and host a wrestler.",
}

const TRACKS: D1Track[] = ["men-2028", "men-2027", "women"]
const checkedLabel = new Date(`${CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

type Wrestler = { firstName: string; grade: Grade; track: D1Track }

export default async function TimelinePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {}
  const admin = createAdminClient()
  const { viewer, userId } = await resolvePortalViewer({ supabase: await createClient(), admin })
  const open = Boolean(viewer.isBlueMember || viewer.isAdmin || viewer.isVerifiedCoach)

  // The family's wrestlers still in school, oldest first: the nearest deadline leads.
  const wrestlers: Wrestler[] = []
  if (userId) {
    const ids = await familyAthleteIds(admin, userId).catch(() => [])
    if (ids.length > 0) {
      const { data: rows } = await admin.from("athletes").select('"firstName", name, gender, graduationyear').in("id", ids)
      const graduated = mostRecentGraduatedClassYear()
      for (const a of (rows ?? []).sort((x, y) => Number(x.graduationyear ?? 9999) - Number(y.graduationyear ?? 9999))) {
        const classYear = a.graduationyear ? Number(a.graduationyear) : null
        if (classYear && classYear <= graduated) continue
        const grade = gradeForClass(classYear, seniorClassYear())
        if (!grade) continue
        wrestlers.push({
          firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0] || "Your wrestler",
          grade,
          track: d1TrackFor(a.gender as string | null, classYear),
        })
      }
    }
  }

  const asked = TRACKS.find((t) => t === params.for)
  const track: D1Track = asked ?? wrestlers[0]?.track ?? "men-2028"
  const here = new Map<Grade, string[]>()
  for (const w of wrestlers) here.set(w.grade, [...(here.get(w.grade) ?? []), w.firstName])
  const anyAge = alwaysOpen(track)

  return (
    <PortalShell active="plan">
      <div className="mx-auto max-w-3xl">
        <a href="/my-recruiting#learn" className="text-xs font-semibold text-white/55 hover:text-white">
          ← Recruiting Command Center
        </a>
        <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">RecruitNC · Recruiting Portal</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Your timeline, grade by grade</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          What to do each year from eighth grade to signing, and the dates a college coach may first call, meet and
          host a wrestler. Men&apos;s and women&apos;s wrestling only.
        </p>
        <p className="mt-2 text-xs text-white/40">
          Dates are read from the rules library, last checked {checkedLabel}.{" "}
          <a href="/recruiting/learn" className="underline hover:text-white/70">
            The rules, level by level
          </a>
        </p>

        {wrestlers.length > 0 ? (
          <p className="mt-5 flex flex-wrap gap-2">
            {wrestlers.map((w) => (
              <a
                key={`${w.firstName}-${w.grade}`}
                href={`#grade-${w.grade}`}
                className="rounded-full border border-[#D3B574]/50 bg-[#D3B574]/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-[#D3B574]/20"
              >
                {w.firstName}: {GRADE_NAME[w.grade].toLowerCase()} ↓
              </a>
            ))}
          </p>
        ) : null}

        <div className="mt-5">
          <p className="text-xs text-white/55">Division I dates depend on the wrestler. Showing:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TRACKS.map((t) => (
              <a
                key={t}
                href={`/recruiting/learn/timeline?for=${t}`}
                aria-current={t === track ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  t === track ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/70 hover:text-white"
                }`}
              >
                {D1_TRACK_LABEL[t]}
                {wrestlers.some((w) => w.track === t) ? (
                  <span className="font-normal text-[#D3B574]"> · {wrestlers.filter((w) => w.track === t).map((w) => w.firstName).join(", ")}</span>
                ) : null}
              </a>
            ))}
          </div>
        </div>

        {open && anyAge.length > 0 ? (
          <section className="mt-6 rounded-xl border border-white/10 bg-[#0f1c2e] p-5">
            <h2 className="text-base font-black tracking-tight">Open at any age</h2>
            <p className="mt-1 text-sm leading-6 text-white/65">
              No date to wait for. NAIA and junior college coaches may also call and write at any age.
            </p>
            <ul className="mt-2 divide-y divide-white/10">
              {anyAge.map((o) => (
                <li key={`${o.level}-${o.what}`} className="grid gap-0.5 py-2 text-sm sm:grid-cols-[8.5rem_1fr]">
                  <a href={o.href} className="font-bold text-[#D3B574] hover:underline">
                    {o.level}
                  </a>
                  <span className="text-white/80">{o.what}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-6 space-y-4">
          {TIMELINE.map((year) => {
            const names = here.get(year.grade) ?? []
            const openings = openingsFor(year.grade, track)
            return (
              <details
                key={year.grade}
                id={`grade-${year.grade}`}
                open={names.length > 0 || wrestlers.length === 0}
                className={`group scroll-mt-24 rounded-xl border bg-[#0f1c2e] ${names.length > 0 ? "border-[#D3B574]/60" : "border-white/10"}`}
              >
                <summary className="flex cursor-pointer list-none items-start gap-3 p-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-black tracking-tight">{GRADE_NAME[year.grade]}</span>
                      {names.length > 0 ? (
                        <span className="rounded-full bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A1628]">
                          {names.join(" and ")} {names.length > 1 ? "are" : "is"} here
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-white/70">{year.headline}</span>
                  </span>
                  <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-white/40 transition-transform group-open:rotate-180" aria-hidden />
                </summary>

                {open ? (
                  <div className="space-y-5 border-t border-white/10 p-5">
                    <section>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">What to do</h3>
                      <ol className="mt-2 space-y-2.5">
                        {year.steps.map((step, i) => (
                          <li key={step.text} className="flex gap-3 text-sm leading-6 text-white/85">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-black text-white/70">
                              {i + 1}
                            </span>
                            <span>
                              {step.text}
                              {step.href ? (
                                <>
                                  {" "}
                                  <a href={step.href} className="whitespace-nowrap font-bold text-[#D3B574] hover:underline">
                                    {step.cta} →
                                  </a>
                                </>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-2 text-xs text-white/40">Our plan, not a rule.</p>
                    </section>

                    <section>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">What opens this year</h3>
                      {openings.length > 0 ? (
                        <ul className="mt-2 divide-y divide-white/10">
                          {openings.map((o) => (
                            <li key={`${o.level}-${o.what}`} className="grid gap-0.5 py-2 text-sm sm:grid-cols-[8.5rem_1fr]">
                              <a href={o.href} className="font-bold text-white hover:underline">
                                {o.level}
                              </a>
                              <span>
                                <span className="text-white/65">{o.what}: </span>
                                <span className="font-bold text-white">{o.when}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-white/65">
                          No new contact or visit date falls in this year for {D1_TRACK_LABEL[track].toLowerCase()}.
                        </p>
                      )}
                    </section>

                    <section>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#D3B574]">Rules that matter this year</h3>
                      <ul className="mt-2 space-y-3">
                        {year.facts.map((fact) => (
                          <li key={fact.text} className="text-sm leading-6 text-white/85">
                            {fact.text}
                            {fact.href ? (
                              <>
                                {" "}
                                <a href={fact.href} className="whitespace-nowrap font-bold text-[#D3B574] hover:underline">
                                  The rule →
                                </a>
                              </>
                            ) : null}
                            <span className="mt-0.5 block text-xs leading-5 text-white/40">
                              Source:{" "}
                              {fact.sources.map((key, i) => (
                                <span key={key}>
                                  {i > 0 ? "; " : ""}
                                  <a href={SOURCES[key].url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">
                                    {SOURCES[key].label}
                                  </a>
                                </span>
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                ) : null}
              </details>
            )
          })}
        </div>

        {!open ? (
          <div className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/10 p-5 sm:p-6">
            <p className="flex items-center gap-2 text-base font-bold">
              <Lock className="h-4 w-4 text-[#D3B574]" aria-hidden /> The full timeline is part of NC United Blue
            </p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              For each year: what to do, the dates each level of college coach may first call, meet and host your
              wrestler, and the rules that matter, with the source under each.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/blue" className="rounded-lg bg-[#D3B574] px-5 py-2.5 text-sm font-bold text-[#0A1628] hover:bg-[#e2c98d]">
                Learn about Blue
              </a>
              <a
                href="/recruiting/learn/staying-eligible-in-north-carolina"
                className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/5"
              >
                Read the free North Carolina page
              </a>
            </div>
          </div>
        ) : null}

        <LearnDisclaimer checkedLabel={checkedLabel} />
      </div>
    </PortalShell>
  )
}
