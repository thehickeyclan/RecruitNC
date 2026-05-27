import {
  NHSCA_DUALS_2026_APPAREL_PHOTOS,
  NHSCA_DUALS_2026_SINGLET_FRONTS,
} from "@/lib/nhsca-duals-2026-gear-images"
import { NhscaDuals2026GearPhotoGrid } from "@/components/national-team/nhsca-duals-2026-gear-photo-grid"
import { AAU_SCHOLASTIC_GEAR_REUSE_NOTE, formatAauScholasticDollars } from "@/lib/aau-scholastic-duals-2026-content"
import { scholasticInsetClass } from "@/components/national-team/scholastic-duals-section"
import { aauPriceClass } from "@/components/national-team/aau-scholastic-theme"
import { cn } from "@/lib/utils"

/** NC United team gear photos — same uniform optional at AAU checkout. */
export function AauScholasticGearPreview({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)} aria-label="NC United team gear and apparel">
      <p className={scholasticInsetClass + " text-sm leading-relaxed text-white/85"}>
        {AAU_SCHOLASTIC_GEAR_REUSE_NOTE}
      </p>

      <div className="space-y-3">
        <div>
          <p className={cn("font-semibold text-white mb-0.5", aauPriceClass)}>
            Singlet · {formatAauScholasticDollars(65)} at checkout
          </p>
          <p className="text-xs text-white/55 mb-3">Blue or white NC United competition singlet</p>
        </div>
        <NhscaDuals2026GearPhotoGrid
          photos={NHSCA_DUALS_2026_SINGLET_FRONTS}
          columns={2}
          className="max-w-lg"
        />
      </div>

      <div className="space-y-3">
        <div>
          <p className={cn("font-semibold text-white mb-0.5", aauPriceClass)}>
            Team apparel · à la carte at checkout
          </p>
          <p className="text-xs text-white/55 mb-3">
            Long sleeve {formatAauScholasticDollars(40)} · Shorts {formatAauScholasticDollars(40)} · Tee{" "}
            {formatAauScholasticDollars(30)}
          </p>
        </div>
        <NhscaDuals2026GearPhotoGrid
          photos={NHSCA_DUALS_2026_APPAREL_PHOTOS}
          columns={2}
          className="max-w-2xl"
        />
      </div>
    </div>
  )
}
