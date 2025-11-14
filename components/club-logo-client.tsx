"use client"

import { useState, useEffect } from "react"

interface ClubLogoClientProps {
  clubName: string
}

export function ClubLogoClient({ clubName }: ClubLogoClientProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLogo() {
      if (!clubName || clubName.trim() === "") {
        setIsLoading(false)
        return
      }

      try {
        console.log("[v0] Fetching club logo for:", clubName)
        const response = await fetch(`/api/logo-mappings/by-entity/club/${encodeURIComponent(clubName)}`)
        console.log("[v0] Club logo API response:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Club logo data:", data)
          if (data.success && data.logo_url) {
            setLogoUrl(data.logo_url)
          }
        }
      } catch (error) {
        console.log("[v0] Failed to fetch club logo:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLogo()
  }, [clubName])

  if (isLoading) {
    return <div className="w-full h-full bg-gray-300 animate-pulse rounded" />
  }

  return (
    <img
      src={logoUrl || "/wrestling-club-logo.png"}
      alt={`${clubName} logo`}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.src = "/wrestling-club-logo.png"
      }}
    />
  )
}
