"use client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExternalLink, ChevronUp, ChevronDown, Star } from 'lucide-react'
import { Fragment, useEffect, useState } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { isValidProfileId } from "@/lib/profile-id"

interface NHSCAResult {
  text: string
  placement: number | null
  year: number
}

interface Super32Result {
  text: string
  placement: number | null
  year: number
}

interface StateResult {
  text: string
  placement: number | null
  year: number
}

interface Athlete {
  id?: string
  name: string
  highschool: string
  weight_display: string
  graduation_year?: number | null
  achievement_badge?: string
  achievement_color?: string
  has_ranked_win: boolean
  academic_gpa: number | null
  prospect_ranking?: number | null
  rank_display?: string
  photourl?: string
  nationally_ranked_wins?: string | number
  college?: string
  recruiting_status?: string
  commitment_status_display?: string
}

interface RankingsTableViewProps {
  athletes: Athlete[]
  loading?: boolean
  hideRankColumn?: boolean
  additionalDividerLabel?: string
  dividerAfterRank?: number
  showRankColumn?: boolean
  defaultSortField?: SortField
  defaultSortDirection?: SortDirection
}

type SortField = "rank" | "name" | "school" | "weight" | "year"
type SortDirection = "asc" | "desc"

export function RankingsTableView({
  athletes,
  loading,
  hideRankColumn = false,
  additionalDividerLabel = "Additional Ranked Prospects",
  dividerAfterRank = 30,
  showRankColumn = true,
  defaultSortField,
  defaultSortDirection,
}: RankingsTableViewProps) {
  const [sortField, setSortField] = useState<SortField>(defaultSortField ?? "rank")
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection ?? "asc")
  const [collegeLogos, setCollegeLogos] = useState<Record<string, string>>({})
  const { user, profile, isAdmin, isCoach } = useAuth()
  const [canSeeWatchList, setCanSeeWatchList] = useState(false)
  const [starredAthletes, setStarredAthletes] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkCoachStatus = async () => {
      console.log("[v0] Checking coach status for star visibility (myrecruits funnel)")
      if (!user || !profile) {
        console.log("[v0] No user or profile found")
        setCanSeeWatchList(false)
        return
      }

      const canSeeStars = isAdmin || isCoach
      console.log(
        "[v0] Auth context - isAdmin:",
        isAdmin,
        "isCoach:",
        isCoach,
        "canSeeStars:",
        canSeeStars,
      )
      setCanSeeWatchList(canSeeStars)

      if (canSeeStars) {
        console.log("[v0] Fetching starred athletes")
        try {
          const starredResponse = await fetch("/api/coaches/starred-athletes")
          if (starredResponse.ok) {
            const starredData = await starredResponse.json()
            console.log("[v0] Starred athletes data:", starredData)
            const starredIds = new Set<string>(
              (starredData.athletes?.map((a: { athlete_id?: string }) => a.athlete_id) || []).filter(
                (id: unknown): id is string => typeof id === "string"
              )
            )
            console.log("[v0] Starred athlete IDs:", Array.from(starredIds))
            setStarredAthletes(starredIds)
          }
        } catch (error) {
          console.error("[v0] Error fetching starred athletes:", error)
        }
      }
    }

    checkCoachStatus()
  }, [user, profile, isAdmin, isCoach])

  useEffect(() => {
    const fetchCollegeLogos = async () => {
      console.log("[v0] Starting to fetch college logos")
      console.log("[v0] Total athletes:", athletes.length)

      console.log(
        "[v0] All athletes data:",
        athletes.map((a) => ({
          name: a.name,
          recruiting_status: a.recruiting_status,
          college: a.college,
          has_both: !!(a.recruiting_status === "Committed" && a.college),
        })),
      )

      const committedAthletes = athletes.filter(
        (a) =>
          a.recruiting_status === "Committed" &&
          a.college &&
          a.college.trim() !== "" &&
          a.college !== "Not specified" &&
          a.college !== "Undecided",
      )

      console.log("[v0] Committed athletes found:", committedAthletes.length)
      console.log(
        "[v0] Committed athletes details:",
        committedAthletes.map((a) => ({
          name: a.name,
          college: a.college,
          recruiting_status: a.recruiting_status,
        })),
      )

      const logos: Record<string, string> = {}

      for (const athlete of committedAthletes) {
        if (athlete.college) {
          try {
            const url = `/api/logo-mappings/by-entity/college/${encodeURIComponent(athlete.college)}`
            console.log(`[v0] Fetching logo for ${athlete.college} from:`, url)
            const response = await fetch(url)
            console.log(`[v0] Response status for ${athlete.college}:`, response.status)

            if (response.ok) {
              const data = await response.json()
              console.log(`[v0] Logo data for ${athlete.college}:`, data)
              if (data.success && data.logo_url) {
                logos[athlete.college] = data.logo_url
                console.log(`[v0] Successfully added logo for ${athlete.college}:`, data.logo_url)
              } else {
                console.log(`[v0] No logo URL found for ${athlete.college}`)
              }
            } else {
              console.log(`[v0] Failed to fetch logo for ${athlete.college}`)
            }
          } catch (error) {
            console.error(`[v0] Error fetching logo for ${athlete.college}:`, error)
          }
        }
      }

      console.log("[v0] Final collegeLogos object:", logos)
      setCollegeLogos(logos)
    }

    if (athletes.length > 0) {
      fetchCollegeLogos()
    }
  }, [athletes, user])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleStarToggle = async (athleteId: string) => {
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

  const sortedAthletes = [...athletes].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case "rank":
        aValue = a.prospect_ranking ?? Number.POSITIVE_INFINITY
        bValue = b.prospect_ranking ?? Number.POSITIVE_INFINITY
        break
      case "name":
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case "school":
        aValue = (a.highschool || "").toLowerCase()
        bValue = (b.highschool || "").toLowerCase()
        break
      case "weight":
        aValue = Number.parseInt(a.weight_display) || 999
        bValue = Number.parseInt(b.weight_display) || 999
        break
      case "year":
        aValue = a.graduation_year ?? 0
        bValue = b.graduation_year ?? 0
        break
      default:
        aValue = a.prospect_ranking
        bValue = b.prospect_ranking
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const getMedalEmoji = (placement: number | null): string => {
    if (!placement) return ""
    if (placement === 1) return "🥇"
    if (placement === 2) return "🥈"
    if (placement === 3) return "🥉"
    if (placement <= 8) return "🏅" // All-American
    return ""
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded mb-2"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: "#0D1A4D" }} className="text-white hover:bg-[#0D1A4D]">
              {canSeeWatchList && (
                <TableHead className="w-16 text-white font-semibold text-center">
                  <Star className="w-4 h-4 inline-block" />
                </TableHead>
              )}
              {!hideRankColumn && showRankColumn && (
                <TableHead className="w-20 text-white font-semibold text-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("rank")}
                    className="font-semibold text-white hover:text-gray-200 p-0 h-auto hover:bg-transparent"
                  >
                    Rank <SortIcon field="rank" />
                  </Button>
                </TableHead>
              )}
              <TableHead className="min-w-[220px] text-white font-semibold pl-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("name")}
                  className="font-semibold text-white hover:text-gray-200 p-0 h-auto hover:bg-transparent"
                >
                  Name <SortIcon field="name" />
                </Button>
              </TableHead>
              <TableHead className="w-20 text-white font-semibold">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("year")}
                  className="font-semibold text-white hover:text-gray-200 p-0 h-auto hover:bg-transparent"
                >
                  Year <SortIcon field="year" />
                </Button>
              </TableHead>
              <TableHead className="w-[110px] text-white font-semibold text-center">Status</TableHead>
              <TableHead className="min-w-[180px] text-white font-semibold">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("school")}
                  className="font-semibold text-white hover:text-gray-200 p-0 h-auto hover:bg-transparent"
                >
                  School <SortIcon field="school" />
                </Button>
              </TableHead>
              <TableHead className="w-20 text-white font-semibold">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("weight")}
                  className="font-semibold text-white hover:text-gray-200 p-0 h-auto hover:bg-transparent"
                >
                  Weight <SortIcon field="weight" />
                </Button>
              </TableHead>
              <TableHead className="w-24 text-white font-semibold">Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white">
            {sortedAthletes.map((athlete, index) => {
              const rankDisplayG = athlete.rank_display === "G"
              const rankValue =
                rankDisplayG
                  ? null
                  : typeof athlete.prospect_ranking === "number" && Number.isFinite(athlete.prospect_ranking)
                    ? athlete.prospect_ranking
                    : null

              const shouldRenderDivider =
                !hideRankColumn &&
                showRankColumn &&
                index === dividerAfterRank &&
                sortedAthletes.length > dividerAfterRank

              return (
                <Fragment key={athlete.id}>
                  {shouldRenderDivider && (
                    <TableRow className="bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100">
                      <TableCell colSpan={canSeeWatchList ? 8 : 7} className="py-2 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <div className="h-px bg-gray-300 flex-1 max-w-xs"></div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
                            {additionalDividerLabel}
                          </span>
                          <div className="h-px bg-gray-300 flex-1 max-w-xs"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow
                    className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                  >
                    {canSeeWatchList && (
                      <TableCell className="text-center">
                        {isValidProfileId(athlete.id) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStarToggle(athlete.id!)}
                            disabled={starringInProgress.has(athlete.id!)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                starredAthletes.has(athlete.id!) ? "fill-[#D3B574] text-[#D3B574]" : "text-gray-400"
                              }`}
                            />
                          </Button>
                        ) : (
                          <span className="w-8 h-8 inline-block" />
                        )}
                      </TableCell>
                    )}
                    {!hideRankColumn && showRankColumn && (
                      <TableCell className="font-medium pr-2">
                        <div className="flex items-center gap-2 min-w-[82px]">
                          {rankDisplayG && (
                            <div className="px-3 py-1 rounded-full text-sm min-w-[2.5rem] text-center border border-gray-300 text-gray-600 font-medium">
                              G
                            </div>
                          )}
                          {!rankDisplayG && rankValue !== null && rankValue <= dividerAfterRank && (
                            <div
                              className="px-3 py-1 rounded-full text-white font-bold text-sm min-w-[2.5rem] text-center"
                              style={{ backgroundColor: "#B31B1B" }}
                            >
                              #{rankValue}
                            </div>
                          )}
                          {!rankDisplayG && rankValue !== null && rankValue > dividerAfterRank && (
                            <div className="px-3 py-1 rounded-full text-sm min-w-[2.5rem] text-center border border-gray-300 text-gray-600">
                              #{rankValue}
                            </div>
                          )}
                          {!rankDisplayG && rankValue === null && (
                            <div className="px-3 py-1 rounded-full text-sm min-w-[2.5rem] text-center border border-gray-200 text-gray-400">
                              —
                            </div>
                          )}
                          {athlete.photourl && (
                            <img
                              src={athlete.photourl || "/placeholder.svg"}
                              alt={athlete.name}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none"
                              }}
                            />
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3 leading-tight">
                        {isValidProfileId(athlete.id) ? (
                          <a
                            href={`/unified-profile/${athlete.id}`}
                            className="font-semibold text-gray-900 hover:text-[#D3B574] transition-colors underline"
                          >
                            {athlete.name}
                          </a>
                        ) : athlete.id ? (
                          <a
                            href="/create-profile"
                            className="font-semibold text-gray-900 hover:text-[#D3B574] transition-colors underline"
                          >
                            {athlete.name}
                          </a>
                        ) : (
                          <span className="font-semibold text-gray-900">{athlete.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-700 font-medium">
                      {athlete.graduation_year ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {athlete.recruiting_status === "Committed" &&
                      athlete.college &&
                      athlete.college !== "Not specified" &&
                      athlete.college !== "Undecided" ? (
                        <div className="flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center p-1">
                            {collegeLogos[athlete.college] ? (
                              <Image
                                src={collegeLogos[athlete.college] || "/placeholder.svg"}
                                alt={`${athlete.college} logo`}
                                width={32}
                                height={32}
                                className="object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/generic-college-logo.png"
                                }}
                              />
                            ) : (
                              <span className="text-xs text-gray-500">{athlete.college.substring(0, 3)}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm font-medium">
                          {athlete.commitment_status_display ?? (athlete.recruiting_status || "—")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700 font-medium">{athlete.highschool || "-"}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-gray-900">{athlete.weight_display || "-"}</span>
                    </TableCell>
                    <TableCell>
                      {isValidProfileId(athlete.id) ? (
                        <a
                          href={`/unified-profile/${athlete.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border bg-transparent hover:bg-gray-100"
                        >
                          <ExternalLink className="w-3 h-3 text-gray-700" />
                        </a>
                      ) : (
                        <a
                          href="/create-profile"
                          className="inline-flex h-8 items-center justify-center rounded border bg-transparent hover:bg-gray-100 px-2 text-xs"
                        >
                          New profile
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {sortedAthletes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No rankings available for the selected filters.</p>
        </div>
      )}
    </div>
  )
}
