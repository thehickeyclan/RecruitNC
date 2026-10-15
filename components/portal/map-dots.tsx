import type { MapPreview } from "@/lib/college-programs/map-preview"
import { PREVIEW } from "@/lib/college-programs/map-preview"
import { DIVISION_SHORT } from "@/lib/college-programs/types"

/**
 * The college map as a picture: every program a dot in its level's colour, over the map backdrop,
 * with the count by level. Drawn from the program list, so it is the real map, not an illustration.
 */
export function MapDots({ preview, legend = true, className = "" }: { preview: MapPreview; legend?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="relative bg-[#0a1528]" style={{ aspectRatio: `${PREVIEW.width} / ${PREVIEW.height}` }}>
        {preview.backdropUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.backdropUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <svg viewBox={`0 0 ${PREVIEW.width} ${PREVIEW.height}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Map of ${preview.total} college wrestling programs`}>
          {preview.dots.map((d) => (
            <circle key={d.id} cx={d.x} cy={d.y} r={3.4} fill={d.color} stroke="#0a1528" strokeWidth={0.8} />
          ))}
        </svg>
      </div>
      {legend ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2 text-[11px] text-white/70">
          {preview.byDivision.map((d) => (
            <span key={d.division} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
              {DIVISION_SHORT[d.division]} <span className="text-white/45">{d.count}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
