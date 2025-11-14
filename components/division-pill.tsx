export function DivisionPill({ division }: { division: string | null | undefined }) {
  if (!division) {
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">Unknown</span>
  }

  const normalizedDivision = division.toLowerCase()

  let bgColor = "bg-gray-200"
  let textColor = "text-gray-700"

  if (normalizedDivision.includes("ncaa")) {
    bgColor = "bg-blue-200"
    textColor = "text-blue-700"
  } else if (normalizedDivision.includes("nhl")) {
    bgColor = "bg-orange-200"
    textColor = "text-orange-700"
  } else if (normalizedDivision.includes("nfl")) {
    bgColor = "bg-red-200"
    textColor = "text-red-700"
  } else if (normalizedDivision.includes("mlb")) {
    bgColor = "bg-green-200"
    textColor = "text-green-700"
  } else if (normalizedDivision.includes("mls")) {
    bgColor = "bg-purple-200"
    textColor = "text-purple-700"
  }

  return <span className={`px-2 py-1 text-xs rounded-full ${bgColor} ${textColor}`}>{division}</span>
}
