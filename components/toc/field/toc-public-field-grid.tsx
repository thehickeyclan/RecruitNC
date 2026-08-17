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
 * Weight grid for the public field, mirroring the private bracket hub so the two feel like one product.
 *
 * Red is the released state, matching the bracket hub where red is the live/hover accent — an unreleased
 * weight is muted, not red, so "red means active" stays true across both pages. Unreleased tiles are plain
 * `div`s with no href: there is nothing to click and nothing in the markup naming who is in that weight.
 */
export function TocPublicFieldGrid({ tiles }: { tiles: PublicWeightTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {tiles.map((tile) =>
        tile.announced ? (
          <HardLink
            key={tile.weightClass}
            href={`/tournament-of-champions/field/${tile.weightClass}`}
            className="group rounded-sm border border-[#CC0000]/45 bg-[#CC0000]/[0.07] p-6 text-center transition-all hover:border-[#CC0000] hover:bg-[#CC0000]/15 hover:shadow-lg hover:shadow-[#CC0000]/20"
          >
            <p className={`text-3xl text-[#CC0000] transition-colors sm:text-4xl ${tocDisplayClass()}`}>
              {tile.weightClass}
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
              lbs · {tile.athleteCount} athlete{tile.athleteCount === 1 ? "" : "s"}
            </p>
            {tile.announcedAt ? (
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/35">
                {announcedLabel(tile.announcedAt)}
              </p>
            ) : null}
          </HardLink>
        ) : (
          <div
            key={tile.weightClass}
            aria-disabled="true"
            className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-6 text-center"
          >
            <p className={`text-3xl text-white/25 sm:text-4xl ${tocDisplayClass()}`}>{tile.weightClass}</p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/25">
              <Lock className="h-3 w-3 shrink-0" aria-hidden />
              lbs · coming soon
            </p>
          </div>
        ),
      )}
    </div>
  )
}
