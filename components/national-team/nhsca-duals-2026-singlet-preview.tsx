import {
  NHSCA_DUALS_2026_SINGLET_FRONTS,
  NHSCA_DUALS_2026_SINGLET_PHOTOS,
} from "@/lib/nhsca-duals-2026-gear-images"
import { NhscaDuals2026GearPhotoGrid } from "@/components/national-team/nhsca-duals-2026-gear-photo-grid"
import { cn } from "@/lib/utils"

/** Blue & white singlet photos — compact front views on hero/banner; full grid on gear page. */
export function NhscaDuals2026SingletPreview({
  compact = false,
  detailed = false,
  className,
}: {
  compact?: boolean
  /** All four views (front + back for blue and white). */
  detailed?: boolean
  className?: string
}) {
  const photos = detailed ? NHSCA_DUALS_2026_SINGLET_PHOTOS : NHSCA_DUALS_2026_SINGLET_FRONTS

  return (
    <div className={cn(className)} aria-label="2026 NC United team singlets">
      <NhscaDuals2026GearPhotoGrid
        photos={photos}
        compact={compact && !detailed}
        columns={detailed ? 4 : 2}
        className={cn("mx-auto w-full", !compact && detailed && "max-w-4xl")}
      />
    </div>
  )
}
