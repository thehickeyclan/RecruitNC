import { NHSCA_DUALS_2026_APPAREL_PHOTOS } from "@/lib/nhsca-duals-2026-gear-images"
import { NhscaDuals2026GearPhotoGrid } from "@/components/national-team/nhsca-duals-2026-gear-photo-grid"
import { cn } from "@/lib/utils"

/** Individual long sleeve, shorts, and short sleeve tee photos. */
export function NhscaDuals2026ApparelPreview({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn(className)} aria-label="2026 NC United team apparel">
      <NhscaDuals2026GearPhotoGrid
        photos={NHSCA_DUALS_2026_APPAREL_PHOTOS}
        compact={compact}
        columns={2}
        className="mx-auto w-full"
      />
    </div>
  )
}
