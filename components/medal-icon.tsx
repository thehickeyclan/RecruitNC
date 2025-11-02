interface MedalIconProps {
  rank: number
  size?: "sm" | "md" | "lg"
}

export function MedalIcon({ rank, size = "md" }: MedalIconProps) {
  let color = ""
  let label = ""
  let sizeClass = ""
  let fontSize = ""

  switch (rank) {
    case 1:
      color = "bg-yellow-500" // Gold
      label = "Gold"
      break
    case 2:
      color = "bg-gray-300" // Silver
      label = "Silver"
      break
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
      color = "bg-amber-700" // Bronze for 3rd-8th place
      label = "Bronze"
      break
    default:
      return null
  }

  switch (size) {
    case "sm":
      sizeClass = "w-6 h-6"
      fontSize = "text-xs"
      break
    case "lg":
      sizeClass = "w-10 h-10"
      fontSize = "text-lg"
      break
    default:
      sizeClass = "w-8 h-8"
      fontSize = "text-sm"
  }

  return (
    <div
      className={`absolute -top-3 -right-3 ${color} rounded-full flex items-center justify-center ${sizeClass} shadow-md border-2 border-white`}
      title={`${label} Medal`}
    >
      <span className={`font-bold text-white ${fontSize}`}>{rank}</span>
    </div>
  )
}
