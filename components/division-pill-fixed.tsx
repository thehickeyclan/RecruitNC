import { cn } from "@/lib/utils"

interface DivisionPillProps {
  division: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function DivisionPill({ division, size = "md", className }: DivisionPillProps) {
  // Safety check for null/undefined division
  if (!division) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border font-medium",
          "text-xs px-2.5 py-1",
          "bg-gray-100 text-gray-800 border-gray-200",
          className,
        )}
      >
        Unknown
      </span>
    )
  }

  // Normalize division string to handle variations
  const normalizedDivision = division.toLowerCase().trim()

  // Determine background color and display text based on division
  let bgColor = "bg-gray-100 text-gray-800 border-gray-200" // Default
  let displayText = division // Default to original text

  // NCAA Division I / D1
  if (
    normalizedDivision === "ncaa di" ||
    normalizedDivision === "ncaa d1" ||
    normalizedDivision === "division i" ||
    normalizedDivision === "division 1" ||
    normalizedDivision === "di" ||
    normalizedDivision === "d1" ||
    normalizedDivision === "ncaa division i"
  ) {
    bgColor = "bg-blue-100 text-blue-800 border-blue-300"
    displayText = "NCAA DI"
  }
  // NCAA Division II / D2
  else if (
    normalizedDivision === "ncaa dii" ||
    normalizedDivision === "ncaa d2" ||
    normalizedDivision === "division ii" ||
    normalizedDivision === "division 2" ||
    normalizedDivision === "dii" ||
    normalizedDivision === "d2" ||
    normalizedDivision === "ncaa division ii"
  ) {
    bgColor = "bg-green-100 text-green-800 border-green-300"
    displayText = "NCAA DII"
  }
  // NCAA Division III / D3
  else if (
    normalizedDivision === "ncaa diii" ||
    normalizedDivision === "ncaa d3" ||
    normalizedDivision === "division iii" ||
    normalizedDivision === "division 3" ||
    normalizedDivision === "diii" ||
    normalizedDivision === "d3" ||
    normalizedDivision === "ncaa division iii"
  ) {
    bgColor = "bg-purple-100 text-purple-800 border-purple-300"
    displayText = "NCAA DIII"
  }
  // NAIA
  else if (normalizedDivision === "naia") {
    bgColor = "bg-orange-100 text-orange-800 border-orange-300"
    displayText = "NAIA"
  }
  // NJCAA / JUCO
  else if (normalizedDivision === "njcaa" || normalizedDivision === "juco" || normalizedDivision === "junior college") {
    bgColor = "bg-teal-100 text-teal-800 border-teal-300"
    displayText = "NJCAA"
  }

  // Determine text size based on size prop
  let textSize = "text-xs"
  let paddingSize = "px-2.5 py-1"

  if (size === "sm") {
    textSize = "text-xs"
    paddingSize = "px-2 py-0.5"
  } else if (size === "lg") {
    textSize = "text-sm"
    paddingSize = "px-3 py-1.5"
  }

  // For debugging
  console.log(`Division: "${division}", Normalized: "${normalizedDivision}", Display: "${displayText}"`)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        textSize,
        paddingSize,
        bgColor,
        className,
      )}
      title={division} // Add title attribute for hover tooltip
    >
      {displayText}
    </span>
  )
}
