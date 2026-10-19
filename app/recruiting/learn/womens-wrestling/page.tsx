/**
 * Women's wrestling: the college pathway (Matt, 19 Oct 2026). The outside facts and their sources
 * are in lib/recruiting/learn/womens.ts; the numbers about colleges are worked out here from the
 * same data as the college map, and where North Carolina girls went from our commitment records.
 */
import type { Metadata } from "next"
import { ArrowRight, CheckCircle2, ChevronDown, ExternalLink, MapPin, X } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { LearnDisclaimer } from "@/components/recruiting/learn/learn-disclaimer"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { COLLEGE_DIVISIONS, DIVISION_COLOR, DIVISION_SHORT, type CollegeDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
import { readWentHereSnapshot, snapshotForState } from "@/lib/college-programs/went-here-snapshot"
import {
  NEW_PROGRAM_QUESTIONS,
  PARTICIPATION,
  PARTICIPATION_SOURCES,
  STATES_NOTE,
  WOMENS_CHECKED,
  WOMENS_HISTORY,
  WOMENS_MONEY,
  WOMENS_MYTHS,
  WOMENS_PLAYBOOK,
  type WSource,
} from "@/lib/recruiting/learn/womens"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Women's wrestling: the college pathway | RecruitNC",
  description: "Where the college women's wrestling programs are, how the sport has grown, the scholarships, and how recruiting differs for girls, with where North Carolina girls have gone.",
}

