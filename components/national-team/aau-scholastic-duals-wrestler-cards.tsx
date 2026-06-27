"use client"

import { useState } from "react"
import Image from "next/image"
import { HardLink } from "@/components/hard-link"
import {
  aauScholasticCardRecord,
  getAauScholasticWrestlerCardsPendingCount,
  getAauScholasticWrestlerCardsSorted,
} from "@/lib/aau-scholastic-duals-2026-wrestler-cards"
import { aauScholasticProfileHref } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
import { cn } from "@/lib/utils"

function AauScholasticWrestlerCardTile({
  wrestler,
  weightClass,
  imageSrc,
  record,
  profileHref,
}: {
  wrestler: string
  weightClass: string
  imageSrc: string
  record: string | null
  profileHref: string
}) {
  const [imageError, setImageError] = useState(false)
  const wt = weightClass.trim().toUpperCase() === "HWT" ? "HWT" : `${weightClass} lbs`

  return (
    <HardLink
      href={profileHref}
      className="group flex flex-col rounded-xl sm:rounded-2xl border border-white/12 bg-[#0a1638] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] h-full transition hover:border-[#FF7070]/40 hover:shadow-[0_8px_32px_rgba(255,112,112,0.15)]"
    >
      <div className="relative aspect-[3/4] w-full bg-[#001428]">
        <Image
          src={imageError ? "/wrestler-silhouette.png" : imageSrc}
          alt={`${wrestler}, ${wt}${record ? `, ${record}` : ""} — AAU Scholastic Duals 2026`}
          fill
          className="object-cover object-center"
          sizes="(max-width: 640px) 45vw, 280px"
          onError={() => setImageError(true)}
        />
      </div>
      <div className="px-2.5 sm:px-3 py-2 border-t border-white/10">
        <p className="text-sm font-bold text-white leading-tight group-hover:text-[#FFB3B3]">{wrestler}</p>
        <p className="text-[11px] text-white/55 mt-0.5">
          {wt}
          {record ? <span className="tabular-nums"> · {record}</span> : null}
        </p>
      </div>
    </HardLink>
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
          are in the roster table below.
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
              record={aauScholasticCardRecord(card.wrestler)}
              profileHref={aauScholasticProfileHref(card.wrestler, profileIdMap)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
