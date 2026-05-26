"use client"

import Image from "next/image"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import { heroTeamPhotoForScope } from "@/lib/nhsca-duals-2026-team-photos"
import { cn } from "@/lib/utils"

function TeamPhotoCard({
  src,
  label,
  aspectClass = "aspect-[16/10] sm:aspect-[2/1]",
  objectPosition = "center center",
  priority = false,
}: {
  src: string
  label: string
  aspectClass?: string
  objectPosition?: string
  priority?: boolean
}) {
  return (
    <figure className="rounded-2xl border border-white/10 overflow-hidden bg-[#0a2040]/60 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className={cn("relative w-full", aspectClass)}>
        <Image
          src={src}
          alt={`NC United ${label} at NHSCA Duals 2026`}
          fill
          className="object-cover"
          style={{ objectPosition }}
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
    const photo = heroTeamPhotoForScope("all")
    return (
      <section>
        <TeamPhotoCard
          src={photo.src}
          label="National & Select Teams"
          aspectClass="aspect-[4/3] sm:aspect-[16/9] w-full max-w-3xl mx-auto"
          objectPosition={photo.objectPosition}
          priority
        />
      </section>
    )
  }

  if (scope === "national") {
    const photo = heroTeamPhotoForScope("national")
    return (
      <section>
        <TeamPhotoCard
          src={photo.src}
          label="National Team"
          objectPosition={photo.objectPosition}
          priority
        />
      </section>
    )
  }

  if (scope === "select") {
    const photo = heroTeamPhotoForScope("select")
    return (
      <section>
        <TeamPhotoCard
          src={photo.src}
          label="Select Team"
          objectPosition={photo.objectPosition}
          priority
        />
      </section>
    )
  }

  return null
}
