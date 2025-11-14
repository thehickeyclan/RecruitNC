"use client"

import { Badge } from "@/components/ui/badge"

interface NCAADivisionBadgeProps {
  division: string
  size?: "sm" | "md" | "lg"
}

export function NCAADivisionBadge({ division, size = "md" }: NCAADivisionBadgeProps) {
  // Normalize the division format
  const normalizedDivision = division?.toLowerCase().trim() || ""

  // Determine which division (I, II, III, NAIA, JUCO)
  const divisionType = getDivisionType(normalizedDivision)
  const divisionText = getDivisionText(divisionType)

  // Use styled badges for consistent display
  const badgeStyles = getBadgeStyles(divisionType)

  return (
    <Badge variant="outline" className={`${badgeStyles} font-semibold whitespace-nowrap`}>
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
