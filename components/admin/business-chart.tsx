import type { Series } from "@/lib/business/metrics"

/**
 * One metric's weekly line, drawn as SVG on the server.
 *
 * No chart library and no client JavaScript on purpose: the page is already a server component,
 * the numbers do not move while you look at them, and a chart that is part of the HTML shows up
 * the moment the page does and prints with it. Every point carries a <title> so hovering names
 * the week and the count.
 *
 * The last bar is the week we are in, which is not over. It is drawn hollow so nobody reads a
 * Wednesday as a collapse.
 */

/**
 * What an event with no wrestler behind it actually is, which differs by metric. A sign-in belongs
 * to an account; a profile view that carries no athlete id is a view we could not attribute.
 */
function unassignedNote(metric: Series["metric"]): string {
  return metric === "sign_ins"
    ? "belong to an account that has not claimed a wrestler, so they have no state or gender."
    : "could not be tied to a wrestler, so they have no state or gender."
}

const W = 560
const H = 150
const PAD = { top: 12, right: 8, bottom: 22, left: 34 }

const niceTop = (max: number) => {
  if (max <= 4) return 4
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  for (const step of [1, 2, 2.5, 5, 10]) {
    const top = Math.ceil(max / (pow * step)) * pow * step
    if (top >= max && top / (pow * step) <= 5) return top
  }
  return Math.ceil(max / pow) * pow
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

/** With the year, for a sentence that could otherwise mean any January. */
const dateWithYear = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })

export function BusinessChart({
  series,
  windowLabel,
  allTime,
  bucket = "week",
  accent = "#A3E635",
}: {
  series: Series
  /** The window the big number covers, e.g. "last 6 months". Shown under it. */
  windowLabel?: string
  /** The same metric over all of time, when the window is not all of time. */
  allTime?: number
  /** How wide one bar is. The footnote has to say the truth: a short window counts by day. */
  bucket?: "day" | "week"
  accent?: string
}) {
  const { points, label, unavailable, startsAt, unassigned, total } = series

  if (unavailable) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0d1d36] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">{label}</h3>
          <span className="text-sm text-white/35">not split by brand</span>
        </div>
        <p className="mt-6 mb-6 text-sm text-white/55">{unavailable}.</p>
      </div>
    )
  }

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const top = niceTop(Math.max(1, ...points.map((p) => p.count)))
  const n = Math.max(1, points.length)
  const barW = Math.max(1, plotW / n - 2)
  const x = (i: number) => PAD.left + (plotW / n) * i + 1
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH

  // Where to put week labels: first, last, and a few in between, so they never overlap.
  const every = Math.max(1, Math.ceil(n / 6))
  const lastIndex = points.length - 1

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1d36] p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="pt-1 text-sm font-semibold uppercase tracking-wide text-white/60">{label}</h3>
        {/*
          The big number is the WINDOW, not the total, and it has to say so. Matt read "188" under
          PROFILES CLAIMED with North Carolina and 6 months selected, against the 291 he had counted
          himself, and reasonably asked whether the data was off (4 Nov 2026). Both numbers were
          right; only the card was silent about which one it was showing.
        */}
        <div className="text-right">
          <span className="text-2xl font-black tabular-nums">{total.toLocaleString()}</span>
          {windowLabel ? <p className="text-xs text-white/45">{windowLabel}</p> : null}
          {allTime != null && allTime !== total ? (
            <p className="text-xs text-white/35">{allTime.toLocaleString()} all time</p>
          ) : null}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${label}, ${total} in this window, by week`}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(top * f)} y2={y(top * f)} stroke="#ffffff" strokeOpacity={f === 0 ? 0.25 : 0.08} strokeWidth={1} />
            <text x={PAD.left - 6} y={y(top * f) + 3} textAnchor="end" fontSize={9} fill="#ffffff" fillOpacity={0.4}>
              {Math.round(top * f)}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const h = Math.max(p.count > 0 ? 1.5 : 0, plotH - (y(p.count) - PAD.top))
          const current = i === lastIndex
          return (
            <rect
              key={p.week}
              x={x(i)}
              y={y(p.count)}
              width={barW}
              height={h}
              rx={1.5}
              fill={current ? "none" : accent}
              fillOpacity={current ? 0 : 0.85}
              stroke={current ? accent : "none"}
              strokeOpacity={current ? 0.8 : 0}
              strokeWidth={current ? 1 : 0}
            >
              <title>{`Week of ${shortDate(p.week)}: ${p.count}${current ? " so far" : ""}`}</title>
            </rect>
          )
        })}

        {points.map((p, i) =>
          // The last week always gets a label; a regular one too close to it would collide.
          i === lastIndex || (i % every === 0 && lastIndex - i >= Math.max(2, every / 2)) ? (
            <text key={`l-${p.week}`} x={x(i) + barW / 2} y={H - 7} textAnchor="middle" fontSize={9} fill="#ffffff" fillOpacity={0.4}>
              {shortDate(p.week)}
            </text>
          ) : null,
        )}
      </svg>

      <p className="mt-1 text-xs leading-relaxed text-white/40">
        {bucket === "day" ? "One bar a day, Eastern. The last bar is today so far." : "By week, Monday to Sunday, Eastern. The last bar is this week so far."}
        {startsAt ? ` Nothing was recorded before ${dateWithYear(startsAt)}.` : ""}
        {unassigned ? ` ${unassigned.toLocaleString()} ${unassignedNote(series.metric)}` : ""}
      </p>
    </div>
  )
}
