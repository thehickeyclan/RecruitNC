"use client"

import { useSmartLogoMatching } from "@/hooks/use-smart-logo-matching"
import Image from "next/image"
import { useState } from "react"
import { Building2, GraduationCap, Users, School } from "lucide-react"

interface SmartLogoProps {
  entityName: string | null | undefined
  entityType: "club" | "highschool" | "college"
  fallbackSrc: string
  alt: string
  width?: number
  height?: number
  className?: string
  showMatchInfo?: boolean
}

export function SmartLogo({
  entityName,
  entityType,
  fallbackSrc,
  alt,
  width = 40,
  height = 40,
  className = "",
  showMatchInfo = false,
}: SmartLogoProps) {
  const { logoUrl, isLoading, error, matchInfo } = useSmartLogoMatching(entityName, entityType)
  const [imageError, setImageError] = useState(false)

  const getFallbackIcon = () => {
    const iconSize = Math.min(width, height) * 0.6
    const iconProps = { width: iconSize, height: iconSize, className: "text-gray-400" }

    switch (entityType) {
      case "college":
        return <GraduationCap {...iconProps} className="text-blue-400" />
      case "highschool":
        return <School {...iconProps} className="text-green-400" />
      case "club":
        return <Users {...iconProps} className="text-purple-400" />
      default:
        return <Building2 {...iconProps} />
    }
  }

  const getFallbackBg = () => {
    switch (entityType) {
      case "college":
        return "bg-blue-50"
      case "highschool":
        return "bg-green-50"
      case "club":
        return "bg-purple-50"
      default:
        return "bg-gray-50"
    }
  }

  if (isLoading) {
    return (
      <div
        className={`${getFallbackBg()} animate-pulse rounded flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
      </div>
    )
  }

  // If we have a logo URL and no image error, show the logo
  if (logoUrl && !imageError) {
    return (
      <div className="relative">
        <Image
          src={logoUrl || "/placeholder.svg"}
          alt={alt}
          width={width}
          height={height}
          className={`object-contain rounded ${className}`}
          onError={() => setImageError(true)}
        />

        {showMatchInfo && matchInfo && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded-full">
            {matchInfo.confidence}%
          </div>
        )}
      </div>
    )
  }

  // Try the fallback image
  if (fallbackSrc && !imageError) {
    return (
      <div className="relative">
        <Image
          src={fallbackSrc || "/placeholder.svg"}
          alt={alt}
          width={width}
          height={height}
          className={`object-contain rounded ${className}`}
          onError={() => setImageError(true)}
        />

        {showMatchInfo && error && (
          <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-1 rounded-full">F</div>
        )}
      </div>
    )
  }

  // Show icon fallback
  return (
    <div
      className={`${getFallbackBg()} rounded flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      {getFallbackIcon()}
      {showMatchInfo && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">❌</div>
      )}
    </div>
  )
}
