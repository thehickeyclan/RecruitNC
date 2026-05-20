"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

export type DualsWrestlerCardItem = {
  weightClass: string
  wrestler: string
  imageSrc: string
}

function WrestlerCard({ card, teamLabel }: { card: DualsWrestlerCardItem; teamLabel: string }) {
  const wtLabel = card.weightClass.toUpperCase() === "HWT" ? "HWT" : `${card.weightClass} lbs`
  const alt = `${card.wrestler}, ${wtLabel} — NC United ${teamLabel} Team, NHSCA Duals 2026`
  return (
    <figure className="group">
      <div className="relative overflow-hidden rounded-xl border-2 border-white/10 bg-[#0a1628] shadow-md transition-shadow group-hover:shadow-lg group-hover:border-[#CBAF5D]/40">
        <div className="relative aspect-[3/4] w-full">
          <Image
            src={card.imageSrc}
            alt={alt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      </div>
      <figcaption className="mt-2 text-center">
        <p className="text-sm font-semibold text-white">{card.wrestler}</p>
        <p className="text-xs text-white/65 tabular-nums">{wtLabel}</p>
      </figcaption>
    </figure>
  )
}

export function DualsTeamWrestlerCards({
  cards,
  teamLabel,
  pendingCount = 0,
  className,
}: {
  cards: DualsWrestlerCardItem[]
  teamLabel: "National" | "Select"
  /** Wrestlers on roster without card art yet */
  pendingCount?: number
  className?: string
}) {
  if (cards.length === 0 && pendingCount === 0) return null

  return (
    <div className={cn("px-5 py-5 md:px-6 md:py-6 border-b border-white/10", className)}>
      <div className="mb-5">
        <h3 className="text-base font-bold text-white">Team cards</h3>
        <p className="text-xs text-white/65 mt-1">Representing NC at NHSCA Duals 2026 — {teamLabel} team</p>
        {pendingCount > 0 ? (
          <p className="text-xs text-[#CBAF5D]/90 mt-2">
            {pendingCount} card{pendingCount === 1 ? "" : "s"} coming soon — contact table below has full roster.
          </p>
        ) : null}
      </div>
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {cards.map((card) => (
            <WrestlerCard key={`${card.weightClass}-${card.wrestler}`} card={card} teamLabel={teamLabel} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
