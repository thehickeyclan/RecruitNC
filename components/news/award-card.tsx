"use client"

import Image from "next/image"
import { GraduationCap } from "lucide-react"

type FeaturedAthlete = {
  name: string
  rank: number
  href: string
}

type AwardCardProps = {
  award: string
  college: string
  stat: string
  logoUrl?: string | null
  featuredAthletes: FeaturedAthlete[]
}

const athleteLinkClass =
  "font-semibold text-[#003366] underline decoration-[#003366]/40 underline-offset-2 hover:decoration-[#003366]"

export function AwardCard({ award, college, stat, logoUrl, featuredAthletes }: AwardCardProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-[#003366]">{award}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${college} logo`}
              width={48}
              height={48}
              className="h-full w-full object-contain"
            />
          ) : (
            <GraduationCap className="h-7 w-7 text-[#003366]/40" aria-hidden />
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-[#13294B]">{college}</p>
          <p className="text-sm font-semibold text-[#D3B574]">{stat}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-800">Featured: </span>
        {featuredAthletes.map((athlete, index) => (
          <span key={athlete.href}>
            {index > 0 ? ", " : null}
            <a href={athlete.href} className={athleteLinkClass}>
              {athlete.name} (#{athlete.rank})
            </a>
          </span>
        ))}
      </p>
    </div>
  )
}
