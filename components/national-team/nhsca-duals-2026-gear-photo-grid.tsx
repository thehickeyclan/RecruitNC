import Image from "next/image"
import type { NhscaGearPhoto } from "@/lib/nhsca-duals-2026-gear-images"
import { cn } from "@/lib/utils"

/** Individual gear product photos — singlets, tees, shorts. */
export function NhscaDuals2026GearPhotoGrid({
  photos,
  compact = false,
  columns = 2,
  className,
}: {
  photos: NhscaGearPhoto[]
  compact?: boolean
  columns?: 2 | 3 | 4
  className?: string
}) {
  const colClass =
    columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2"

  return (
    <div
      className={cn("grid gap-2 sm:gap-3", colClass, compact ? "max-w-md" : "max-w-3xl", className)}
    >
      {photos.map((photo) => (
        <figure
          key={photo.id}
          className="rounded-lg bg-white p-1.5 sm:p-2 ring-1 ring-[#002147]/10 shadow-sm"
        >
          <div
            className={cn(
              "relative w-full",
              compact ? "aspect-[3/4]" : "aspect-[3/4] sm:aspect-[4/5]"
            )}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 45vw, 180px"
            />
          </div>
          <figcaption
            className={cn(
              "mt-1.5 text-center font-semibold text-[#002147]/80 leading-tight",
              compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"
            )}
          >
            {photo.label}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
