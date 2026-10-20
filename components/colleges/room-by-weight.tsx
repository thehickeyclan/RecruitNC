import { NEED_LABEL, type Need, type WeightRow } from "@/lib/college-programs/roster-room"

/**
 * The room at every weight for one arrival fall (19 Oct 2026). Cards and numbers, the names behind
 * a tap. The wrestler's own college weights carry the gold ring. Every count is the published
 * roster's; the footnote says what changes it.
 */
const TONE: Record<Need, string> = {
  likely: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  some: "bg-sky-400/15 text-sky-200 ring-sky-400/30",
  crowded: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
}

export function RoomByWeight({
  rows,
  arrival,
  falls,
  season,
  mine,
  first,
  published,
}: {
  rows: WeightRow[]
  arrival: number
  /** The arrival falls the family can switch between (the classes in high school). */
  falls: number[]
  season: string
  /** The wrestler's college weights, highlighted. */
  mine: number[]
  first: string | null
  published: boolean
}) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Arriving at college in the fall of</div>
      <div className="mt-2 flex gap-2">
        {falls.map((f) => (
          <a
            key={f}
            href={`?fall=${f}#room`}
            className={`inline-flex min-h-[36px] items-center rounded-full px-3.5 text-sm font-bold ring-1 ${f === arrival ? "bg-[var(--recruit-accent)] text-[#0A1628] ring-transparent" : "text-white/70 ring-white/15 hover:ring-white/35"}`}
          >
            {f}
          </a>
        ))}
      </div>

      {!published ? (
        <p className="mt-4 text-sm text-white/55">This team&apos;s {season} roster lists too few weights to show the room by weight.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 items-start gap-2 sm:grid-cols-5">
            {rows.map((r) => {
              const isMine = mine.includes(r.weight)
              return (
                <details key={r.weight} className={`group rounded-xl border bg-white/[0.03] ${isMine ? "border-[var(--recruit-accent)] ring-1 ring-[var(--recruit-accent)]" : "border-white/10"}`}>
                  <summary className="cursor-pointer list-none p-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-lg font-black text-white">{r.weight}</span>
                      {isMine ? <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--recruit-accent)" }}>{first ?? "Yours"}</span> : null}
                    </div>
                    <div className="mt-1 text-2xl font-black text-white">
                      {r.staying}
                      <span className="ml-1 text-xs font-semibold text-white/50">still there</span>
                    </div>
                    <div className="mt-0.5 text-xs text-white/45">
                      {r.now} now{r.leaving ? ` · ${r.leaving} done by ${arrival}` : ""}
                    </div>
                    <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold ring-1 ${TONE[r.need]}`}>{NEED_LABEL[r.need]}</span>
                  </summary>
                  {r.wrestlers.length ? (
                    <ul className="space-y-1.5 border-t border-white/10 px-3 py-2.5">
                      {r.leaving ? <li className="text-[11px] text-white/40">Crossed out: last season ends before fall {arrival}</li> : null}
                      {r.wrestlers.map((w, i) => {
                        const done = w.finalSeason != null && w.finalSeason <= arrival
                        return (
                          <li key={`${w.name}-${i}`} className={`text-xs ${done ? "text-white/35 line-through decoration-white/25" : "text-white/80"}`}>
                            <div className="font-semibold">{w.name}</div>
                            <div className="text-white/45">
                              {[w.cls, w.redshirt ? "redshirt" : null, w.finalSeason ? `final ${w.finalSeason - 1}-${String(w.finalSeason).slice(2)}` : "final year unknown", w.homeState].filter(Boolean).join(" · ")}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="border-t border-white/10 px-3 py-2.5 text-xs text-white/45">No one listed at {r.weight}.</p>
                  )}
                </details>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-white/40">
            {season} roster. &ldquo;Still there&rdquo; counts teammates whose eligibility runs past fall {arrival}; a final year we can&apos;t see is counted as staying.
            A direction, not an open spot: redshirts, weight changes, transfers and new signings change every room.
          </p>
        </>
      )}
    </div>
  )
}