const GOLD = "var(--recruit-accent)"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"
const swipe = "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0"
const checked = new Date(`${WOMENS_CHECKED}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
const NEARBY = ["NC", "SC", "VA", "GA", "TN", "WV", "KY"]
const STATE_NAME: Record<string, string> = { NC: "North Carolina", SC: "South Carolina", VA: "Virginia", GA: "Georgia", TN: "Tennessee", WV: "West Virginia", KY: "Kentucky" }
const spoken = (n: string) => n.replace(/\s*\([^)]*\)\s*/g, " ").trim()

function Sources({ list }: { list?: WSource[] }) {
  if (!list?.length) return null
  return (
    <p className="mt-3 flex flex-wrap gap-1.5">
      {list.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/55 hover:border-white/30 hover:text-white">
          {s.label} <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ))}
    </p>
  )
}

function Title({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mt-10">
      <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      {lead ? <p className="mt-1 max-w-3xl text-sm text-white/65">{lead}</p> : null}
    </div>
  )
}

export default async function WomensWrestlingGuide() {
  // Colleges with a women's team, by level, from the map's data.
  const schools = (data.schools as CollegeMapSchool[]).filter((s) => s.programs.some((p) => p.womens))
  const byLevel = new Map<CollegeDivision, number>()
  for (const s of schools) for (const p of s.programs) if (p.womens) byLevel.set(p.division, (byLevel.get(p.division) ?? 0) + 1)
  const levels = COLLEGE_DIVISIONS.map((d) => ({ d, n: byLevel.get(d) ?? 0 })).sort((a, b) => b.n - a.n)
  const most = Math.max(...levels.map((l) => l.n), 1)
  const nearby = NEARBY.map((st) => ({ st, list: schools.filter((s) => s.state === st) })).filter((g) => g.list.length)
  const announced = ANNOUNCED_PROGRAMS.filter((s) => s.programs.some((p) => p.womens))
  const fill = (t: string) => t.replace("{total}", String(schools.length)).replace("{d1}", String(byLevel.get("NCAA Division I") ?? 0))

  // Where North Carolina girls who committed went, from our records.
  const snapshot = snapshotForState(await readWentHereSnapshot().catch(() => null), "NC")
  const girls = (snapshot?.commits ?? []).filter((c) => c.gender === "womens")
  const girlsBy = COLLEGE_DIVISIONS.map((d) => ({ d, n: girls.filter((c) => c.division === d).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)
  const topLevel = girlsBy[0]
  const growth = Math.round(PARTICIPATION[PARTICIPATION.length - 1].girls / PARTICIPATION[0].girls * 10) / 10
  const peak = PARTICIPATION[PARTICIPATION.length - 1].girls

  return (
    <PortalShell active="learn">
      <div className="mx-auto max-w-6xl text-white">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1D3A]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/grappling-duel.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D3A] via-[#0B1D3A]/85 to-transparent" aria-hidden />
          <div className="relative max-w-xl p-6 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <a href="/my-recruiting/learn" className="hover:underline">Learn</a> › Women&apos;s wrestling
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Women&apos;s wrestling: the college pathway</h1>
            <p className="mt-2 text-sm text-white/80 sm:text-base">The fastest-growing opportunity in college wrestling, and how to recruit for it.</p>
            <p className="mt-4 text-xs text-white/50">Checked {checked}</p>
          </div>
        </section>

        {/* The answer in numbers */}
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { n: schools.length, label: "colleges with women's wrestling" },
            { n: `${growth}×`, label: `high school girls in ten years (${peak.toLocaleString("en-US")} in ${PARTICIPATION[PARTICIPATION.length - 1].year})` },
            { n: girls.length, label: "North Carolina girls who went on to wrestle in college" },
            { n: topLevel ? DIVISION_SHORT[topLevel.d] : "-", label: topLevel ? `where most of them went (${topLevel.n} of ${girls.length})` : "where most went" },
          ].map((t) => (
            <div key={t.label} className={card}>
              <p className="text-4xl font-black tracking-tight sm:text-5xl">{t.n}</p>
              <p className="mt-1 text-sm text-white/65">{t.label}</p>
            </div>
          ))}
        </section>

        <Title eyebrow="Rumours vs. facts" title="What you may have heard" />
        <div className={`${swipe} mt-4 sm:grid-cols-2`}>
          {WOMENS_MYTHS.map((m) => (
            <div key={m.heard} className={`${card} w-[88%] shrink-0 snap-center sm:w-auto`}>
              <p className="flex items-start gap-2 text-sm font-semibold text-white/55">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden /> <span>&ldquo;{m.heard}&rdquo;</span>
              </p>
              <p className="mt-2 flex items-start gap-2 text-[15px] leading-6 text-white/90">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden /> <span>{fill(m.truth)}</span>
              </p>
              <Sources list={m.sources} />
            </div>
          ))}
        </div>

        <Title eyebrow="The growth" title="From a few thousand girls to almost ninety thousand" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className={card}>
            <p className="text-sm font-bold">High school girls wrestling, nationwide</p>
            <div className="mt-4 space-y-3">
              {PARTICIPATION.map((p) => (
                <div key={p.year}>
                  <div className="flex justify-between text-xs text-white/70">
                    <span>{p.year}</span>
                    <span className="font-bold text-white">{p.girls.toLocaleString("en-US")}</span>
                  </div>
                  <div className="mt-1 h-3 rounded-full bg-white/[0.06]">
                    <div className="h-3 rounded-full bg-[#D3B574]" style={{ width: `${(p.girls / peak) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/55">{STATES_NOTE.text}</p>
            <Sources list={[...PARTICIPATION_SOURCES, ...STATES_NOTE.sources]} />
          </div>
          <div className={card}>
            <p className="text-sm font-bold">Colleges with women&apos;s wrestling, by level</p>
            <div className="mt-4 space-y-3">
              {levels.map((l) => (
                <div key={l.d}>
                  <div className="flex justify-between text-xs text-white/70">
                    <span>{l.d}</span>
                    <span className="font-bold text-white">{l.n}</span>
                  </div>
                  <div className="mt-1 h-3 rounded-full bg-white/[0.06]">
                    <div className="h-3 rounded-full" style={{ width: `${(l.n / most) * 100}%`, backgroundColor: DIVISION_COLOR[l.d] }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/55">From our college map, 2026-27. Division I is the smallest group.</p>
            <a href="/recruiting/college-map" className="mt-2 inline-flex items-center gap-1 text-sm font-bold" style={{ color: GOLD }}>
              See them all on the map <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>

        <Title eyebrow="Close to home" title="Women's programs near North Carolina" lead="Every college with women's wrestling in North Carolina and the states around it." />
        <div className={`${swipe} mt-4 sm:grid-cols-2 lg:grid-cols-4`}>
          {nearby.map((g) => (
            <div key={g.st} className={`${card} w-[80%] shrink-0 snap-center sm:w-auto`}>
              <p className="flex items-center gap-1.5 font-black">
                <MapPin className="h-4 w-4" style={{ color: GOLD }} aria-hidden /> {STATE_NAME[g.st]}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {g.list.map((s) => {
                  const d = s.programs.find((p) => p.womens)!.division
                  return (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: DIVISION_COLOR[d] }} aria-hidden />
                      <a href={`/recruiting/schools/${s.id}`} className="flex-1 text-white/85 hover:text-white">{spoken(s.name)}</a>
                      <span className="text-[11px] text-white/45">{DIVISION_SHORT[d]}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        {announced.length ? <p className="mt-2 text-sm text-white/60">Announced and starting soon: {announced.map((s) => `${spoken(s.name)} (${s.firstSeason})`).join(", ")}.</p> : null}

        {girls.length ? (
          <>
            <Title eyebrow="North Carolina" title="Where North Carolina girls have gone" lead="From our records of North Carolina wrestlers who committed to college." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {girlsBy.map((g) => (
                <div key={g.d} className={card}>
                  <p className="text-4xl font-black">{g.n}</p>
                  <p className="mt-1 text-sm text-white/65">{g.d}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className={card}>
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Scholarships and aid</p>
            <ul className="mt-3 space-y-2.5">
              {WOMENS_MONEY.map((m) => (
                <li key={m.level} className="text-sm leading-6">
                  <b className="text-white">{m.level}:</b> <span className="text-white/75">{m.aid}</span>
                </li>
              ))}
            </ul>
            <a href="/recruiting/learn/nil" className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: GOLD }}>
              NIL and revenue sharing <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </section>
          <section className={card}>
            <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>How recruiting is different for girls</p>
            <ul className="mt-3 space-y-2.5">
              {WOMENS_PLAYBOOK.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm leading-6 text-white/85">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: GOLD }} aria-hidden /> {p}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "Women's tournaments", href: "/recruiting/learn/tournaments#womens" },
                { label: "Ask Scout", href: "/my-recruiting/scout" },
              ].map((l) => (
                <a key={l.href} href={l.href} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold hover:border-white/30">
                  {l.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              ))}
            </div>
          </section>
        </div>

        <section className={`${card} mt-4`}>
          <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>Ask a new or young program</p>
          <ol className="mt-3 grid gap-3 md:grid-cols-2">
            {NEW_PROGRAM_QUESTIONS.map((q, i) => (
              <li key={q} className="flex gap-3 text-sm leading-6">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{i + 1}</span> {q}
              </li>
            ))}
          </ol>
        </section>

        <details className={`${card} group mt-10`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
            How women&apos;s wrestling got here
            <ChevronDown className="h-4 w-4 shrink-0 text-white/50 transition group-open:rotate-180" aria-hidden />
          </summary>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-white/75">
            {WOMENS_HISTORY.map((h) => (
              <li key={h.when} className="grid grid-cols-[90px_1fr] gap-3">
                <span className="font-bold text-white">{h.when}</span>
                <span>
                  {h.what}
                  <Sources list={h.sources} />
                </span>
              </li>
            ))}
          </ol>
        </details>

        <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-[#13294B] to-[#0b1a33] p-6 text-center sm:p-8">
          <p className="mx-auto max-w-2xl text-lg font-bold leading-7">
            For girls, the doors are opening faster than anywhere else in college wrestling. Wrestle freestyle, look at every level, and reach out early.
          </p>
        </section>
        <div className="mt-6">
          <LearnDisclaimer checkedLabel={checked} />
        </div>
      </div>
    </PortalShell>
  )
}
