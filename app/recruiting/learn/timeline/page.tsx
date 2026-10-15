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
import { ArrowRight, BarChart3, FileText, Lock, ShieldAlert } from "lucide-react"

import { RoadmapBoard } from "@/components/portal/roadmap-board"
import { ROADMAP, cleanDone } from "@/lib/recruiting/learn/roadmap"

import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { CHECKED, D1_TRACK_LABEL, SOURCES, d1TrackFor, type D1Track } from "@/lib/recruiting/learn/content"
import { GRADE_NAME, alwaysOpen, gradeForClass, openingsFor, timelineFor, type Grade } from "@/lib/recruiting/learn/timeline"
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

type Wrestler = { firstName: string; lastName: string; classYear: number | null; team: string | null; grade: Grade; track: D1Track }

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
      const { data: rows } = await admin.from("athletes").select('"firstName", "lastName", name, gender, graduationyear').in("id", ids)
      const graduated = mostRecentGraduatedClassYear()
      for (const a of (rows ?? []).sort((x, y) => Number(x.graduationyear ?? 9999) - Number(y.graduationyear ?? 9999))) {
        const classYear = a.graduationyear ? Number(a.graduationyear) : null
        if (classYear && classYear <= graduated) continue
        const grade = gradeForClass(classYear, seniorClassYear())
        if (!grade) continue
        wrestlers.push({
          firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0] || "Your wrestler",
          lastName: String(a.lastName ?? "").trim(),
          classYear,
          team: a.gender ? (/^f/i.test(String(a.gender)) ? "Women's wrestling" : "Men's wrestling") : null,
          grade,
          track: d1TrackFor(a.gender as string | null, classYear),
        })
      }
    }
  }

  const asked = TRACKS.find((t) => t === params.for)
  const track: D1Track = asked ?? wrestlers[0]?.track ?? "men-2028"
  const anyAge = alwaysOpen(track)
  const me = wrestlers[0] ?? null
  const askedGrade = [8, 9, 10, 11, 12].find((g) => String(g) === params.grade) as Grade | undefined
  const selected: Grade = askedGrade ?? me?.grade ?? 9
  const year = timelineFor(selected)
  const openings = openingsFor(selected, track)
  // Ticks belong to the signed-in account; a developer's family preview only reads them.
  const { data: auth } = await (await createClient()).auth.getUser()
  const readOnly = !auth.user || auth.user.id !== userId
  const { data: account } = userId ? await admin.auth.admin.getUserById(userId) : { data: null }
  const done = cleanDone(account?.user?.user_metadata?.roadmap_done)
  const gold = "#D3B574"
  const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"
  const tabs = [
    { label: "Grade by grade", href: "/recruiting/learn/timeline" },
    { label: "The rules", href: "/recruiting/learn/division-1" },
    { label: "Exposure events", href: "/recruiting/learn/tournaments" },
    { label: "College fit", href: "/recruiting/compare" },
    { label: "Tools & templates", href: "/recruiting/learn/working-the-process" },
    { label: "FAQs", href: "/recruiting/learn/questions-families-ask" },
  ]

  return (
    <PortalShell active="learn">
      <div className="mx-auto max-w-7xl text-white">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/focused-wrestler.png" alt="" aria-hidden className="absolute inset-y-0 right-0 h-full w-2/3 object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D3A] via-[#0B1D3A]/90 to-[#0B1D3A]/20" aria-hidden />
          <div className="relative p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: gold }}>
              <a href="/my-recruiting/learn" className="hover:underline">Learn</a> › Recruiting roadmap
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">{me ? `${me.firstName}'s recruiting roadmap` : "Your recruiting roadmap"}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">What to do each year, what opens, and the rules that matter.</p>
            {me ? (
              <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-[#060f1f]/60 px-4 py-3">
                <span className="mr-2 text-base font-bold">{[me.firstName, me.lastName].filter(Boolean).join(" ")}</span>
                {me.classYear ? <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold">Class of {me.classYear}</span> : null}
                {me.team ? <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold">{me.team}</span> : null}
                <span className="rounded-md px-2.5 py-1 text-xs font-bold text-[#0A1628]" style={{ backgroundColor: gold }}>{GRADE_NAME[me.grade]}</span>
              </div>
            ) : null}
          </div>
        </section>

        <nav aria-label="Roadmap sections" className="-mx-4 mt-4 flex items-center gap-4 overflow-x-auto border-b border-white/10 px-4 sm:mx-0 sm:px-0">
          <ul className="flex flex-1 gap-6 whitespace-nowrap text-sm font-semibold">
            {tabs.map((t, i) => (
              <li key={t.label}>
                <a href={t.href} className={`block border-b-2 py-3 ${i === 0 ? "border-[#D3B574] text-[#D3B574]" : "border-transparent text-white/65 hover:text-white"}`}>
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {open ? (
          <>
            <div className="mt-6">
              <RoadmapBoard years={ROADMAP} initialDone={done} current={me?.grade ?? null} selected={selected} readOnly={readOnly} name={me?.firstName ?? null} />
            </div>

            <section id="this-year" className={`${card} mt-6 scroll-mt-20`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: gold }}>{GRADE_NAME[selected]}</p>
                  <h2 className="mt-1 max-w-3xl text-lg font-bold leading-7">{year.headline}</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TRACKS.map((t) => (
                    <a
                      key={t}
                      href={`?for=${t}&grade=${selected}#this-year`}
                      aria-current={t === track ? "true" : undefined}
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${t === track ? "border-[#D3B574] bg-[#D3B574]/15 text-white" : "border-white/15 text-white/60 hover:text-white"}`}
                    >
                      {D1_TRACK_LABEL[t]}
                    </a>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50">What to do</h3>
                  <ol className="mt-3 space-y-3">
                    {year.steps.map((step, i) => (
                      <li key={step.text} className="flex gap-3 text-sm leading-6 text-white/85">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-[#0A1628]" style={{ backgroundColor: gold }}>{i + 1}</span>
                        <span>
                          {step.text}
                          {step.href ? (
                            <a href={step.href} className="ml-1 whitespace-nowrap font-bold hover:underline" style={{ color: gold }}>{step.cta} →</a>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50">What opens this year</h3>
                  {openings.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {openings.map((o) => (
                        <li key={`${o.level}-${o.what}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <a href={o.href} className="text-[10px] font-black uppercase tracking-widest hover:underline" style={{ color: gold }}>{o.level}</a>
                          <p className="mt-0.5 text-sm font-semibold">{o.what}</p>
                          <p className="text-xs text-white/55">{o.when}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-white/55">No new contact or visit date this year.</p>
                  )}
                  {anyAge.length > 0 ? (
                    <details className="mt-3 text-xs text-white/55">
                      <summary className="cursor-pointer font-semibold">Open at any age ({anyAge.length})</summary>
                      <ul className="mt-2 space-y-1">
                        {anyAge.map((o) => (
                          <li key={`${o.level}-${o.what}`}><span className="font-bold text-white/75">{o.level}:</span> {o.what}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white/50">Rules that matter</h3>
                  <ul className="mt-3 space-y-3">
                    {year.facts.map((fact) => (
                      <li key={fact.text} className="flex gap-2.5 text-sm leading-6 text-white/85">
                        <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-white/40" aria-hidden />
                        <span>
                          {fact.text}
                          <span className="mt-0.5 block text-xs text-white/40">
                            {fact.sources.map((key, i) => (
                              <span key={key}>
                                {i > 0 ? "; " : ""}
                                <a href={SOURCES[key].url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">{SOURCES[key].label}</a>
                              </span>
                            ))}
                            {fact.href ? (
                              <a href={fact.href} className="ml-2 font-bold hover:underline" style={{ color: gold }}>The rule →</a>
                            ) : null}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { icon: ShieldAlert, title: "Rules change", text: `Dates vary by level and can change. Checked ${checkedLabel}.`, cta: "The rules, level by level", href: "/recruiting/learn/division-1" },
                { icon: BarChart3, title: "Not sure where to start?", text: "Compare colleges on athletic, academic, cost and personal fit.", cta: "Find your fit", href: "/recruiting/compare" },
                { icon: FileText, title: "Getting recruited", text: "Questionnaires, writing to coaches, camps and calls.", cta: "Tools & templates", href: "/recruiting/learn/working-the-process" },
              ].map(({ icon: Icon, title, text, cta, href }) => (
                <a key={title} href={href} className={`${card} group flex gap-3 hover:border-white/25`}>
                  <Icon className="mt-0.5 h-6 w-6 shrink-0" style={{ color: gold }} aria-hidden />
                  <span>
                    <span className="block text-base font-bold">{title}</span>
                    <span className="mt-1 block text-sm text-white/60">{text}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold" style={{ color: gold }}>{cta} <ArrowRight className="h-4 w-4" aria-hidden /></span>
                  </span>
                </a>
              ))}
            </div>
          </>
        ) : null}

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
