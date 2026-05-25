"use client"

import Image from "next/image"
import type { NhscaDualsTournamentMoment } from "@/lib/nhsca-duals-2026-tournament-moments"
import { cn } from "@/lib/utils"

export function NhscaDualsTournamentMomentMedia({ moment }: { moment: NhscaDualsTournamentMoment }) {
  const frameClass = cn(
    "relative w-full rounded-xl overflow-hidden border border-white/10 bg-black",
    moment.aspectClass ?? "aspect-video"
  )

  if (moment.type === "video") {
    return (
      <div className={frameClass}>
        <video
          className="absolute inset-0 h-full w-full object-contain bg-black"
          controls
          playsInline
          preload="metadata"
          aria-label={moment.ariaLabel}
        >
          {moment.mp4Src ? <source src={moment.mp4Src} type="video/mp4" /> : null}
          <source src={moment.videoSrc} type="video/quicktime" />
          <source src={moment.videoSrc} type="video/mp4" />
          Your browser does not support embedded video.
        </video>
      </div>
    )
  }

  return (
    <div className={frameClass}>
      <Image
        src={moment.photoSrc}
        alt={moment.alt}
        fill
        className="object-cover object-center"
        sizes="(max-width: 768px) 100vw, 1024px"
      />
    </div>
  )
}
