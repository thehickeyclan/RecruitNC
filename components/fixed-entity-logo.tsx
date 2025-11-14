"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface FixedEntityLogoProps {
  entityType: string
  entityName: string
  size?: "xs" | "sm" | "md" | "lg" | number
  className?: string
}

export function FixedEntityLogo({ entityType, entityName, size = "md", className = "" }: FixedEntityLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Convert size to pixels
  const sizeMap = {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 48,
  }
  const finalSize = typeof size === "number" ? size : sizeMap[size]

  // Get fallback image
  const getFallback = () => {
    switch (entityType) {
      case "college":
        return "/generic-college-logo.png"
      case "highschool":
      case "high_school":
        return "/high-school-logo.png"
      case "club":
        return "/wrestling-club-logo.png"
      default:
        return "/placeholder.svg?height=40&width=40"
    }
  }

  useEffect(() => {
    async function fetchLogo() {
      if (!entityName || !entityType) {
        setLoading(false)
        setError("Missing entity data")
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/logo-mappings/${entityType}/${encodeURIComponent(entityName)}`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.logo_url) {
          setLogoUrl(data.logo_url)
          setError(null)
        } else {
          setError("No logo found")
          setLogoUrl(null)
        }
      } catch (err) {
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
        style={{ width: finalSize, height: finalSize }}
      />
    )
  }

  // Use logo URL if available, otherwise use fallback
  const imageToShow = logoUrl || getFallback()

  return (
    <Image
      src={imageToShow || "/placeholder.svg"}
      alt={`${entityName} logo`}
      width={finalSize}
      height={finalSize}
      className={`object-contain ${className}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        target.src = getFallback()
      }}
    />
  )
}
