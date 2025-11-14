"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface WorkingEntityLogoProps {
  entityName: string
  entityType: "college" | "highschool" | "club"
  size?: number
  className?: string
}

export function WorkingEntityLogo({ entityName, entityType, size = 24, className = "" }: WorkingEntityLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogo() {
      if (!entityName || !entityType) {
        setLoading(false)
        return
      }

      try {
        console.log(`🔍 WorkingEntityLogo: Fetching ${entityType} logo for "${entityName}"`)
        
        // Use the EXACT same API call that works for Jackson Rowling/Darkhorse
        const response = await fetch(`/api/logo-mappings/by-entity/${entityType}/${encodeURIComponent(entityName)}`)
        const data = await response.json()
        
        console.log(`📡 WorkingEntityLogo: Response for "${entityName}":`, data)

        if (data.success && data.logo_url) {
          console.log(`✅ WorkingEntityLogo: Found logo for ${entityName}:`, data.logo_url)
          setLogoUrl(data.logo_url)
          setError(null)
        } else {
          console.log(`❌ WorkingEntityLogo: No logo found for ${entityName}`)
          setError(data.error || "No logo found")
          setLogoUrl(null)
        }
      } catch (err) {
        console.error(`❌ WorkingEntityLogo: Error fetching logo for ${entityName}:`, err)
        setError("Failed to fetch logo")
        setLogoUrl(null)
      } finally {
        setLoading(false)
      }
    }

    fetchLogo()
  }, [entityType, entityName])

  // Show loading state
  if (loading) {
    return (
      <div
        className={`bg-gray-200 animate-pulse rounded ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  // Get fallback image
  const getFallback = () => {
    switch (entityType) {
      case "college":
        return "/generic-college-logo.png"
      case "highschool":
        return "/high-school-logo.png"
      case "club":
        return "/wrestling-club-logo.png"
      default:
        return "/placeholder.svg"
    }
  }

  // Use logo URL if available, otherwise use fallback
  const imageToShow = logoUrl || getFallback()

  return (
    <Image
      src={imageToShow || "/placeholder.svg"}
      alt={`${entityName} logo`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={(e) => {
        console.log(`❌ WorkingEntityLogo: Image failed to load for ${entityName}`)
        const target = e.target as HTMLImageElement
        target.src = getFallback()
      }}
    />
  )
}
