"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SmartLogo } from "@/components/smart-logo"
import Image from "next/image"
import { useState } from "react"
import Link from "next/link"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface CommitmentCardWithSmartLogosProps {
  athlete: {
    id: string
    name: string
    graduationyear?: number
    graduation_year?: number
    weightclass?: number | string
    weight_class?: number | string
    college?: string
    highschool?: string
    high_school?: string
    wrestlingclub?: string
    wrestling_club?: string
    wrestlingClub?: string
    club?: string
    division?: string
    photourl?: string
    photo_url?: string
    image_url?: string
    achievements?: string[]
    gender?: string
  }
  showMatchInfo?: boolean
}

export function CommitmentCardWithSmartLogos({ athlete, showMatchInfo = false }: CommitmentCardWithSmartLogosProps) {
  const [imageError, setImageError] = useState(false)

  // Get the best available value for each field
  const getClubName = () => {
    const clubOptions = [athlete.wrestlingclub, athlete.club, athlete.wrestlingClub, athlete.wrestling_club].filter(
      Boolean,
    )
    return clubOptions[0] || null
  }

  const getHighSchoolName = () => {
    return athlete.highschool || athlete.high_school || null
  }

  const getGradYear = () => {
    return athlete.graduationyear || athlete.graduation_year || null
  }

  const getWeightClass = () => {
    return athlete.weightclass || athlete.weight_class || null
  }

  const getPhotoUrl = () => {
    return athlete.photourl || athlete.photo_url || athlete.image_url || null
  }

  const getDivisionColor = (division: string) => {
    const div = division?.toLowerCase() || ""
    if (div.includes("d1") || div.includes("division 1") || div.includes("division i")) return "bg-yellow-500"
    if (div.includes("d2") || div.includes("division 2") || div.includes("division ii")) return "bg-blue-500"
    if (div.includes("d3") || div.includes("division 3") || div.includes("division iii")) return "bg-green-500"
    if (div.includes("naia")) return "bg-purple-500"
    if (div.includes("njcaa") || div.includes("juco")) return "bg-orange-500"
    return "bg-gray-500"
  }

  const clubName = getClubName()
  const highSchoolName = getHighSchoolName()
  const gradYear = getGradYear()
  const weightClass = getWeightClass()
  const photoUrl = getPhotoUrl()

  const candidate = athlete
  const normalizedAthlete = normalizeAthlete(candidate)

  return (
    <Link href={`/athletes/${normalizedAthlete.id}`}>
      <Card className="w-full overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer">
        <CardContent className="p-0">
          {/* Athlete Photo */}
          <div className="relative h-48 bg-gray-100">
            {photoUrl && !imageError ? (
              <Image
                src={photoUrl || "/placeholder.svg"}
                alt={normalizedAthlete.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-blue-700 font-bold text-xl">
                      {normalizedAthlete.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  </div>
                  <p className="text-blue-600 text-sm font-medium">{normalizedAthlete.name}</p>
                </div>
              </div>
            )}

            {/* Division Badge */}
            {normalizedAthlete.division && (
              <div className="absolute top-2 right-2">
                <Badge className={`${getDivisionColor(normalizedAthlete.division)} text-white`}>
                  {normalizedAthlete.division}
                </Badge>
              </div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-4">
            {/* Athlete Name */}
            <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{normalizedAthlete.name}</h3>

            {/* Weight Class and Graduation Year */}
            <div className="flex justify-between items-center mb-3">
              {weightClass && (
                <Badge variant="outline" className="text-sm">
                  {weightClass} lbs
                </Badge>
              )}
              {gradYear && (
                <Badge variant="outline" className="text-sm">
                  Class of {gradYear}
                </Badge>
              )}
            </div>

            {/* College */}
            {normalizedAthlete.college && (
              <div className="flex items-center mb-2">
                <SmartLogo
                  entityName={normalizedAthlete.college}
                  entityType="college"
                  fallbackSrc="/generic-college-logo.png"
                  alt={`${normalizedAthlete.college} logo`}
                  width={24}
                  height={24}
                  className="mr-2 rounded"
                  showMatchInfo={showMatchInfo}
                />
                <span className="text-sm font-medium text-gray-700 line-clamp-1">{normalizedAthlete.college}</span>
              </div>
            )}

            {/* High School */}
            {highSchoolName && (
              <div className="flex items-center mb-2">
                <SmartLogo
                  entityName={highSchoolName}
                  entityType="highschool"
                  fallbackSrc="/high-school-logo.png"
                  alt={`${highSchoolName} logo`}
                  width={24}
                  height={24}
                  className="mr-2 rounded"
                  showMatchInfo={showMatchInfo}
                />
                <span className="text-sm text-gray-600 line-clamp-1">{highSchoolName}</span>
              </div>
            )}

            {/* Wrestling Club */}
            {clubName && (
              <div className="flex items-center">
                <SmartLogo
                  entityName={clubName}
                  entityType="club"
                  fallbackSrc="/wrestling-club-logo.png"
                  alt={`${clubName} logo`}
                  width={24}
                  height={24}
                  className="mr-2 rounded"
                  showMatchInfo={showMatchInfo}
                />
                <span className="text-sm text-gray-500 line-clamp-1">{clubName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default CommitmentCardWithSmartLogos
