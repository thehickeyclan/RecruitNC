/**
 * What college coaches look at, and "does my wrestler need to be a state champion?" answered from
 * our own records (15 Oct 2026): where the North Carolina wrestlers who committed to college stood
 * in high school, level by level, men's and women's apart. Computed from the went-here snapshot on
 * every load; a group of fewer than five says nothing.
 */
import type { Metadata } from "next"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { PortalShell } from "@/components/portal/portal-shell"
import { readWentHereSnapshot } from "@/lib/college-programs/went-here-snapshot"
import { COLLEGE_DIVISIONS, DIVISION_COLOR, DIVISION_SHORT, type CollegeDivision } from "@/lib/college-programs/types"
import { LOOK_POINTS } from "@/lib/recruiting/learn/coaches-look-for"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "What college wrestling coaches look at | RecruitNC",
  description: "What college wrestling coaches evaluate, and where North Carolina wrestlers who went to college stood in high school, level by level.",
}

const MIN_GROUP = 5
const GOLD = "#D3B574"
const card = "rounded-2xl border border-white/10 bg-[#0d1d36]/80 p-5"

type Group = { division: CollegeDivision; gender: "mens" | "womens"; n: number; champ: number; placer: number; qual: number; other: number; national: number }

export default async function WhatCoachesLookFor() {
  const snapshot = await readWentHereSnapshot().catch(() => null)
  const groups: Group[] = []
  for (const gender of ["mens", "womens"] as const) {
    for (const division of COLLEGE_DIVISIONS) {
      const rows = (snapshot?.commits ?? []).filter((c) => c.division === division && c.gender === gender)
      if (rows.length < MIN_GROUP) continue
      groups.push({
        division,
        gender,
        n: rows.length,
        champ: rows.filter((c) => c.standing.tier === "state-champion").length,
        placer: rows.filter((c) => c.standing.tier === "state-placer").length,
        qual: rows.filter((c) => c.standing.tier === "state-qualifier").length,
        other: rows.filter((c) => c.standing.tier === "none").length,
        national: rows.filter((c) => c.standing.national).length,
      })
    }
  }
  const classes = (snapshot?.commits ?? []).map((c) => c.classYear).filter((y): y is number => y != null)
  const span = classes.length ? `${Math.min(...classes)}–${Math.max(...classes)}` : null
  const d1Men = groups.find((g) => g.division === "NCAA Division I" && g.gender === "mens")
  const restMen = groups.filter((g) => g.gender === "mens" && g.division !== "NCAA Division I")
  const restN = restMen.reduce((a, g) => a + g.n, 0)
  const restChamp = restMen.reduce((a, g) => a + g.champ, 0)

  return (
    <PortalShell active="learn">
      <div className="mx-auto max-w-6xl text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
          <a href="/my-recruiting/learn" className="hover:underline">Learn</a> › Getting recruited
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">What college coaches look at</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/65 sm:text-base">And whether a wrestler needs to be a state champion, answered from where North Carolina wrestlers actually went.</p>

        {/* The answer, in one line each */}
        {d1Men || restN ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {d1Men ? (
              <div className={card}>
                <p className="text-5xl font-black tracking-tight">
                  {d1Men.champ}<span className="text-2xl text-white/40"> of {d1Men.n}</span>
                </p>
                <p className="mt-1 text-sm text-white/70">NC men who went Division I were state champions.</p>
              </div>
            ) : null}
            {restN ? (
              <div className={card}>
                <p className="text-5xl font-black tracking-tight">
                  {restN - restChamp}<span className="text-2xl text-white/40"> of {restN}</span>
                </p>
                <p className="mt-1 text-sm text-white/70">NC men who went {restMen.map((g) => DIVISION_SHORT[g.division]).join(", ").replace(/, ([^,]*)$/, " or $1")} were <b>not</b> state champions.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Level by level */}
        <section className={`${card} mt-5`}>
          <h2 className="text-lg font-bold">Where they stood in high school</h2>
          <p className="mt-1 text-xs text-white/50">
            North Carolina wrestlers who committed to a college wrestling program{span ? `, classes of ${span}` : ""}. Groups under {MIN_GROUP} are left out.
          </p>
          <div className="mt-4 space-y-5">
            {(["mens", "womens"] as const).map((gender) => {
              const list = groups.filter((g) => g.gender === gender)
              if (!list.length) return null
              return (
                <div key={gender}>
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: GOLD }}>{gender === "mens" ? "Men's wrestling" : "Women's wrestling"}</p>
                  <ul className="mt-2 space-y-3">
                    {list.map((g) => (
                      <li key={g.division} className="grid items-center gap-2 sm:grid-cols-[7rem_1fr_9rem]">
                        <span className="flex items-center gap-2 text-sm font-bold">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DIVISION_COLOR[g.division] }} />
                          {DIVISION_SHORT[g.division]} <span className="font-normal text-white/40">({g.n})</span>
                        </span>
                        <span className="flex h-3 overflow-hidden rounded-full bg-white/10" aria-label={`${g.champ} state champions, ${g.placer} placers, ${g.qual} qualifiers, ${g.other} other`}>
                          <span style={{ width: `${(g.champ / g.n) * 100}%`, backgroundColor: GOLD }} />
                          <span className="bg-sky-400" style={{ width: `${(g.placer / g.n) * 100}%` }} />
                          <span className="bg-white/40" style={{ width: `${(g.qual / g.n) * 100}%` }} />
                        </span>
                        <span className="text-xs text-white/60 sm:text-right">
                          {g.champ} champ · {g.placer} placed · {g.national} national
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <p className="mt-4 flex flex-wrap gap-4 text-xs text-white/55">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GOLD }} /> State champion</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Placed at state</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/40" /> Qualified for state</span>
            <span>&quot;National&quot;: placed at a national tournament</span>
          </p>
          <p className="mt-3 text-xs text-white/40">From our verified results. A wrestler from another state, or one who did not commit publicly, is not in these numbers.</p>
        </section>

        {/* What they look at */}
        <section className="mt-8">
          <h2 className="text-xl font-black">What they look at</h2>
          <p className="mt-1 text-xs text-white/45">Our advice from working beside college coaches, not a rule.</p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {LOOK_POINTS.map((p) => (
              <li key={p.title} className={card}>
                <p className="flex items-center gap-2 text-base font-bold">
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: GOLD }} aria-hidden /> {p.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/70">{p.text}</p>
                {p.link ? (
                  <a href={p.link.href} className="mt-3 inline-flex items-center gap-1 text-sm font-bold hover:underline" style={{ color: GOLD }}>
                    {p.link.label} <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <a href="/my-recruiting/colleges" className="mt-8 flex items-center gap-3 rounded-2xl border border-[#D3B574]/50 bg-[#D3B574]/[0.08] p-5 hover:bg-[#D3B574]/[0.12]">
          <span className="flex-1">
            <span className="block text-base font-bold" style={{ color: GOLD }}>See where your wrestler fits</span>
            <span className="block text-sm text-white/65">Every college on your list shows its athletic fit against these numbers.</span>
          </span>
          <ArrowRight className="h-5 w-5 text-white/50" aria-hidden />
        </a>
      </div>
    </PortalShell>
  )
}
