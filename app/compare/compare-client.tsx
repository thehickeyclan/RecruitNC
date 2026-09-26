"use client"

/**
 * Two wrestlers, side by side, for a coach deciding between them.
 *
 * Ordered the way the question is actually answered: did they wrestle each other, then did they
 * wrestle the same people, then what have they each done. The résumés are last on purpose —
 * they are the weakest evidence and the only kind most sites have.
 */
import { useMemo, useState } from "react"
import type { Comparison } from "@/lib/athlete-comparison"

type Athlete = {
  id: string
  name: string
  highschool: string | null
  graduationyear: number | null
  weightclass: string | null
}

function Picker({
  label,
  athletes,
  value,
  onChange,
}: {
  label: string
  athletes: Athlete[]
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return athletes
      .filter((a) => `${a.name} ${a.highschool ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [athletes, query])
  const chosen = athletes.find((a) => a.id === value)

  return (
    <div className="flex-1">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {chosen ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2">
          <div>
            <p className="font-semibold text-slate-900">{chosen.name}</p>
            <p className="text-xs text-slate-500">
              {[chosen.highschool, chosen.graduationyear ? `Class of ${chosen.graduationyear}` : null, chosen.weightclass ? `${chosen.weightclass} lbs` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-900" onClick={() => { onChange(""); setQuery("") }}>
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a wrestler or school"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {matches.length > 0 ? (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {matches.map((athlete) => (
                <li key={athlete.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => { onChange(athlete.id); setQuery("") }}
                  >
                    <span className="font-medium text-slate-900">{athlete.name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {[athlete.highschool, athlete.graduationyear].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Resume({ side }: { side: Comparison["left"] & { record?: string | null; statePlacements?: string[]; nationalResults?: string[] } }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="font-bold text-slate-900">{side.name}</p>
      <p className="text-xs text-slate-500">
        {[side.school, side.graduationYear ? `Class of ${side.graduationYear}` : null, side.weight ? `${side.weight} lbs` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Record</dt>
          <dd className="text-slate-900">{side.record ?? "Not on file"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">State</dt>
          <dd className="text-slate-900">
            {side.statePlacements?.length ? side.statePlacements.join(" · ") : "No placement on file"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">National &amp; open</dt>
          <dd className="text-slate-900">
            {side.nationalResults?.length ? (
              <ul className="space-y-0.5">
                {side.nationalResults.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : (
              "Nothing on file"
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default function CompareClient({ athletes }: { athletes: Athlete[] }) {
  const [leftId, setLeftId] = useState("")
  const [rightId, setRightId] = useState("")
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    setError(null)
    setComparison(null)
    try {
      const res = await fetch(`/api/compare?left=${leftId}&right=${rightId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not compare those two.")
      setComparison(data.comparison as Comparison)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not compare those two.")
    } finally {
      setLoading(false)
    }
  }

  const decisive = comparison?.commonOpponents.filter((o) => o.decisive) ?? []
  const shared = comparison?.commonOpponents.filter((o) => !o.decisive) ?? []

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900">Compare wrestlers</h1>
      <p className="mt-1 text-sm text-slate-600">
        Head-to-head first, then the opponents they have both faced, then the résumés.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Picker label="Wrestler" athletes={athletes} value={leftId} onChange={setLeftId} />
        <Picker label="Compared with" athletes={athletes} value={rightId} onChange={setRightId} />
        <button
          type="button"
          disabled={!leftId || !rightId || loading}
          onClick={() => void run()}
          className="h-10 rounded-lg bg-[#B31B1B] px-5 text-sm font-bold text-white disabled:opacity-40"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error}</p>
      ) : null}

      {comparison ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border-2 border-slate-900 bg-slate-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">What the record shows</p>
            <p className="mt-1 text-lg font-semibold">{comparison.verdict}</p>
          </div>

          {comparison.headToHead ? (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Head to head</h2>
              <ul className="mt-2 space-y-1">
                {comparison.headToHead.meetings.map((m, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className="font-semibold">{m.won ? comparison.left.name : comparison.right.name}</span> won
                    {m.method ? ` by ${m.method}` : ""}
                    {m.score ? ` ${m.score}` : ""}
                    {m.event ? ` — ${m.event}` : ""}
                    {m.date ? <span className="text-slate-500"> · {m.date}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Common opponents ({comparison.commonOpponents.length})
            </h2>
            {comparison.commonOpponents.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                No opponent in common. Nothing measured separates them.
              </p>
            ) : (
              <table className="mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Opponent</th>
                    <th className="px-3 py-2">{comparison.left.name}</th>
                    <th className="px-3 py-2">{comparison.right.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...decisive, ...shared].map((o) => (
                    <tr key={o.opponent} className={o.decisive ? "border-t border-slate-200 bg-amber-50" : "border-t border-slate-200"}>
                      <td className="px-3 py-2 font-medium text-slate-900">{o.opponent}</td>
                      <td className={`px-3 py-2 font-bold ${o.leftResult === "W" ? "text-emerald-700" : o.leftResult === "L" ? "text-red-700" : "text-slate-600"}`}>
                        {o.leftResult}
                      </td>
                      <td className={`px-3 py-2 font-bold ${o.rightResult === "W" ? "text-emerald-700" : o.rightResult === "L" ? "text-red-700" : "text-slate-600"}`}>
                        {o.rightResult}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {decisive.length ? (
              <p className="mt-2 text-xs text-slate-500">
                Highlighted rows are opponents one beat and the other lost to — the only rows that separate them.
              </p>
            ) : null}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Resume side={comparison.left as never} />
            <Resume side={comparison.right as never} />
          </section>
        </div>
      ) : null}
    </main>
  )
}
