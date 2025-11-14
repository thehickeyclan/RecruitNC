"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw, ExternalLink } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"
import { EntityLogo } from "@/components/entity-logo"

interface Athlete {
  id: string
  name: string
  graduation_year: number
  weight_class: string
  high_school: string
  club?: string
  college?: string
  image_url?: string
  achievements?: string[]
  stats?: {
    wins?: number
    losses?: number
    record?: string
  }
}

interface BaseballCardProps {
  athlete: Athlete
  className?: string
}

export function BaseballCardStyle({ athlete, className = "" }: BaseballCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const achievements = athlete.achievements || []
  const stats = athlete.stats || {}

  console.log(`🎯 BaseballCard rendering for ${athlete.name}:`, {
    high_school: athlete.high_school,
    club: athlete.club,
    college: athlete.college,
    image_url: athlete.image_url,
  })

  return (
    <div className={`perspective-1000 ${className}`}>
      <div
        className={`relative w-full h-[400px] transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front of Card */}
        <Card className="absolute inset-0 backface-hidden bg-gradient-to-br from-nc-blue via-slate-800 to-nc-red border-2 border-nc-gold shadow-2xl">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Header with graduation year */}
            <div className="bg-nc-gold text-nc-blue px-4 py-2 text-center font-bold text-lg">
              Class of {athlete.graduation_year}
            </div>

            {/* Main content area */}
            <div className="flex-1 p-4 flex flex-col">
              {/* Athlete photo */}
              <div className="flex-1 flex items-center justify-center mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-nc-gold shadow-lg bg-white">
                  <Image
                    src={athlete.image_url || "/wrestler-silhouette.png"}
                    alt={athlete.name}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/wrestler-silhouette.png"
                    }}
                  />
                </div>
              </div>

              {/* Athlete name */}
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-1">{athlete.name}</h2>
                <Badge variant="secondary" className="bg-nc-gold text-nc-blue font-semibold">
                  {athlete.weight_class} lbs
                </Badge>
              </div>

              {/* Quick stats */}
              {stats.record && (
                <div className="text-center mb-4">
                  <div className="bg-white/10 rounded-lg p-2">
                    <span className="text-nc-gold font-bold text-lg">{stats.record}</span>
                    <div className="text-white text-sm">Season Record</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-black/20 p-3 text-center">
              <Button
                onClick={handleFlip}
                variant="ghost"
                size="sm"
                className="text-nc-gold hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Flip Card
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back of Card */}
        <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-slate-800 via-nc-blue to-slate-900 border-2 border-nc-gold shadow-2xl">
          <CardContent className="p-0 h-full flex flex-col">
            {/* Header */}
            <div className="bg-nc-gold text-nc-blue px-4 py-2 text-center font-bold">
              {athlete.name} - Wrestling Profile
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* School Information */}
              <div className="space-y-3">
                {/* High School - ALWAYS SHOW */}
                <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                  <div className="flex-shrink-0">
                    <EntityLogo category="highschool" name={athlete.high_school} size="sm" className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm">High School</div>
                    <div className="text-nc-gold text-sm font-semibold truncate">{athlete.high_school}</div>
                  </div>
                </div>

                {/* Wrestling Club - ONLY IF EXISTS */}
                {athlete.club && athlete.club.trim() && (
                  <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <EntityLogo category="club" name={athlete.club} size="sm" className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm">Wrestling Club</div>
                      <div className="text-nc-gold text-sm font-semibold truncate">{athlete.club}</div>
                    </div>
                  </div>
                )}

                {/* College Commitment - ONLY IF EXISTS */}
                {athlete.college && athlete.college.trim() && (
                  <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <EntityLogo category="college" name={athlete.college} size="sm" className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm">College Commitment</div>
                      <div className="text-nc-gold text-sm font-semibold truncate">{athlete.college}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Achievements */}
              {achievements.length > 0 && (
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">Achievements</h3>
                  <div className="space-y-1">
                    {achievements.slice(0, 3).map((achievement, index) => (
                      <div key={index} className="text-nc-gold text-xs bg-white/5 rounded p-2">
                        • {achievement}
                      </div>
                    ))}
                    {achievements.length > 3 && (
                      <div className="text-white/60 text-xs text-center">
                        +{achievements.length - 3} more achievements
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              {(stats.wins !== undefined || stats.losses !== undefined) && (
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">Season Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {stats.wins !== undefined && (
                      <div className="bg-green-500/20 rounded p-2 text-center">
                        <div className="text-green-400 font-bold text-lg">{stats.wins}</div>
                        <div className="text-white text-xs">Wins</div>
                      </div>
                    )}
                    {stats.losses !== undefined && (
                      <div className="bg-red-500/20 rounded p-2 text-center">
                        <div className="text-red-400 font-bold text-lg">{stats.losses}</div>
                        <div className="text-white text-xs">Losses</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-black/20 p-3 flex justify-between items-center">
              <Button
                onClick={handleFlip}
                variant="ghost"
                size="sm"
                className="text-nc-gold hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Flip Back
              </Button>
              <Link href={`/athletes/${athlete.id}`}>
                <Button variant="ghost" size="sm" className="text-nc-gold hover:text-white hover:bg-white/10">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Full Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Also export as default for backward compatibility
export default BaseballCardStyle
