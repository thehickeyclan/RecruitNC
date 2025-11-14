import { Badge } from "@/components/ui/badge"

interface DivisionPillProps {
  division: string | null | undefined
  className?: string
}

export function DivisionPillV3({ division, className = "" }: DivisionPillProps) {
  // Default to "Unknown" if no division is provided
  const divisionText = division || "Unknown"

  // Determine the color based on the division
  let color = "bg-gray-200 text-gray-800" // Default for unknown

  if (divisionText.includes("Division I") || divisionText.includes("D1") || divisionText.includes("DI")) {
    color = "bg-red-100 text-red-800 border-red-200"
  } else if (divisionText.includes("Division II") || divisionText.includes("D2") || divisionText.includes("DII")) {
    color = "bg-blue-100 text-blue-800 border-blue-200"
  } else if (divisionText.includes("Division III") || divisionText.includes("D3") || divisionText.includes("DIII")) {
    color = "bg-green-100 text-green-800 border-green-200"
  } else if (divisionText.includes("NAIA")) {
    color = "bg-purple-100 text-purple-800 border-purple-200"
  } else if (divisionText.includes("NJCAA") || divisionText.includes("JUCO")) {
    color = "bg-amber-100 text-amber-800 border-amber-200"
  }

  return (
    <Badge variant="outline" className={`${color} ${className} font-medium border`}>
      {divisionText}
    </Badge>
  )
}
