import { ChevronRight, MapPin } from "lucide-react"

import type { MapPreview } from "@/lib/college-programs/map-preview"
import { PREVIEW } from "@/lib/college-programs/map-preview"
import { DIVISION_SHORT } from "@/lib/college-programs/types"

/**
 * The college map as a picture on the Command Center; the whole card opens the map. Drawn from
 * the program list (lib/college-programs/map-preview.ts), so it is the family's own map: their
 * team's colleges, with the ones they have saved ringed in gold.
 */
export function MapPreviewCard({ preview, who, team, savedCount }: { preview: MapPreview; who: string | null; team: "mens" | "womens" | null; savedCount: number }) {
  const teamWord = team === "womens" ? "women's " : team === "mens" ? "men's " : ""
  return (
    <a
      href="/recruiting/college-map"
      aria-label="Open the college program map"
      className="group mt-5 block overflow-hidden rounded-xl border border-white/10 bg-[#0f1c2e] transition hover:border-[#D3B574]/60"
    >
      <div className="flex items-start gap-3 p-5 pb-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#D3B574]">
            <MapPin className="h-4 w-4" aria-hidden /> The college map
          </span>
          <span className="mt-1 block text-base font-bold text-white">
            {preview.total} colleges with {teamWord}wrestling{who && team ? ` for ${who}` : ""}
          </span>
          <span className="mt-0.5 block text-sm leading-5 text-white/60">
            Every program by level, with its coaches, tuition and ranking.{" "}
            {savedCount > 0 ? `Your ${savedCount} saved ${savedCount === 1 ? "college is" : "colleges are"} ringed in gold.` : "Tap a college to save it to your list."}
          </span>
        </span>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#D3B574] px-3 py-2 text-sm font-bold text-[#0A1628] group-hover:bg-[#e2c98d]">
          Open the map <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="relative bg-[#0a1528]" style={{ aspectRatio: `${PREVIEW.width} / ${PREVIEW.height}` }}>
        {preview.backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.backdropUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <svg viewBox={`0 0 ${PREVIEW.width} ${PREVIEW.height}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Map of ${preview.total} college wrestling programs across the United States`}>
          {preview.dots.map((d) =>
            d.saved ? (
              <g key={d.id}>
                <circle cx={d.x} cy={d.y} r={8} fill="none" stroke="#F5D985" strokeWidth={2.5} />
                <circle cx={d.x} cy={d.y} r={4} fill={d.color} stroke="#0a1528" strokeWidth={1} />
              </g>
            ) : (
              <circle key={d.id} cx={d.x} cy={d.y} r={3.2} fill={d.color} stroke="#0a1528" strokeWidth={0.8} opacity={0.95} />
            ),
          )}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3 text-xs text-white/70">
        {preview.byDivision.map((d) => (
          <span key={d.division} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
            {DIVISION_SHORT[d.division]} <span className="text-white/45">{d.count}</span>
          </span>
        ))}
      </div>
    </a>
  )
}
