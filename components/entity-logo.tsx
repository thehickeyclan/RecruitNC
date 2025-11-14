"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getLogoUrl } from "@/lib/logo-mappings"

interface EntityLogoProps {
  entityName?: string
  entityType?: "college" | "high_school" | "wrestling_club" | "club" | "highschool"
  className?: string
  size?: number
  // Support legacy prop names
  name?: string
  category?: string
  type?: string
}

export function EntityLogo({
  entityName,
  entityType,
  className = "",
  size = 40,
  name,
  category,
  type,
}: EntityLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  // Handle legacy prop names
  const finalEntityName = entityName || name || ""
  const finalEntityType = entityType || category || type || "college"

  useEffect(() => {
    const fetchLogo = async () => {
      if (!finalEntityName || finalEntityName === "Not specified" || finalEntityName === "") {
        setIsLoading(false)
        return
      }

      try {
        // Convert entity type to match the logo mappings system
        let dbEntityType = finalEntityType
        if (dbEntityType === "wrestling_club") {
          dbEntityType = "club"
        }
        if (dbEntityType === "high_school") {
          dbEntityType = "highschool"
        }

        // Use the same getLogoUrl function that works on homepage
        const logo = await getLogoUrl(dbEntityType, finalEntityName)

        if (logo) {
          setLogoUrl(logo)
        } else {
          // Use fallback based on entity type
          const fallbackLogos = {
            college: "/generic-college-logo.png",
            highschool: "/high-school-logo.png",
            high_school: "/high-school-logo.png",
            club: "/wrestling-club-logo.png",
            wrestling_club: "/wrestling-club-logo.png",
          }
          setLogoUrl(fallbackLogos[finalEntityType] || "/placeholder.svg")
        }
      } catch (error) {
        console.error("Error fetching logo:", error)
        // Use fallback on error
        const fallbackLogos = {
          college: "/generic-college-logo.png",
          highschool: "/high-school-logo.png",
          high_school: "/high-school-logo.png",
          club: "/wrestling-club-logo.png",
          wrestling_club: "/wrestling-club-logo.png",
        }
        setLogoUrl(fallbackLogos[finalEntityType] || "/placeholder.svg")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogo()
  }, [finalEntityName, finalEntityType])

  if (isLoading) {
    return <div className={`animate-pulse bg-gray-200 rounded ${className}`} style={{ width: size, height: size }} />
  }

  return (
    <Image
      src={logoUrl || "/placeholder.svg"}
      alt={`${finalEntityName} logo`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={(e) => {
        // Final fallback if image fails to load
        const fallbackLogos = {
          college: "/generic-college-logo.png",
          highschool: "/high-school-logo.png",
          high_school: "/high-school-logo.png",
          club: "/wrestling-club-logo.png",
          wrestling_club: "/wrestling-club-logo.png",
        }
        const target = e.target as HTMLImageElement
        target.src = fallbackLogos[finalEntityType] || "/placeholder.svg"
      }}
    />
  )
}

export default EntityLogo
