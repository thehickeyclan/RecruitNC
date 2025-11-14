"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { SmartLogo } from "./smart-logo"

interface SmartFlipCardProps {
  athlete: {
    id: string
    name: string
    graduation_year?: number
    graduationyear?: number
    weight_class?: string
    weightclass?: string
    college?: string
    high_school?: string
    highschool?: string
    wrestling_club?: string
    wrestlingclub?: string
    club?: string
    college_division?: string
    division?: string
    gender?: string
    image_url?: string
    photourl?: string
    commitment_date?: string
  }
  className?: string
}

export function SmartFlipCard({ athlete, className = "" }: SmartFlipCardProps) {
  const [imageError, setImageError] = useState(false)

  // Handle different prop name variations
  const graduationYear = athlete.graduation_year || athlete.graduationyear || 2024
  const weightClass = athlete.weight_class || athlete.weightclass
  const highSchool = athlete.high_school || athlete.highschool || "Unknown High School"
  const wrestlingClub = athlete.wrestling_club || athlete.wrestlingclub || athlete.club
  const imageUrl = athlete.image_url || athlete.photourl
  const division = athlete.college_division || athlete.division

  const getImageUrl = () => {
    if (imageError || !imageUrl) {
      return athlete.gender === "Female"
        ? "/placeholder.svg?height=300&width=300&text=Female+Wrestler"
        : "/placeholder.svg?height=300&width=300&text=Male+Wrestler"
    }
    return imageUrl
  }

  return (
    <div className={`commitment-card ${className}`}>
      <div className="commitment-card-inner">
        {/* Front of card */}
        <div className="commitment-card-front">
          <div className="relative h-64 bg-gradient-to-br from-blue-50 to-red-50">
            <img
              src={getImageUrl() || "/placeholder.svg"}
              alt={athlete.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-white/90">
                Class of {graduationYear}
              </Badge>
            </div>
            {weightClass && (
              <div className="absolute top-2 left-2">
                <Badge variant="outline" className="bg-white/90">
                  {weightClass} lbs
                </Badge>
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="font-bold text-lg mb-2 text-center text-white">{athlete.name}</h3>

            <div className="space-y-2">
              {athlete.college && (
                <div className="flex items-center gap-2">
                  <SmartLogo
                    entityName={athlete.college}
                    entityType="college"
                    fallbackSrc="/generic-college-logo.png"
                    alt={`${athlete.college} logo`}
                    width={24}
                    height={24}
                  />
                  <div>
                    <p className="font-semibold text-sm text-white">{athlete.college}</p>
                    {division && <p className="text-xs text-gray-200">{division}</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <SmartLogo
                  entityName={highSchool}
                  entityType="highschool"
                  fallbackSrc="/high-school-logo.png"
                  alt={`${highSchool} logo`}
                  width={20}
                  height={20}
                />
                <p className="text-sm text-gray-200">{highSchool}</p>
              </div>

              {wrestlingClub && wrestlingClub !== "Unknown" && wrestlingClub !== "" && (
                <div className="flex items-center gap-2">
                  <SmartLogo
                    entityName={wrestlingClub}
                    entityType="club"
                    fallbackSrc="/wrestling-club-logo.png"
                    alt={`${wrestlingClub} logo`}
                    width={20}
                    height={20}
                  />
                  <p className="text-sm text-gray-200">{wrestlingClub}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div className="commitment-card-back">
          <div className="p-6 h-full flex flex-col justify-center">
            <h3 className="font-bold text-xl mb-4 text-center text-white">{athlete.name}</h3>

            <div className="space-y-4">
              {athlete.college && (
                <div className="flex items-center gap-3">
                  <SmartLogo
                    entityName={athlete.college}
                    entityType="college"
                    fallbackSrc="/generic-college-logo.png"
                    alt={`${athlete.college} logo`}
                    width={28}
                    height={28}
                  />
                  <div>
                    <p className="font-semibold text-white">{athlete.college}</p>
                    {division && <p className="text-sm text-gray-200">{division}</p>}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <SmartLogo
                  entityName={highSchool}
                  entityType="highschool"
                  fallbackSrc="/high-school-logo.png"
                  alt={`${highSchool} logo`}
                  width={24}
                  height={24}
                />
                <p className="text-white">{highSchool}</p>
              </div>

              {wrestlingClub && wrestlingClub !== "Unknown" && wrestlingClub !== "" && (
                <div className="flex items-center gap-3">
                  <SmartLogo
                    entityName={wrestlingClub}
                    entityType="club"
                    fallbackSrc="/wrestling-club-logo.png"
                    alt={`${wrestlingClub} logo`}
                    width={24}
                    height={24}
                  />
                  <div>
                    <p className="text-white font-medium">{wrestlingClub}</p>
                    <p className="text-sm text-gray-200">Wrestling Club</p>
                  </div>
                </div>
              )}

              {weightClass && (
                <div className="text-center mt-4">
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                    {weightClass} lbs • Class of {graduationYear}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
