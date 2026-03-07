"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { trackCardView } from "@/lib/analytics-enhanced"
import { EntityLogo } from "@/components/entity-logo"
import { DivisionPill } from "@/components/division-pill"
import Link from "next/link"

interface CommitmentCardProps {
  athlete: {
    id: string
    name: string
    graduation_year: number
    weight_class: string
    high_school: string
    club: string
    college: string
    division: string
    gender: "M" | "F"
    commitment_date: string
    image_url?: string
  }
}

export function CommitmentCardWithTracking({ athlete }: CommitmentCardProps) {
  // Track card view when component mounts and is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackCardView(athlete.id, athlete.name)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.5 },
    )

    const cardElement = document.getElementById(`card-${athlete.id}`)
    if (cardElement) {
      observer.observe(cardElement)
    }

    return () => observer.disconnect()
  }, [athlete.id, athlete.name])

  const handleCardClick = () => {
    // Track click event
    fetch("/api/track-card-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId: athlete.id,
        athleteName: athlete.name,
        eventType: "card_click",
      }),
    }).catch(console.error)
  }

  return (
    <Card
      id={`card-${athlete.id}`}
      className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <Link href={`/athletes/${athlete.id}`}>
        <CardContent className="p-0">
          {/* Athlete Image */}
          <div className="relative h-48 bg-gradient-to-br from-red-600 to-red-800">
            {athlete.image_url ? (
              <img
                src={athlete.image_url || "/placeholder.svg"}
                alt={athlete.name}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">
                    {athlete.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="text-sm opacity-75">No Photo</div>
                </div>
              </div>
            )}

            {/* Gender Badge */}
            <Badge variant="secondary" className="absolute top-2 right-2 bg-white/90 text-gray-800">
              {athlete.gender === "M" ? "Men's" : "Women's"}
            </Badge>
          </div>

          {/* Card Content */}
          <div className="p-4 space-y-3">
            {/* Athlete Name & Year */}
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-900">{athlete.name}</h3>
              <p className="text-sm text-gray-600">Class of {athlete.graduation_year}</p>
            </div>

            {/* Weight Class */}
            <div className="text-center">
              <Badge variant="outline" className="font-semibold">
                {athlete.weight_class} lbs
              </Badge>
            </div>

            {/* High School */}
            <div className="flex items-center justify-center space-x-2">
              <EntityLogo entityName={athlete.high_school} entityType="high_school" size="sm" />
              <span className="text-sm font-medium text-gray-700">{athlete.high_school}</span>
            </div>

            {/* Club (if different from high school) */}
            {athlete.club && athlete.club !== athlete.high_school && (
              <div className="flex items-center justify-center space-x-2">
                <EntityLogo entityName={athlete.club} entityType="club" size="sm" />
                <span className="text-xs text-gray-600">{athlete.club}</span>
              </div>
            )}

            {/* Commitment */}
            <div className="border-t pt-3">
              <div className="text-center mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Committed to</span>
              </div>

              <div className="flex items-center justify-center space-x-2 mb-2">
                <EntityLogo entityName={athlete.college} entityType="college" size="md" />
                <div className="text-center">
                  <div className="font-bold text-gray-900">{athlete.college}</div>
                  <DivisionPill division={athlete.division} size="sm" />
                </div>
              </div>

              <div className="text-center">
                <span className="text-xs text-gray-500">{new Date(athlete.commitment_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
