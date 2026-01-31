"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type AnyAthlete = {
  id?: string
  name?: string
  // common variants we see across codebase
  club?: string
  wrestlingClub?: string
  wrestlingclub?: string
  wrestling_club?: string
  team?: string
  ncUnitedTeam?: string
  ncunitedteam?: string
  ncUnitedBlue?: boolean
}

export function PublicProfileLogos({
  athlete,
  className,
}: {
  athlete: AnyAthlete
  className?: string
}) {
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null)

  // Resolve final club name using safe fallbacks only (no hard-coded athlete mappings here).
  const clubName = useMemo(() => {
    const candidates = [athlete?.club, athlete?.wrestlingClub, athlete?.wrestlingclub, athlete?.wrestling_club]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s && s.toLowerCase() !== "none")

    return candidates[0] || null
  }, [athlete])

  // Check NC United Blue from multiple possible fields; only render Blue if flagged.
  const isNCUnitedBlue = useMemo(() => {
    if (athlete?.ncUnitedBlue === true) return true
    const teamCandidates = [athlete?.ncUnitedTeam, athlete?.ncunitedteam, athlete?.team].map((s) =>
      typeof s === "string" ? s.toLowerCase() : "",
    )

    // Must include "nc united" and "blue" to avoid false positives.
    return teamCandidates.some((t) => t.includes("nc united") && t.includes("blue"))
  }, [athlete])

  useEffect(() => {
    let cancelled = false
    async function loadClubLogo() {
      if (!clubName) {
        setClubLogoUrl(null)
        return
      }
      try {
        const url = `/api/logo-mappings/by-entity/club/${encodeURIComponent(clubName)}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data?.success && typeof data.logo_url === "string") {
          setClubLogoUrl(data.logo_url)
        }
      } catch {
        // Silent fail – UI will simply omit the club logo.
      }
    }
    loadClubLogo()
    return () => {
      cancelled = true
    }
  }, [clubName])

  // Nothing to show? Render nothing to avoid layout shifts or risks.
  if (!clubLogoUrl && !isNCUnitedBlue) return null

  return (
    <section
      aria-label="Affiliations"
      className={cn(
        "w-full rounded-lg border bg-white/80 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "flex flex-wrap items-center gap-6",
        className,
      )}
    >
      {clubLogoUrl && (
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-gray-100 ring-1 ring-gray-200 overflow-hidden flex items-center justify-center">
            <Image
              src={clubLogoUrl || "/placeholder.svg"}
              alt={`${clubName || "Club"} logo`}
              width={44}
              height={44}
              className="object-contain"
              sizes="44px"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium text-gray-900">{clubName}</div>
            <div className="text-xs text-gray-500">Club</div>
          </div>
        </div>
      )}

      {isNCUnitedBlue && (
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-blue-50 ring-1 ring-blue-100 overflow-hidden flex items-center justify-center">
            <Image
              src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/CqLaWvzmjRuOdctL8VovY-NC%20United.png"
              alt="NC United Blue"
              width={44}
              height={44}
              className="object-contain"
              sizes="44px"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-blue-700">NC United Blue</div>
            <div className="text-xs text-gray-500">National Team</div>
          </div>
        </div>
      )}
    </section>
  )
}

export default PublicProfileLogos
