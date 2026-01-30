"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink, Star } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface Athlete {
  id: string
  name: string
  highschool: string
  weight_display: string
  state_championship_summary: string
  nhsca_record_display: string | null
  super_32_record_display: string | null
  has_ranked_win: boolean
  academic_gpa: number | null
  prospect_ranking: number
  photourl?: string
  nationally_ranked_wins?: string | number
  bio_headline?: string
}

interface RankingsCardViewProps {
  athletes: Athlete[]
  loading?: boolean
  showRankBadges?: boolean
  showAdditionalDivider?: boolean
}

export function RankingsCardView({
  athletes,
  loading,
  showRankBadges = true,
  showAdditionalDivider = true,
}: RankingsCardViewProps) {
  const { user, profile, isAdmin, isVerifiedCoach } = useAuth()
  const [canSeeWatchList, setCanSeeWatchList] = useState(false)
  const [starredAthletes, setStarredAthletes] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkCoachStatus = async () => {
      console.log("[v0] Card view - Checking coach status for star visibility")
      if (!user || !profile) {
        console.log("[v0] Card view - No user or profile found")
        setCanSeeWatchList(false)
        return
      }

      const canSeeStars = isAdmin || isVerifiedCoach
      console.log(
        "[v0] Card view - Auth context - isAdmin:",
        isAdmin,
        "isVerifiedCoach:",
        isVerifiedCoach,
        "canSeeStars:",
        canSeeStars,
      )
      setCanSeeWatchList(canSeeStars)

      if (canSeeStars) {
        console.log("[v0] Card view - Fetching starred athletes")
        try {
          const starredResponse = await fetch("/api/coaches/starred-athletes")
          if (starredResponse.ok) {
            const starredData = await starredResponse.json()
            console.log("[v0] Card view - Starred athletes data:", starredData)
            const starredIds = new Set(starredData.athletes?.map((a: any) => a.athlete_id) || [])
            console.log("[v0] Card view - Starred athlete IDs:", Array.from(starredIds))
            setStarredAthletes(starredIds)
          }
        } catch (error) {
          console.error("[v0] Card view - Error fetching starred athletes:", error)
        }
      }
    }

    checkCoachStatus()
  }, [user, profile, isAdmin, isVerifiedCoach])

  const handleStarToggle = async (athleteId: string, e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation to profile
    e.stopPropagation()

    if (starringInProgress.has(athleteId)) return

    setStarringInProgress((prev) => new Set(prev).add(athleteId))

    try {
      const response = await fetch("/api/coach-portal/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId }),
      })

      if (response.ok) {
        const data = await response.json()
        setStarredAthletes((prev) => {
          const newSet = new Set(prev)
          if (data.action === "added") {
            newSet.add(athleteId)
          } else {
            newSet.delete(athleteId)
          }
          return newSet
        })
      }
    } catch (error) {
      console.error("Error toggling star:", error)
    } finally {
      setStarringInProgress((prev) => {
        const newSet = new Set(prev)
        newSet.delete(athleteId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-3"></div>
              <div className="h-16 bg-gray-200 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {athletes.map((athlete, index) => (
        <>
          {showAdditionalDivider &&
            athlete.prospect_ranking === 30 &&
            athletes.some((a) => a.prospect_ranking > 30) && (
              <div key={`divider-${athlete.id}`} className="col-span-full my-6">
                <div className="flex items-center justify-center gap-3 py-4 rounded-lg bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50">
                  <div className="h-px bg-gray-300 flex-1 max-w-md"></div>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">
                    Additional Ranked Prospects
                  </span>
                  <div className="h-px bg-gray-300 flex-1 max-w-md"></div>
                </div>
              </div>
            )}
          <Card
            key={athlete.id}
          className="hover:shadow-lg transition-all duration-200 border border-gray-200 bg-white rounded-lg overflow-hidden cursor-pointer"
        >
          <Link href={`/unified-profile/${athlete.id}`}>
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  {showRankBadges && athlete.prospect_ranking <= 30 && (
                    <Badge className="bg-blue-600 text-white font-bold text-base px-2.5 py-1">
                      #{athlete.prospect_ranking}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    {canSeeWatchList && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleStarToggle(athlete.id, e)}
                        disabled={starringInProgress.has(athlete.id)}
                        className="h-7 w-7 p-0 hover:bg-white/50"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            starredAthletes.has(athlete.id) ? "fill-[#D3B574] text-[#D3B574]" : "text-gray-400"
                          }`}
                        />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-white">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Athlete info with photo */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0">
                    {athlete.photourl ? (
                      <img
                        src={athlete.photourl || "/placeholder.svg"}
                        alt={athlete.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          e.currentTarget.src = "/diverse-wrestlers.png"
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-bold text-sm">
                          {athlete.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1 hover:text-[#D3B574] transition-colors">
                      {athlete.name}
                    </h3>
                    <p className="text-gray-600 font-medium text-sm mb-1">{athlete.highschool}</p>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {athlete.weight_display} lbs
                    </Badge>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Tap to view full profile & achievements</span>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
        </>
      ))}

      {athletes.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          <p>No rankings available for the selected filters.</p>
        </div>
      )}
    </div>
  )
}
