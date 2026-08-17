import { Lock } from "lucide-react"

import { HardLink } from "@/components/hard-link"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import type { PublicWeightTile } from "@/lib/toc/public-announced-field"

/** Aug 14, not 2026-08-14T18:00:00Z — and never a time, which would hint at the release cadence. */
function announcedLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "announced"
  return `announced ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}`
}

/**
 * Weight grid for the public field: green means the weight is public, red means it is not out yet.
 *
 * Colour is never the only signal — released tiles carry an athlete count and a date, unreleased tiles carry a
 * padlock and "coming soon" — because red/green alone is unreadable for the most common form of colour blindness.
 *
 * Unreleased tiles are plain `div`s with no href. There is nothing to click and nothing in the markup naming who
 * is in that weight; the gate itself lives on the server in {@link listPublicWeightTiles}.
 */
export function TocPublicFieldGrid({
  tiles,
  currentWeight,
}: {
  tiles: PublicWeightTile[]
  /** When set, that tile renders as the page you are already on rather than a link. */
  currentWeight?: number
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {tiles.map((tile) => {
        const isCurrent = currentWeight === tile.weightClass

        if (!tile.announced) {
          return (
            <div
              key={tile.weightClass}
              aria-disabled="true"
              className="rounded-sm border border-[#CC0000]/30 bg-[#CC0000]/[0.06] p-6 text-center"
            >
              <p className={`text-3xl text-[#CC0000]/75 sm:text-4xl ${tocDisplayClass()}`}>{tile.weightClass}</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/35">
                <Lock className="h-3 w-3 shrink-0" aria-hidden />
                lbs · coming soon
              </p>
            </div>
          )
        }

        const body = (
          <>
            <p className={`text-3xl text-emerald-400 sm:text-4xl ${tocDisplayClass()}`}>{tile.weightClass}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/60">
              lbs · {tile.athleteCount} athlete{tile.athleteCount === 1 ? "" : "s"}
            </p>
            {tile.announcedAt ? (
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">
                {announcedLabel(tile.announcedAt)}
              </p>
            ) : null}
          </>
        )

        if (isCurrent) {
          return (
            <div
              key={tile.weightClass}
              aria-current="page"
              className="rounded-sm border-2 border-emerald-400 bg-emerald-400/15 p-6 text-center shadow-lg shadow-emerald-500/10"
            >
              {body}
            </div>
          )
        }

        return (
          <HardLink
            key={tile.weightClass}
            href={`/tournament-of-champions/field/${tile.weightClass}`}
            className="group rounded-sm border border-emerald-400/45 bg-emerald-400/[0.07] p-6 text-center transition-all hover:border-emerald-400 hover:bg-emerald-400/15 hover:shadow-lg hover:shadow-emerald-500/15"
          >
            {body}
          </HardLink>
        )
      })}
    </div>
  )
}
