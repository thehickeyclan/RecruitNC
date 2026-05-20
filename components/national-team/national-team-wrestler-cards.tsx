"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  getNationalWrestlerCardsSorted,
  type NationalWrestlerCard,
} from "@/lib/nhsca-duals-2026-national-wrestler-cards"

function WrestlerCard({ card }: { card: NationalWrestlerCard }) {
  const wtLabel = card.weightClass.toUpperCase() === "HWT" ? "HWT" : `${card.weightClass} lbs`
  const alt = `${card.wrestler}, ${wtLabel} — NC United National Team, NHSCA Duals 2026`
  return (
    <figure className="group">
      <div className="relative overflow-hidden rounded-xl border-2 border-[#002147]/15 bg-[#0a1628] shadow-md transition-shadow group-hover:shadow-lg group-hover:border-[#CBAF5D]/40">
        <div className="relative aspect-[3/4] w-full">
          <Image
            src={card.imageSrc}
            alt={alt}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={card.weightClass === "106"}
          />
        </div>
      </div>
      <figcaption className="mt-2 text-center">
        <p className="text-sm font-semibold text-white">{card.wrestler}</p>
        <p className="text-xs text-white/65 tabular-nums">
          {card.weightClass.toUpperCase() === "HWT" ? "HWT" : `${card.weightClass} lbs`}
        </p>
      </figcaption>
    </figure>
  )
}

/** National team wrestler graphics — grows as card PNGs are added to public/national-cards/. */
export function NationalTeamWrestlerCards({ className }: { className?: string }) {
  const cards = getNationalWrestlerCardsSorted()
  if (cards.length === 0) return null

  return (
    <div className={cn("px-5 py-5 md:px-6 md:py-6 border-b border-white/10", className)}>
      <div className="mb-5">
        <h3 className="text-base font-bold text-white">Team cards</h3>
        <p className="text-xs text-white/65 mt-1">
          Representing NC at NHSCA Duals 2026
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {cards.map((card) => (
          <WrestlerCard key={`${card.weightClass}-${card.wrestler}`} card={card} />
        ))}
      </div>
    </div>
  )
}
