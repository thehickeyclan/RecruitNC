/**
 * Which states are open, which are built and waiting, and which are still coming.
 *
 * Drawn on the same Mapbox still and the same projection as the college map on this page, so the
 * two read as one picture of the country rather than two different maps. Each state is a dot at
 * its centre with its code beside it; colour is the stage and the number of profiles is in the
 * tooltip, because a green state with 194 profiles and a green state with 784 are not the same
 * thing and the colour alone would say they were.
 */
import { PREVIEW, projectToPreview } from "@/lib/college-programs/map-preview"
import { STAGE_COLOR, STAGE_LABEL, coverageSummary, type CoverageStage, type StateCoverage } from "@/lib/recruiting/state-coverage"

const ORDER: CoverageStage[] = ["live", "ready", "building", "planned"]

export function StateCoverageMap({ rows, backdropUrl }: { rows: StateCoverage[]; backdropUrl?: string | null }) {
  const summary = coverageSummary(rows)
  // Alaska and Hawaii fall outside the frame; they are counted in the summary, not drawn.
  const drawn = rows
    .map((r) => ({ ...r, ...projectToPreview(r.lon, r.lat) }))
    .filter((r) => r.x > 6 && r.x < PREVIEW.width - 6 && r.y > 6 && r.y < PREVIEW.height - 6)

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a1528] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-white sm:text-xl">Where we have wrestlers</h2>
        <p className="text-sm text-white/70">
          <span className="font-semibold text-white">{summary.live} states live</span>
          {summary.ready ? <> · {summary.ready} built</> : null}
          {summary.building ? <> · {summary.building} in progress</> : null}
          {" · "}
          {summary.profiles.toLocaleString()} profiles
        </p>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: `${PREVIEW.width} / ${PREVIEW.height}` }}>
        {backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdropUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover brightness-150" />
        ) : null}
        <svg
          viewBox={`0 0 ${PREVIEW.width} ${PREVIEW.height}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Coverage map: ${summary.live} states live, ${summary.ready} built and ready, ${summary.building} being built`}
        >
          {drawn.map((s) => (
            <g key={s.code} opacity={s.stage === "planned" ? 0.8 : 1}>
              <title>{`${s.name} — ${STAGE_LABEL[s.stage]}${s.profiles ? `, ${s.profiles.toLocaleString()} profiles` : ""}`}</title>
              <circle
                cx={s.x}
                cy={s.y}
                r={s.stage === "live" ? 9 : s.stage === "ready" ? 7 : 5.5}
                fill={STAGE_COLOR[s.stage]}
                stroke="#0a1528"
                strokeWidth={1.4}
              />
              <text
                x={s.x}
                y={s.y + 3.2}
                textAnchor="middle"
                className="select-none"
                style={{ fontSize: 8, fontWeight: 700, fill: s.stage === "planned" ? "#cbd5e1" : "#06121f" }}
              >
                {s.code}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {ORDER.map((stage) => (
          <li key={stage} className="flex items-center gap-2 text-sm text-white/80">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: STAGE_COLOR[stage] }} aria-hidden />
            {STAGE_LABEL[stage]}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-white/55">
        Alaska and Hawaii are counted in the totals and sit outside the map.
      </p>
    </section>
  )
}
