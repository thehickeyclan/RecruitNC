"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink, Star } from "lucide-react"
import { MessageAthleteButton } from "@/components/messaging/message-athlete-button"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { isValidProfileId } from "@/lib/profile-id"

interface Athlete {
  id?: string
  name: string
  highschool: string
  high_school_division?: string | null
  weight_display: string
  state_championship_summary: string
  nhsca_record_display: string | null
  super_32_record_display: string | null
  has_ranked_win: boolean
  academic_gpa: number | null
  prospect_ranking?: number | null
  rank_display?: string
  photourl?: string
  nationally_ranked_wins?: string | number
  bio_headline?: string
}

interface RankingsCardViewProps {
  athletes: Athlete[]
  loading?: boolean
  showRankBadges?: boolean
  showAdditionalDivider?: boolean
  theme?: "light" | "dark"
}

export function RankingsCardView({
  athletes,
  loading,
  showRankBadges = true,
  showAdditionalDivider = true,
  theme = "light",
}: RankingsCardViewProps) {
  const isDark = theme === "dark"
  const { user, profile, isAdmin, isCoach } = useAuth()
  const [canSeeWatchList, setCanSeeWatchList] = useState(false)
  const [starredAthletes, setStarredAthletes] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkCoachStatus = async () => {
      console.log("[v0] Card view - Checking coach status for star visibility (myrecruits funnel)")
      if (!user || !profile) {
        console.log("[v0] Card view - No user or profile found")
        setCanSeeWatchList(false)
        return
      }

      const canSeeStars = isAdmin || isCoach
      console.log(
        "[v0] Card view - Auth context - isAdmin:",
        isAdmin,
        "isCoach:",
        isCoach,
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
  }, [user, profile, isAdmin, isCoach])

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
          <Card
            key={i}
            className={`animate-pulse ${isDark ? "border-white/10 bg-[#0f1c2e]" : ""}`}
          >
            <CardContent className="p-4">
              <div className={`h-4 rounded mb-3 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
              <div className={`h-16 rounded mb-3 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
              <div className="space-y-2">
                <div className={`h-3 rounded ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                <div className={`h-3 rounded w-3/4 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
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
            (athlete.prospect_ranking ?? 0) === 30 &&
            athletes.some((a) => (a.prospect_ranking ?? 0) > 30) && (
              <div key={`divider-${athlete.id}`} className="col-span-full my-6">
                <div
                  className={`flex items-center justify-center gap-3 py-4 rounded-lg ${
                    isDark
                      ? "bg-gradient-to-r from-white/5 via-white/10 to-white/5"
                      : "bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50"
                  }`}
                >
                  <div className={`h-px flex-1 max-w-md ${isDark ? "bg-white/20" : "bg-gray-300"}`} />
                  <span
                    className={`text-sm font-semibold uppercase tracking-wider px-4 ${
                      isDark ? "text-white/50" : "text-gray-500"
                    }`}
                  >
                    Additional Ranked Prospects
                  </span>
                  <div className={`h-px flex-1 max-w-md ${isDark ? "bg-white/20" : "bg-gray-300"}`} />
                </div>
              </div>
            )}
          <Card
            key={athlete.id ?? `athlete-${index}`}
            className={`transition-all duration-200 rounded-lg overflow-hidden cursor-pointer ${
              isDark
                ? "border border-white/10 bg-[#0f1c2e] hover:border-[#D3B574]/40 hover:shadow-lg hover:shadow-black/20"
                : "hover:shadow-lg border border-gray-200 bg-white"
            }`}
          >
            <CardContent className="p-0">
              <div
                className={`p-3 border-b ${
                  isDark
                    ? "bg-gradient-to-r from-[#0A1628] to-[#0f1c2e] border-white/10"
                    : "bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  {showRankBadges && athlete.rank_display === "G" && (
                    <Badge
                      variant="outline"
                      className={`font-medium text-base px-2.5 py-1 ${
                        isDark
                          ? "border-white/30 text-white/60"
                          : "border-gray-400 text-gray-600"
                      }`}
                    >
                      G
                    </Badge>
                  )}
                  {showRankBadges && athlete.rank_display !== "G" && (athlete.prospect_ranking ?? 0) <= 30 && (athlete.prospect_ranking ?? 0) > 0 && (
                    <Badge className="bg-blue-600 text-white font-bold text-base px-2.5 py-1">
                      #{athlete.prospect_ranking}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    {canSeeWatchList && isValidProfileId(athlete.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={(e) => handleStarToggle(athlete.id!, e)}
                        disabled={starringInProgress.has(athlete.id!)}
                        className={`h-7 w-7 p-0 ${isDark ? "hover:bg-white/10" : "hover:bg-white/50"}`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            starredAthletes.has(athlete.id!) ? "fill-[#D3B574] text-[#D3B574]" : isDark ? "text-white/30" : "text-gray-400"
                          }`}
                        />
                      </Button>
                    )}
                    {athlete.id && isValidProfileId(athlete.id) && (
                      <MessageAthleteButton
                        athleteId={athlete.id}
                        athleteName={athlete.name}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded border cursor-pointer ${
                          isDark
                            ? "border-white/10 bg-white/5 hover:bg-white/10"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        size="sm"
                      />
                    )}
                    <a
                      href={athlete.id && isValidProfileId(athlete.id) ? `/view-profile?id=${encodeURIComponent(athlete.id)}` : "/create-profile"}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded border cursor-pointer ${
                        isDark
                          ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
                          : "bg-white hover:bg-gray-50"
                      }`}
                      aria-label={`View ${athlete.name} profile`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <a
                href={athlete.id && isValidProfileId(athlete.id) ? `/view-profile?id=${encodeURIComponent(athlete.id)}` : "/create-profile"}
                className="block cursor-pointer"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0">
                      {athlete.photourl ? (
                        <img
                          src={athlete.photourl || "/placeholder.svg"}
                          alt={athlete.name}
                          className={`w-12 h-12 rounded-full object-cover border-2 ${
                            isDark ? "border-white/20" : "border-gray-200"
                          }`}
                          onError={(e) => {
                            e.currentTarget.src = "/diverse-wrestlers.png"
                          }}
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isDark ? "bg-white/10" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`font-bold text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}
                          >
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
                      <h3
                        className={`font-bold text-lg leading-tight mb-1 transition-colors ${
                          isDark
                            ? "text-white hover:text-[#D3B574]"
                            : "text-gray-900 hover:text-[#D3B574]"
                        }`}
                      >
                        {athlete.name}
                      </h3>
                      <p
                        className={`font-medium text-sm mb-1 ${isDark ? "text-white/60" : "text-gray-600"}`}
                      >
                        {athlete.highschool}
                        {athlete.high_school_division ? (
                          <span className={isDark ? "text-white/40 font-normal" : "text-gray-500 font-normal"}>
                            {" "}
                            · {athlete.high_school_division}
                          </span>
                        ) : null}
                      </p>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium ${
                          isDark ? "bg-white/10 text-white/70 border-white/10" : ""
                        }`}
                      >
                        {athlete.weight_display} lbs
                      </Badge>
                    </div>
                  </div>

                  <div
                    className={`text-center pt-2 border-t ${
                      isDark ? "border-white/10" : "border-gray-100"
                    }`}
                  >
                    <span className={`text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>
                      {isValidProfileId(athlete.id) ? "Tap to view full profile & achievements" : "New profile — tap to create"}
                    </span>
                  </div>
                </div>
              </a>
            </CardContent>
        </Card>
        </>
      ))}

      {athletes.length === 0 && (
        <div className={`col-span-full text-center py-12 ${isDark ? "text-white/50" : "text-gray-500"}`}>
          <p>No rankings available for the selected filters.</p>
        </div>
      )}
    </div>
  )
}
