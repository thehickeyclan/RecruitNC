"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { getWrestlersForScope } from "@/lib/nhsca-duals-command-center"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import { formatGalleryRecord, recordForGalleryPhoto } from "@/lib/nhsca-duals-gallery-record-lookup"
import { galleryPhotosForScope } from "@/lib/nhsca-duals-2026-tournament-gallery"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { cn } from "@/lib/utils"

const INITIAL_GALLERY_VISIBLE = 16

function weightLabel(weightClass: string) {
  const u = weightClass.trim().toUpperCase()
  return u === "HWT" ? "HWT" : `${weightClass} lbs`
}

/** Tournament action photos — embedded in the Media section. */
export function NhscaDualsTournamentGalleryGrid({
  scope,
  snapshot,
  className,
  hideHeading = false,
}: {
  scope: CommandCenterScope
  snapshot?: NhscaDualsResultsSnapshot | null
  className?: string
  hideHeading?: boolean
}) {
  const photos = galleryPhotosForScope(scope)
  const records = useMemo(
    () => (snapshot ? getWrestlersForScope(snapshot, scope) : []),
    [snapshot, scope]
  )
  const [visible, setVisible] = useState(INITIAL_GALLERY_VISIBLE)
  const shown = photos.slice(0, visible)
  const hasMore = photos.length > visible

  if (photos.length === 0) return null

  return (
    <div className={cn("space-y-4", className)}>
      {hideHeading ? null : (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-[#CBAF5D]">
            Team gallery
            <span className="ml-2 text-white/45 tabular-nums">({photos.length})</span>
          </h4>
          <p className="text-xs text-white/55 mt-1">NC United wrestlers at Virginia Beach Sports Center</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {shown.map((photo) => (
          <GalleryTile
            key={photo.id}
            photo={photo}
            record={formatGalleryRecord(recordForGalleryPhoto(photo, records))}
          />
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setVisible((n) => n + INITIAL_GALLERY_VISIBLE)}
          className="w-full min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[#CBAF5D] hover:bg-white/10 transition-colors"
        >
          Show more photos ({photos.length - visible} remaining)
        </button>
      ) : null}

      <p className="text-xs text-white/45 italic">
        Records exclude forfeits and reflect on-the-mat dual results only.
      </p>
    </div>
  )
}

function GalleryTile({
  photo,
  record,
}: {
  photo: ReturnType<typeof galleryPhotosForScope>[number]
  record: string | null
}) {
  const [err, setErr] = useState(false)
  const wt = weightLabel(photo.weightClass)

  return (
    <figure className="group overflow-hidden rounded-xl border border-white/10 bg-[#002147]/45 shadow-sm">
      <div className="relative aspect-[3/4] w-full bg-[#0a2040]">
        {!err ? (
          <Image
            src={photo.src}
            alt={`${photo.wrestler} at NHSCA Duals 2026`}
            fill
            className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 33vw"
            onError={() => setErr(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40 px-2 text-center">
            Photo unavailable
          </div>
        )}
        <span
          className={cn(
            "absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white",
            photo.team === "national" ? "bg-[#002147]/85" : "bg-[#B31B1B]/85"
          )}
        >
          {photo.team === "national" ? "National" : "Select"}
        </span>
      </div>
      <figcaption className="px-3 py-2.5 border-t border-white/10">
        <p className="text-sm font-bold text-white leading-tight truncate">{photo.wrestler}</p>
        <p className="text-xs text-white/55 tabular-nums mt-0.5">
          {wt}
          {record ? ` · ${record} record` : ""}
        </p>
      </figcaption>
    </figure>
  )
}
