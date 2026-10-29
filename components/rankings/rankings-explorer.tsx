"use client"

import { useMemo, useState } from "react"
import { ArrowRight, Globe } from "lucide-react"

/**
 * "Explore prospect rankings" on the rankings page (Matt's mock, 29 Oct 2026): pick a state, men's
 * or women's and a class, then open that board. Only boards that are published (or that this
 * viewer may preview) are offered; a state with none says "Coming soon" and cannot be picked.
 */
export type ExplorerState = { code: string; name: string; mens: number[]; womens: number[] }

export function RankingsExplorer({
  states,
  base,
  showStates,
  initialGender = "mens",
}: {
  states: ExplorerState[]
  /** "/rankings" on RecruitWrestlers, "/public-rankings" on NC United. */
  base: string
  showStates: boolean
  initialGender?: "mens" | "womens"
}) {
  const live = states.filter((s) => s.mens.length || s.womens.length)
  const [code, setCode] = useState(live[0]?.code ?? "NC")
  const state = states.find((s) => s.code === code) ?? live[0]
  const [gender, setGender] = useState<"mens" | "womens">(initialGender)
  const years = useMemo(() => (state ? (gender === "mens" ? state.mens : state.womens) : []), [state, gender])
  const [year, setYear] = useState<number | null>(years[0] ?? null)
  const chosenYear = year != null && years.includes(year) ? year : (years[0] ?? null)
  const href =
    state && chosenYear != null
      ? `${base}${gender === "womens" ? "/women" : ""}/${chosenYear}${state.code === "NC" ? "" : `?state=${state.code}`}`
      : null

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto_auto] lg:items-end">
      {showStates ? (
        <div>
          <p className="mb-2 text-sm text-white/60">State</p>
          <div className="flex flex-wrap gap-2">
            {states.map((s) => {
              const isLive = s.mens.length > 0 || s.womens.length > 0
              const selected = isLive && s.code === state?.code
              return isLive ? (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setCode(s.code)}
                  aria-pressed={selected}
                  className={`w-[104px] rounded-xl border px-3 py-3 text-left transition ${selected ? "border-[#D3B574] bg-[#D3B574]/10" : "border-white/15 bg-white/[0.03] hover:border-white/35"}`}
                >
                  <span className="block text-lg font-black">{s.code}</span>
                  <span className="block text-xs text-white/70">{s.name}</span>
                </button>
              ) : (
                <div key={s.code} aria-disabled className="w-[104px] rounded-xl border border-dashed border-white/15 px-3 py-3 text-white/45">
                  <span className="block text-lg font-black">{s.code}</span>
                  <span className="block text-xs">{s.name}</span>
                  <span className="mt-1.5 inline-block rounded-full border border-white/15 px-2 py-0.5 text-[10px]">Coming soon</span>
                </div>
              )
            })}
            <div className="flex w-[104px] flex-col items-center justify-center rounded-xl border border-dashed border-white/15 px-3 py-3 text-center text-[11px] text-white/45">
              <Globe className="mb-1 h-4 w-4" aria-hidden />
              More states coming soon
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm text-white/60">Division</p>
        <div className="flex rounded-xl border border-white/15 p-1">
          {(["mens", "womens"] as const).map((g) => {
            const has = state ? (g === "mens" ? state.mens.length : state.womens.length) > 0 : false
            return (
              <button
                key={g}
                type="button"
                disabled={!has}
                onClick={() => setGender(g)}
                aria-pressed={gender === g}
                className={`min-w-[96px] rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${gender === g ? "bg-[#D3B574] text-[#0A1628]" : "text-white/75 hover:text-white"}`}
              >
                {g === "mens" ? "Men" : "Women"}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:flex-col lg:items-stretch">
        <label className="block">
          <span className="mb-2 block text-sm text-white/60">Graduation year</span>
          <select
            value={chosenYear ?? ""}
            onChange={(e) => setYear(Number(e.target.value))}
            disabled={!years.length}
            className="w-full min-w-[200px] rounded-xl border border-white/15 bg-[#0A1628] px-3 py-2.5 text-sm font-semibold text-white"
          >
            {years.length ? years.map((y) => <option key={y} value={y}>{y}</option>) : <option value="">Coming soon</option>}
          </select>
        </label>
        {href ? (
          <a href={href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D3B574] px-5 py-3 text-sm font-black text-[#0A1628] hover:brightness-110">
            View rankings <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  )
}
