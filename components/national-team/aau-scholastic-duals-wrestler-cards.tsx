"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { RotateCw } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import {
  getAauScholasticWrestlerCardsPendingCount,
  getAauScholasticWrestlerCardsSorted,
} from "@/lib/aau-scholastic-duals-2026-wrestler-cards"
import { aauScholasticProfileHref } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
import { cn } from "@/lib/utils"

function AauScholasticCardProfileFooter({
  wrestler,
  profileHref,
}: {
  wrestler: string
  profileHref: string
}) {
  return (
    <div className="px-2.5 sm:px-3 py-2 border-t border-white/10">
      <HardLink
        href={profileHref}
        className="flex min-h-[44px] items-center justify-center text-sm font-bold text-[#FF7070] hover:text-[#FFB3B3] hover:underline"
      >
        Profile
      </HardLink>
      <span className="sr-only">{wrestler}</span>
    </div>
  )
}

function AauScholasticWrestlerFlipVideoCard({
  wrestler,
  weightClass,
  imageSrc,
  profileHref,
  highlightVideoSrc,
}: {
  wrestler: string
  weightClass: string
  imageSrc: string
  profileHref: string
  highlightVideoSrc: string
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const wt = weightClass.trim().toUpperCase() === "HWT" ? "HWT" : `${weightClass} lbs`

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isFlipped) {
      void video.play().catch(() => {})
      return
    }
    video.pause()
    video.currentTime = 0
  }, [isFlipped])

  return (
    <div className="flex flex-col rounded-xl sm:rounded-2xl border border-white/12 bg-[#0a1638] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] h-full transition hover:border-[#FF7070]/40 hover:shadow-[0_8px_32px_rgba(255,112,112,0.15)]">
      <div className="group [perspective:1200px] relative aspect-[3/4] w-full bg-[#001428]">
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]",
          )}
        >
          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className={cn(
              "absolute inset-0 h-full w-full text-left [backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
              !isFlipped ? "z-20" : "z-10",
            )}
            aria-label={`${wrestler} — tap card for highlight video`}
          >
            <Image
              src={imageError ? "/wrestler-silhouette.png" : imageSrc}
              alt={`${wrestler}, ${wt} — AAU Scholastic Duals 2026 athlete card`}
              fill
              className="object-cover object-center"
              sizes="(max-width: 640px) 45vw, 280px"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#001428]/95 via-[#001428]/35 to-transparent px-3 pb-3 pt-10">
              <p className="text-[11px] font-semibold text-white/75">Tap card for highlights</p>
            </div>
          </button>

          <div
            className={cn(
              "absolute inset-0 h-full w-full bg-black [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]",
              isFlipped ? "z-20" : "z-10",
            )}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-contain bg-black"
              controls
              playsInline
              preload="metadata"
              aria-label={`${wrestler} highlight video — AAU Scholastic Duals 2026`}
            >
              <source src={highlightVideoSrc} type="video/quicktime" />
              <source src={highlightVideoSrc} type="video/mp4" />
            </video>
            <button
              type="button"
              onClick={() => setIsFlipped(false)}
              className="absolute top-2 right-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center bg-black/55 text-white hover:bg-black/70 transition-colors"
              aria-label="Flip back to card"
            >
              <RotateCw className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <AauScholasticCardProfileFooter wrestler={wrestler} profileHref={profileHref} />
    </div>
  )
}

function AauScholasticWrestlerCardTile({
  wrestler,
  weightClass,
  imageSrc,
  profileHref,
  highlightVideoSrc,
}: {
  wrestler: string
  weightClass: string
  imageSrc: string
  profileHref: string
  highlightVideoSrc?: string
}) {
  const [imageError, setImageError] = useState(false)
  const wt = weightClass.trim().toUpperCase() === "HWT" ? "HWT" : `${weightClass} lbs`

  if (highlightVideoSrc) {
    return (
      <AauScholasticWrestlerFlipVideoCard
        wrestler={wrestler}
        weightClass={weightClass}
        imageSrc={imageSrc}
        profileHref={profileHref}
        highlightVideoSrc={highlightVideoSrc}
      />
    )
  }

  return (
    <div className="flex flex-col rounded-xl sm:rounded-2xl border border-white/12 bg-[#0a1638] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] h-full transition hover:border-[#FF7070]/40 hover:shadow-[0_8px_32px_rgba(255,112,112,0.15)]">
      <div className="relative aspect-[3/4] w-full bg-[#001428]">
        <Image
          src={imageError ? "/wrestler-silhouette.png" : imageSrc}
          alt={`${wrestler}, ${wt} — AAU Scholastic Duals 2026 athlete card`}
          fill
          className="object-cover object-center"
          sizes="(max-width: 640px) 45vw, 280px"
          onError={() => setImageError(true)}
        />
      </div>
      <AauScholasticCardProfileFooter wrestler={wrestler} profileHref={profileHref} />
    </div>
  )
}

export function AauScholasticDualsWrestlerCards({
  profileIdMap = {},
  className,
}: {
  profileIdMap?: Record<string, string>
  className?: string
}) {
  const cards = getAauScholasticWrestlerCardsSorted()
  const pending = getAauScholasticWrestlerCardsPendingCount()

  if (cards.length === 0 && pending === 0) return null

  return (
    <div className={cn("px-4 py-5 sm:px-5", className)}>
      {pending > 0 ? (
        <p className="text-xs text-[#FFB3B3]/90 mb-4">
          {pending} card{pending === 1 ? "" : "s"} coming soon — send art and we&apos;ll add them here. Full stats
          are in the individual results above.
        </p>
      ) : null}
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {cards.map((card) => (
            <AauScholasticWrestlerCardTile
              key={`${card.weightClass}-${card.wrestler}`}
              wrestler={card.wrestler}
              weightClass={card.weightClass}
              imageSrc={card.imageSrc}
              profileHref={aauScholasticProfileHref(card.wrestler, profileIdMap)}
              highlightVideoSrc={card.highlightVideoSrc}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
