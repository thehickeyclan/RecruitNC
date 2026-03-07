import Image from "next/image"
import { Card } from "@/components/ui/card"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  weightclass: string
  wrestlingClub?: string
  achievements?: string[]
}

interface CommitmentCardProps {
  athlete: Athlete
}

export function CommitmentCardSimple({ athlete }: CommitmentCardProps) {
  // Determine division badge color
  const getDivisionBadgeClass = (division: string) => {
    if (division.includes("Division I")) return "bg-blue-600 text-white"
    if (division.includes("Division II")) return "bg-purple-600 text-white"
    if (division.includes("Division III")) return "bg-blue-400 text-white"
    if (division.includes("NAIA")) return "bg-yellow-500 text-blue-900"
    if (division.includes("NJCAA")) return "bg-red-600 text-white"
    return "bg-gray-600 text-white"
  }

  // Determine achievement badge color
  const getAchievementBadgeClass = (achievement: string) => {
    if (achievement.includes("State Champion") || achievement.includes("1st"))
      return "bg-yellow-500 text-yellow-900 border border-yellow-600"
    if (achievement.includes("State Runner") || achievement.includes("2nd") || achievement.includes("State 2nd"))
      return "bg-gray-400 text-gray-900 border border-gray-500"
    if (achievement.includes("3rd") || achievement.includes("State 3rd"))
      return "bg-amber-600 text-amber-100 border border-amber-700"
    if (
      achievement.includes("State Placer") ||
      achievement.includes("4th") ||
      achievement.includes("State 4th") ||
      achievement.includes("5th") ||
      achievement.includes("State 5th") ||
      achievement.includes("6th") ||
      achievement.includes("State 6th") ||
      achievement.includes("7th") ||
      achievement.includes("State 7th") ||
      achievement.includes("8th") ||
      achievement.includes("State 8th")
    )
      return "bg-purple-500 text-purple-100 border border-purple-600"
    if (achievement.includes("Regional Champion")) return "bg-green-600 text-green-100 border border-green-700"
    return "bg-blue-500 text-blue-100 border border-blue-600"
  }

  // Default achievements if none provided
  const defaultAchievements = athlete.achievements || []

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="relative h-64 w-full">
        <Image
          src={athlete.photourl || "/wrestler-silhouette.png"}
          alt={athlete.name}
          fill
          className="object-cover object-top"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/wrestler-silhouette.png"
          }}
        />
        <div className="absolute top-3 right-3 z-10">
          <Image src="/nc-united-main-logo.png" alt="NC United" width={40} height={40} className="object-contain" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h2 className="text-2xl font-black mb-2 text-white drop-shadow-lg">{athlete.name.toUpperCase()}</h2>
          <p className="text-sm text-white/90 mb-1">{athlete.highschool}</p>
          <div className="text-xl font-bold text-white drop-shadow-lg">{athlete.college.toUpperCase()}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`px-3 py-1 rounded-md text-sm font-medium ${getDivisionBadgeClass(athlete.division)}`}>
            {athlete.division}
          </span>
          <span className="text-gray-700 font-medium">{athlete.weightclass}</span>
        </div>
        <p className="text-gray-600 mb-1">Class of {athlete.graduationyear}</p>
        {athlete.wrestlingClub && <p className="text-blue-600 font-medium mb-3">{athlete.wrestlingClub}</p>}

        {defaultAchievements.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {defaultAchievements.map((achievement, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-md text-sm font-medium ${getAchievementBadgeClass(achievement)}`}
              >
                {achievement}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
