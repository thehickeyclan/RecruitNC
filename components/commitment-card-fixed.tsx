"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FixedEntityLogo } from "@/components/fixed-entity-logo"
import { AthleteImage } from "@/components/athlete-image"
import Link from "next/link"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface CommitmentCardFixedProps {
  athlete: {
    id: string
    name: string
    graduationyear: number
    college: string
    division: string
    weightclass: number
    highschool: string
    wrestlingClub?: string
    photourl?: string
    achievements?: string[]
  }
}

export function CommitmentCardFixed(props: any) {
  const candidate = props?.athlete ?? props?.data ?? props
  const athlete = normalizeAthlete(candidate)

  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  const getDivisionColor = (division: string) => {
    const div = division?.toLowerCase() || ""
    if (div.includes("d1") || div.includes("division 1")) return "bg-yellow-500"
    if (div.includes("d2") || div.includes("division 2")) return "bg-blue-500"
    if (div.includes("d3") || div.includes("division 3")) return "bg-green-500"
    if (div.includes("naia")) return "bg-purple-500"
    if (div.includes("njcaa") || div.includes("juco")) return "bg-orange-500"
    return "bg-gray-500"
  }

  if (isFlipped) {
    // Back of card
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-[400px]">
        <CardContent className="p-6 h-full flex flex-col">
          {/* Back Button */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-900">{athlete.name}</h3>
            <Button onClick={handleFlip} variant="outline" size="sm" className="text-xs bg-transparent">
              Back
            </Button>
          </div>

          {/* College Commitment Section */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">COLLEGE COMMITMENT</h4>
            <div className="flex items-center mb-2">
              <FixedEntityLogo entityType="college" entityName={athlete.college} size="md" className="mr-3 rounded" />
              <div>
                <div className="font-medium text-gray-900">{athlete.college}</div>
                <div className="text-sm text-gray-600">{athlete.division}</div>
                <div className="text-sm text-gray-600">Weight Class: {athlete.weightclass} lbs</div>
              </div>
            </div>
          </div>

          {/* Athlete Info Section */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">ATHLETE INFO</h4>

            {/* High School */}
            <div className="flex items-center mb-3">
              <FixedEntityLogo
                entityType="highschool"
                entityName={athlete.highschool}
                size="sm"
                className="mr-2 rounded"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">{athlete.highschool}</div>
                <div className="text-xs text-gray-500">High School</div>
              </div>
            </div>

            {/* Wrestling Club */}
            {athlete.wrestlingClub && (
              <div className="flex items-center mb-3">
                <FixedEntityLogo
                  entityType="club"
                  entityName={athlete.wrestlingClub}
                  size="sm"
                  className="mr-2 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">{athlete.wrestlingClub}</div>
                  <div className="text-xs text-gray-500">Wrestling Club</div>
                </div>
              </div>
            )}
          </div>

          {/* View Profile Link - replaces debug section */}
          <div className="mt-auto">
            <Link href={`/athletes/${athlete.id}`}>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">View Full Profile</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Front of card
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-[400px]">
      <CardContent className="p-0 h-full">
        {/* Athlete Photo */}
        <div className="relative h-48 bg-gray-100">
          <AthleteImage src={athlete.photourl} alt={athlete.name} fill className="object-cover" />

          {/* Division Badge */}
          <div className="absolute top-2 right-2">
            <Badge className={`${getDivisionColor(athlete.division)} text-white`}>{athlete.division}</Badge>
          </div>

          {/* Info Button */}
          <div className="absolute bottom-2 right-2">
            <Button onClick={handleFlip} size="sm" className="bg-black/70 hover:bg-black/90 text-white text-xs">
              Info
            </Button>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 flex flex-col h-[calc(100%-12rem)]">
          {/* Athlete Name */}
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{athlete.name}</h3>

          {/* Weight Class and Graduation Year */}
          <div className="flex justify-between items-center mb-3">
            <Badge variant="outline" className="text-sm">
              {athlete.weightclass} lbs
            </Badge>
            <Badge variant="outline" className="text-sm">
              Class of {athlete.graduationyear}
            </Badge>
          </div>

          {/* College with Logo */}
          <div className="flex items-center mb-2">
            <FixedEntityLogo entityType="college" entityName={athlete.college} size="sm" className="mr-2 rounded" />
            <span className="text-sm font-medium text-gray-700 line-clamp-1">{athlete.college}</span>
          </div>

          {/* High School with Logo */}
          <div className="flex items-center mb-2">
            <FixedEntityLogo
              entityType="highschool"
              entityName={athlete.highschool}
              size="sm"
              className="mr-2 rounded"
            />
            <span className="text-sm text-gray-600 line-clamp-1">{athlete.highschool}</span>
          </div>

          {/* Wrestling Club with Logo */}
          {athlete.wrestlingClub && (
            <div className="flex items-center">
              <FixedEntityLogo
                entityType="club"
                entityName={athlete.wrestlingClub}
                size="sm"
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-500 line-clamp-1">{athlete.wrestlingClub}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default CommitmentCardFixed
