"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

interface DivisionLogoProps {
  division: string
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}

export function DivisionLogo({ division, size = "md", className = "" }: DivisionLogoProps) {
  const [imageError, setImageError] = useState(false)

  // Normalize the division format
  const normalizedDivision = division?.toLowerCase().trim() || ""

  // Determine which division (I, II, III, NAIA, JUCO)
  const divisionType = getDivisionType(normalizedDivision)
  const divisionText = getDivisionText(divisionType)

  // Set size based on prop
  const dimensions = {
    xs: { width: 40, height: 20, fontSize: "text-xs" },
    sm: { width: 60, height: 30, fontSize: "text-sm" },
    md: { width: 80, height: 40, fontSize: "text-base" },
    lg: { width: 100, height: 50, fontSize: "text-lg" },
  }

  const { width, height, fontSize } = dimensions[size]

  // Use image for Division I, II, III, and NAIA
  if (
    (divisionType === "d1" || divisionType === "d2" || divisionType === "d3" || divisionType === "naia") &&
    !imageError
  ) {
    let logoSrc = ""

    if (divisionType === "d1") {
      logoSrc = "/division-logos/ncaa-d1-logo.png"
    } else if (divisionType === "d2") {
      logoSrc = "/division-logos/ncaa-d2-logo.png"
    } else if (divisionType === "d3") {
      logoSrc = "/division-logos/ncaa-d3-logo.png"
    } else if (divisionType === "naia") {
      logoSrc = "/division-logos/naia-logo.png"
    }

    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        <Image
          src={logoSrc || "/placeholder.svg"}
          alt={`${divisionType === "naia" ? "NAIA" : `NCAA ${divisionType.toUpperCase().replace("D", "Division ")}`}`}
          width={width}
          height={height}
          className="object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  // Use text badges for other divisions or as fallback
  const badgeStyles = getBadgeStyles(divisionType)
  return (
    <Badge variant="outline" className={`${badgeStyles} font-semibold whitespace-nowrap ${fontSize} ${className}`}>
      {divisionText}
    </Badge>
  )
}

// Helper function to determine division type
function getDivisionType(normalizedDivision: string): "d1" | "d2" | "d3" | "naia" | "njcaa" | "unknown" {
  if (normalizedDivision.includes("i") && !normalizedDivision.includes("ii") && !normalizedDivision.includes("iii")) {
    return "d1"
  } else if (normalizedDivision.includes("ii") && !normalizedDivision.includes("iii")) {
    return "d2"
  } else if (normalizedDivision.includes("iii")) {
    return "d3"
  } else if (normalizedDivision.includes("1")) {
    return "d1"
  } else if (normalizedDivision.includes("2")) {
    return "d2"
  } else if (normalizedDivision.includes("3")) {
    return "d3"
  } else if (normalizedDivision.includes("naia")) {
    return "naia"
  } else if (
    normalizedDivision.includes("juco") ||
    normalizedDivision.includes("junior college") ||
    normalizedDivision.includes("njcaa")
  ) {
    return "njcaa"
  }
  return "unknown"
}

// Helper function to get division text
function getDivisionText(divisionType: "d1" | "d2" | "d3" | "naia" | "njcaa" | "unknown"): string {
  switch (divisionType) {
    case "d1":
      return "NCAA DI"
    case "d2":
      return "NCAA DII"
    case "d3":
      return "NCAA DIII"
    case "naia":
      return "NAIA"
    case "njcaa":
      return "NJCAA"
    default:
      return "Unknown"
  }
}

// Helper function to get badge styles
function getBadgeStyles(divisionType: "d1" | "d2" | "d3" | "naia" | "njcaa" | "unknown"): string {
  switch (divisionType) {
    case "d1":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "d2":
      return "bg-red-100 text-red-800 border-red-300"
    case "d3":
      return "bg-green-100 text-green-800 border-green-300"
    case "naia":
      return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case "njcaa":
      return "bg-purple-100 text-purple-800 border-purple-300"
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}
