"use client"
import { useState } from "react"
import { Building2, GraduationCap, Users, School } from "lucide-react"

interface EntityLogoRobustProps {
  entityName: string
  entityType: "college" | "high_school" | "club"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function EntityLogoRobust({ entityName, entityType, size = "md", className = "" }: EntityLogoRobustProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  // Generate logo URL based on entity name and type
  const generateLogoUrl = (name: string, type: string) => {
    if (!name || name === "Uncommitted" || name === "Unknown") return null

    // Clean the name for URL
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .trim()

    // Try different logo paths
    const possiblePaths = [
      `/logos/${type}/${cleanName}-logo.png`,
      `/logos/${cleanName}.png`,
      `/${cleanName}-logo.png`,
      `/public/${cleanName}.png`,
    ]

    return possiblePaths[0] // Return the first one for now
  }

  const logoUrl = generateLogoUrl(entityName, entityType)

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setIsLoading(false)
  }

  const getFallbackIcon = () => {
    switch (entityType) {
      case "college":
        return <GraduationCap className={`${iconSizeClasses[size]} text-blue-500`} />
      case "high_school":
        return <School className={`${iconSizeClasses[size]} text-green-500`} />
      case "club":
        return <Users className={`${iconSizeClasses[size]} text-purple-500`} />
      default:
        return <Building2 className={`${iconSizeClasses[size]} text-gray-500`} />
    }
  }

  const getFallbackBg = () => {
    switch (entityType) {
      case "college":
        return "bg-blue-50"
      case "high_school":
        return "bg-green-50"
      case "club":
        return "bg-purple-50"
      default:
        return "bg-gray-50"
    }
  }

  // If no logo URL or image failed to load, show fallback
  if (!logoUrl || imageError) {
    return (
      <div
        className={`${sizeClasses[size]} ${getFallbackBg()} rounded-full flex items-center justify-center ${className}`}
      >
        {getFallbackIcon()}
      </div>
    )
  }

  return (
    <div className={`${sizeClasses[size]} relative ${className}`}>
      {isLoading && (
        <div
          className={`${sizeClasses[size]} ${getFallbackBg()} rounded-full flex items-center justify-center absolute inset-0`}
        >
          {getFallbackIcon()}
        </div>
      )}
      <img
        src={logoUrl || "/placeholder.svg"}
        alt={`${entityName} logo`}
        className={`${sizeClasses[size]} rounded-full object-cover ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  )
}
