"use client"

import Image from "next/image"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import {
  NHSCA_DUALS_2026_BOTH_TEAMS_PHOTO,
  NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO,
  NHSCA_DUALS_2026_SELECT_TEAM_PHOTO,
} from "@/lib/nhsca-duals-2026-team-photos"
import { cn } from "@/lib/utils"

function TeamPhotoCard({
  src,
  label,
  aspectClass = "aspect-[16/10] sm:aspect-[2/1]",
  priority = false,
}: {
  src: string
  label: string
  aspectClass?: string
  priority?: boolean
}) {
  return (
    <figure className="rounded-2xl border border-white/10 overflow-hidden bg-[#0a2040]/60 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className={cn("relative w-full", aspectClass)}>
        <Image
          src={src}
          alt={`NC United ${label} at NHSCA Duals 2026`}
          fill
          className="object-cover object-center"
          sizes="(max-width: 768px) 100vw, 960px"
          priority={priority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#001428]/90 via-[#001428]/10 to-transparent" />
        <figcaption className="absolute bottom-0 left-0 right-0 px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#CBAF5D]/85">NHSCA Duals 2026</p>
          <p className="text-lg sm:text-xl font-black text-white mt-0.5">{label}</p>
        </figcaption>
      </div>
    </figure>
  )
}

export function NhscaDualsTeamPhotos({ scope }: { scope: CommandCenterScope }) {
  if (scope === "all") {
    return (
      <section>
        <TeamPhotoCard
          src={NHSCA_DUALS_2026_BOTH_TEAMS_PHOTO}
          label="National & Select Teams"
          aspectClass="aspect-[3/4] sm:aspect-[4/5] w-full max-w-lg sm:max-w-2xl mx-auto"
          priority
        />
      </section>
    )
  }

  if (scope === "national") {
    return (
      <section>
        <TeamPhotoCard src={NHSCA_DUALS_2026_NATIONAL_TEAM_PHOTO} label="National Team" priority />
      </section>
    )
  }

  if (scope === "select") {
    return (
      <section>
        <TeamPhotoCard src={NHSCA_DUALS_2026_SELECT_TEAM_PHOTO} label="Select Team" priority />
      </section>
    )
  }

  return null
}
