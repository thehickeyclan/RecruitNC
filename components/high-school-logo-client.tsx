"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface HighSchoolLogoClientProps {
  schoolName: string
  className?: string
}

export function HighSchoolLogoClient({
  schoolName,
  className = "w-full h-full object-contain",
}: HighSchoolLogoClientProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadHighSchoolLogo() {
      if (!schoolName || schoolName.trim() === "") {
        setIsLoading(false)
        return
      }

      try {
        console.log("[v0] Fetching high school logo for:", schoolName)
        const url = `/api/logo-mappings/by-entity/high_school/${encodeURIComponent(schoolName)}`
        const response = await fetch(url)
        console.log("[v0] High school logo API response:", response.status)

        if (response.ok && !cancelled) {
          const data = await response.json()
          console.log("[v0] High school logo data:", data)
          if (data?.success && data.logo_url) {
            setLogoUrl(data.logo_url)
          }
        }
      } catch (error) {
        console.error(`[v0] Error loading high school logo for ${schoolName}:`, error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadHighSchoolLogo()

    return () => {
      cancelled = true
    }
  }, [schoolName])

  if (isLoading) {
    return <div className={`animate-pulse bg-gray-300 rounded ${className}`} />
  }

  return (
    <Image
      src={logoUrl || "/placeholder.svg?height=64&width=64&query=high school logo"}
      alt={`${schoolName} logo`}
      width={64}
      height={64}
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        target.src = "/high-school-logo.png"
      }}
    />
  )
}
