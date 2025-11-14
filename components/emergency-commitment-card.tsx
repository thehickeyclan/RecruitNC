"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import Image from "next/image"

interface EmergencyCommitmentCardProps {
  athlete: {
    id: string
    name: string
    graduationyear?: number
    weightclass?: number
    college?: string
    highschool?: string
    wrestlingClub?: string
    division?: string
    photourl?: string
  }
}

export function EmergencyCommitmentCard({ athlete }: EmergencyCommitmentCardProps) {
  const [logos, setLogos] = useState<{
    college?: string
    highschool?: string
    club?: string
  }>({})
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const fetchLogos = async () => {
      const logoResults: any = {}

      // Test college logo
      if (athlete.college) {
        try {
          const response = await fetch(`/api/logo-mappings/by-entity/college/${encodeURIComponent(athlete.college)}`)
          const data = await response.json()
          if (data.success && data.logo_url) {
            logoResults.college = data.logo_url
          }
        } catch (error) {
          console.error(`Failed to fetch college logo for ${athlete.college}:`, error)
        }
      }

      // Test high school logo
      if (athlete.highschool) {
        try {
          const response = await fetch(
            `/api/logo-mappings/by-entity/highschool/${encodeURIComponent(athlete.highschool)}`,
          )
          const data = await response.json()
          if (data.success && data.logo_url) {
            logoResults.highschool = data.logo_url
          }
        } catch (error) {
          console.error(`Failed to fetch highschool logo for ${athlete.highschool}:`, error)
        }
      }

      // Test club logo
      if (athlete.wrestlingClub) {
        try {
          const response = await fetch(`/api/logo-mappings/by-entity/club/${encodeURIComponent(athlete.wrestlingClub)}`)
          const data = await response.json()
          if (data.success && data.logo_url) {
            logoResults.club = data.logo_url
          }
        } catch (error) {
          console.error(`Failed to fetch club logo for ${athlete.wrestlingClub}:`, error)
        }
      }

      setLogos(logoResults)
    }

    fetchLogos()
  }, [athlete.college, athlete.highschool, athlete.wrestlingClub])

  const getDivisionColor = (division: string) => {
    const div = division?.toLowerCase() || ""
    if (div.includes("d1") || div.includes("division 1")) return "bg-yellow-500"
    if (div.includes("d2") || div.includes("division 2")) return "bg-blue-500"
    if (div.includes("d3") || div.includes("division 3")) return "bg-green-500"
    if (div.includes("naia")) return "bg-purple-500"
    if (div.includes("njcaa") || div.includes("juco")) return "bg-orange-500"
    return "bg-gray-500"
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0">
        {/* Athlete Photo */}
        <div className="relative h-48 bg-gray-100">
          {athlete.photourl && !imageError ? (
            <Image
              src={athlete.photourl || "/placeholder.svg"}
              alt={athlete.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-xl">
                    {athlete.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <p className="text-blue-600 text-sm font-medium">{athlete.name}</p>
              </div>
            </div>
          )}

          {/* Division Badge */}
          {athlete.division && (
            <div className="absolute top-2 right-2">
              <Badge className={`${getDivisionColor(athlete.division)} text-white`}>{athlete.division}</Badge>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Athlete Name */}
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{athlete.name}</h3>

          {/* Weight Class and Graduation Year */}
          <div className="flex justify-between items-center mb-3">
            {athlete.weightclass && (
              <Badge variant="outline" className="text-sm">
                {athlete.weightclass} lbs
              </Badge>
            )}
            {athlete.graduationyear && (
              <Badge variant="outline" className="text-sm">
                Class of {athlete.graduationyear}
              </Badge>
            )}
          </div>

          {/* College with Logo */}
          {athlete.college && (
            <div className="flex items-center mb-2">
              {logos.college ? (
                <Image
                  src={logos.college || "/placeholder.svg"}
                  alt={`${athlete.college} logo`}
                  width={20}
                  height={20}
                  className="mr-2 rounded object-contain"
                />
              ) : (
                <div className="w-5 h-5 bg-gray-300 rounded mr-2"></div>
              )}
              <span className="text-sm font-medium text-gray-700 line-clamp-1">{athlete.college}</span>
            </div>
          )}

          {/* High School with Logo */}
          {athlete.highschool && (
            <div className="flex items-center mb-2">
              {logos.highschool ? (
                <Image
                  src={logos.highschool || "/placeholder.svg"}
                  alt={`${athlete.highschool} logo`}
                  width={20}
                  height={20}
                  className="mr-2 rounded object-contain"
                />
              ) : (
                <div className="w-5 h-5 bg-gray-300 rounded mr-2"></div>
              )}
              <span className="text-sm text-gray-600 line-clamp-1">{athlete.highschool}</span>
            </div>
          )}

          {/* Wrestling Club with Logo */}
          {athlete.wrestlingClub && (
            <div className="flex items-center">
              {logos.club ? (
                <Image
                  src={logos.club || "/placeholder.svg"}
                  alt={`${athlete.wrestlingClub} logo`}
                  width={20}
                  height={20}
                  className="mr-2 rounded object-contain"
                />
              ) : (
                <div className="w-5 h-5 bg-gray-300 rounded mr-2"></div>
              )}
              <span className="text-sm text-gray-500 line-clamp-1">{athlete.wrestlingClub}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
