"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Camera } from "lucide-react"
import { getWrestlersForScope } from "@/lib/nhsca-duals-command-center"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import { formatGalleryRecord, recordForGalleryPhoto } from "@/lib/nhsca-duals-gallery-record-lookup"
import { galleryPhotosForScope } from "@/lib/nhsca-duals-2026-tournament-gallery"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { cn } from "@/lib/utils"

function weightLabel(weightClass: string) {
  const u = weightClass.trim().toUpperCase()
  return u === "HWT" ? "HWT" : `${weightClass} lbs`
}

export function NhscaDuals2026TournamentGallery({
  scope,
  snapshot,
}: {
  scope: CommandCenterScope
  snapshot?: NhscaDualsResultsSnapshot | null
}) {
  const photos = galleryPhotosForScope(scope)
  const records = useMemo(
    () => (snapshot ? getWrestlersForScope(snapshot, scope) : []),
    [snapshot, scope]
  )

  return (
    <section id="gallery" className="scroll-mt-20 bg-white text-[#002147] py-12 md:py-16 -mx-0 border-t border-white/10">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <Camera className="h-6 w-6 text-[#002147]/70" aria-hidden />
            <h2 className="text-2xl md:text-4xl font-black text-[#002147]">Team gallery</h2>
          </div>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
            NC United wrestlers in action at NHSCA Duals 2026 — Virginia Beach Sports Center
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {photos.map((photo) => (
            <GalleryTile
              key={photo.id}
              photo={photo}
              record={formatGalleryRecord(recordForGalleryPhoto(photo, records))}
            />
          ))}
        </div>

        <p className="text-center text-xs sm:text-sm text-gray-500 italic mt-8 md:mt-10">
          Photos from NHSCA National Duals 2026 — showcasing NC United on the national stage
        </p>
        <p className="text-center text-xs text-gray-500 italic mt-2">
          Records reflect on-the-mat dual results only.
        </p>
      </div>
    </section>
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
    <figure className="group overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-[3/4] w-full bg-gray-200">
        {!err ? (
          <Image
            src={photo.src}
            alt={`${photo.wrestler} at NHSCA Duals 2026`}
            fill
            className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 25vw"
            onError={() => setErr(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 px-2 text-center">
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
      <figcaption className="px-3 py-2.5 sm:py-3 border-t border-gray-100">
        <p className="text-sm sm:text-base font-bold text-[#002147] leading-tight truncate">{photo.wrestler}</p>
        <p className="text-xs text-gray-500 tabular-nums mt-0.5">
          {wt}
          {record ? ` · ${record} record` : ""}
        </p>
      </figcaption>
    </figure>
  )
}
