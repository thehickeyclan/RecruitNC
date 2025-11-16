"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, GraduationCap, Award, TrendingUp, Trophy, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { WatchListButton } from "./watch-list-button"
import { RequestProfileEditModal } from "./request-profile-edit-modal"
import { MatchDataSectionImproved } from "./match-data-section-improved"
import { ContactInfoSection } from "./contact-info-section"
import { useAuth } from "@/contexts/auth-context"

// Helper function to extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /youtube\.com\/shorts\/([^&\?\/]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

interface AthleteDetailProps {
  athlete: {
    id: string
    name?: string
    college?: string
    division?: string
    graduationyear?: number
    graduation_year?: number
    weightclass?: string
    weight_class?: string
    highschool?: string
    high_school?: string
    wrestlingClub?: string
    wrestlingClubLogoUrl?: string
    ncUnitedTeam?: string
    photourl?: string
    photo_url?: string
    image_url?: string
    achievements?: string[] | string
    location?: string
    hometown?: string
    height?: string
    gender?: string
    commitmentdate?: string
    commitment_date?: string
    bio?: string
    bio_headline?: string
    academic_gpa?: number
    academic_sat?: number
    academic_act?: number
    recruiting_status?: string
    nhsca_2024_record?: string
    nhsca_2025_record?: string
    nhsca_2023_record?: string
    nhsca_2024_placement?: string
    nhsca_2025_placement?: string
    nhsca_2023_placement?: string
    super_32_2023_record?: string
    super_32_2024_record?: string
    super_32_2025_record?: string
    super_32_2023_placement?: string
    super_32_2024_placement?: string
    super_32_2025_placement?: string
    nationally_ranked_wins?: string
    college_opens_experience?: string
    prospect_ranking?: number
    instagram?: string
    instagram_handle?: string
    instagram_username?: string
    highlight_video_url?: string
    socialMedia?: any
    social_media?: any
    claimed_by_user_id?: string
    additional_achievements?: string | null
  }
  nchsaaResults?: Array<{
    year: number
    place: number
    classification: string
    weight_class: string
  }>
  currentUserId?: string | null
  tournamentResultsComponent?: React.ReactNode
}

export function AthleteDetail({ athlete, nchsaaResults = [], currentUserId = null, tournamentResultsComponent }: AthleteDetailProps) {
  const { isAdmin, isVerifiedCoach } = useAuth()
  const [imageError, setImageError] = useState(false)
  const [highSchoolLogo, setHighSchoolLogo] = useState<string | null>(null)
  const [collegeLogo, setCollegeLogo] = useState<string | null>(null)
  const [clubLogo, setClubLogo] = useState<string | null>(null)
  const [fetchedNchsaaResults, setFetchedNchsaaResults] = useState<
    Array<{
      year: number
      place: number
      classification: string
      weight_class: string
    }>
  >([])

  const [showEditModal, setShowEditModal] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  const isKayne =
    athlete?.id === "9064f44a-2166-45a2-a8c6-690ae8d439db" ||
    (athlete?.name?.toLowerCase?.().includes("kayne") && athlete?.name?.toLowerCase?.().includes("bryson"))

  const athleteName = athlete?.name || "Unknown Athlete"
  const college = athlete?.college || "Not specified"
  const graduationYear = athlete?.graduationyear || athlete?.graduation_year || 0
  const weightClass = athlete?.weightclass || athlete?.weight_class || "Not specified"
  const highSchool = athlete?.highschool || athlete?.high_school || "Not specified"
  const wrestlingClub = athlete?.wrestlingClub || "Not specified"
  const ncUnitedTeam = athlete?.ncUnitedTeam || ""
  const recruitingStatus = athlete?.recruiting_status || "Uncommitted"
  const prospectRanking = (athlete as any)?.prospect_ranking

  console.log("[v0] Recruiting status from DB:", athlete?.recruiting_status)
  console.log("[v0] Final recruiting status:", recruitingStatus)

  console.log("[v0] Rendering unified profile sections in order:")
  console.log("[v0] 1. Hero Banner")
  console.log("[v0] 2. ContactInfoSection")
  console.log("[v0] 3. Academics Section")
  console.log("[v0] 4. Clubs & Programs Section")
  console.log("[v0] 5. AI Bio Section")
  console.log("[v0] 6. Tournament Results (NHSCA & Super 32 Tables)")
  console.log("[v0] 7. MatchDataSectionImproved (Career Stats Banner, Season Summary Table, Individual Matches)")

  const getAthletePhoto = () => {
    if (athleteName.toLowerCase().includes("liam hickey")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/liam-hickey-1746040496978.png"
    }

    if (athleteName.toLowerCase().includes("anna ockerman")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/anna-ockerman-1746893349014.png"
    }

    const photoUrl = athlete?.photourl || athlete?.photo_url || athlete?.image_url

    if (photoUrl && !imageError && photoUrl !== "/wrestler-silhouette.png") {
      return photoUrl
    }

    return "/wrestler-silhouette.png"
  }

  useEffect(() => {
    const loadLogos = async () => {
      try {
        if (highSchool && highSchool !== "Not specified") {
          const response = await fetch(`/api/logo-mappings/by-entity/highschool/${encodeURIComponent(highSchool)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              setHighSchoolLogo(data.logo_url)
            }
          }
        }

        if (college && college !== "Not specified") {
          const response = await fetch(`/api/logo-mappings/by-entity/college/${encodeURIComponent(college)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              setCollegeLogo(data.logo_url)
            }
          }
        }

        if (athlete?.wrestlingClubLogoUrl) {
          setClubLogo(athlete.wrestlingClubLogoUrl)
        } else if (wrestlingClub && wrestlingClub !== "Not specified") {
          const response = await fetch(`/api/logo-mappings/by-entity/club/${encodeURIComponent(wrestlingClub)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              setClubLogo(data.logo_url)
            }
          }
        }
      } catch (error) {
        console.error("Error loading logos:", error)
      }
    }

    loadLogos()
  }, [highSchool, college, athleteName, wrestlingClub, athlete?.wrestlingClubLogoUrl])

  const achievements = (() => {
    try {
      return Array.isArray(athlete?.achievements)
        ? athlete.achievements
        : typeof athlete?.achievements === "string"
          ? athlete.achievements
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean)
          : []
    } catch (error) {
      console.error("[v0] Error parsing achievements:", error)
      return []
    }
  })()

  const additionalAchievements = (() => {
    try {
      if (!athlete?.additional_achievements) return []
      return athlete.additional_achievements
        .split(/\r?\n|;/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    } catch (error) {
      console.error("[v0] Error parsing additional achievements:", error)
      return []
    }
  })()

  const athletePhoto = getAthletePhoto()

  const getRecruitingStatusBadge = () => {
    const status = (recruitingStatus || "").toLowerCase().trim()

    if (status === "committed") {
      return { color: "bg-red-600", text: "COMMITTED", isCollegeAthlete: false }
    } else if (status === "college athlete") {
      return { color: "bg-red-600", text: "COLLEGE ATHLETE", isCollegeAthlete: true }
    } else if (status === "verbal commit") {
      return { color: "bg-yellow-600", text: "VERBAL COMMIT", isCollegeAthlete: false }
    } else if (status === "recruited") {
      return { color: "bg-blue-900", text: "RECRUITED", isCollegeAthlete: false }
    } else if (status === "prospect") {
      return { color: "bg-yellow-700", text: "PROSPECT", isCollegeAthlete: false }
    } else if (status === "uncommitted" || status === "" || !status) {
      const currentYear = new Date().getFullYear()
      if (graduationYear && graduationYear > currentYear) {
        return { color: "bg-blue-900", text: "HIGH SCHOOL PROSPECT", isCollegeAthlete: false }
      } else {
        return { color: "bg-red-600", text: "UNCOMMITTED", isCollegeAthlete: false }
      }
    } else {
      return { color: "bg-red-600", text: "UNCOMMITTED", isCollegeAthlete: false }
    }
  }

  const statusBadge = getRecruitingStatusBadge()
  const normalizedStatus = (recruitingStatus || "").toLowerCase().trim()
  const isCommittedStatus =
    normalizedStatus.includes("committed") ||
    normalizedStatus.includes("college athlete") ||
    normalizedStatus === "verbal commit" ||
    normalizedStatus === "signed"

  const getALLAmericanStatus = () => {
    try {
      const placements = [
        { year: "2025", placement: athlete?.nhsca_2025_placement },
        { year: "2024", placement: athlete?.nhsca_2024_placement },
        { year: "2023", placement: athlete?.nhsca_2023_placement },
      ].filter((p) => p.placement && p.placement !== "")

      const allAmericanYears = placements
        .filter((p) => {
          const placement = p.placement?.toString().trim()
          if (!placement) return false

          const place = Number.parseInt(placement, 10)
          return !isNaN(place) && place <= 8 && place >= 1
        })
        .map((p) => p.year)

      return allAmericanYears.length > 0 ? `All American (${allAmericanYears.join(", ")})` : null
    } catch (error) {
      console.error("[v0] Error in getALLAmericanStatus:", error)
      return null
    }
  }

  const getAchievementBadges = () => {
    try {
      const badges = []

      if (ncUnitedTeam?.toLowerCase().includes("blue")) {
        badges.push({
          color: "bg-white text-blue-900 border-2 border-blue-900",
          text: "NC UNITED BLUE",
          icon: "/nc-united-logo.png",
        })
      } else if (ncUnitedTeam?.toLowerCase().includes("gold")) {
        badges.push({
          color: "bg-white text-yellow-700 border-2 border-yellow-700",
          text: "NC UNITED GOLD",
          icon: "/nc-united-logo.png",
        })
      }

      const hasStateTitle = Array.isArray(nchsaaResults) && nchsaaResults.some((result) => result?.place === 1)
      if (hasStateTitle) {
        badges.push({ color: "bg-yellow-600 text-white", text: "STATE CHAMPION" })
      }

      const allAmericanStatus = getALLAmericanStatus()
      if (allAmericanStatus) {
        badges.push({ color: "bg-yellow-600 text-white", text: "ALL-AMERICAN" })
      }

      return badges
    } catch (error) {
      console.error("[v0] Error in getAchievementBadges:", error)
      return []
    }
  }

  const achievementBadges = getAchievementBadges()

  const getMedalIcon = (placement: number) => {
    if (placement === 1) return "🥇"
    if (placement === 2) return "🥈"
    if (placement === 3) return "🥉"
    if (placement >= 4 && placement <= 8) return "🥉"
    return null
  }

  const getConsolidatedTournamentData = () => {
    const tournaments = []

    const effectiveNchsaaResults = nchsaaResults.length > 0 ? nchsaaResults : fetchedNchsaaResults

    if (Array.isArray(effectiveNchsaaResults) && effectiveNchsaaResults.length > 0) {
      effectiveNchsaaResults.forEach((result) => {
        if (result && typeof result === "object") {
          tournaments.push({
            tournament: "NCHSAA",
            year: result.year,
            placement: result.place,
            record: null,
            classification: result.classification,
            weight: result.weight_class,
            type: "state",
          })
        }
      })
    }

    // Try new JSON format first for NHSCA
    if (athlete?.nhsca_results && Array.isArray(athlete.nhsca_results) && athlete.nhsca_results.length > 0) {
      athlete.nhsca_results.forEach((result: any) => {
        tournaments.push({
          tournament: "NHSCA",
          year: result.year,
          placement: result.placement,
          record: result.record,
          type: "national",
        })
      })
    } else {
      // Fallback to old columns
      const nhscaYears = [
        { year: 2025, record: athlete?.nhsca_2025_record, placement: athlete?.nhsca_2025_placement },
        { year: 2024, record: athlete?.nhsca_2024_record, placement: athlete?.nhsca_2024_placement },
        { year: 2023, record: athlete?.nhsca_2023_record, placement: athlete?.nhsca_2023_placement },
      ]

      nhscaYears.forEach(({ year, record, placement }) => {
        if (record || placement) {
          tournaments.push({
            tournament: "NHSCA",
            year,
            placement: placement ? Number.parseInt(placement) || placement : null,
            record,
            type: "national",
          })
        }
      })
    }

    // Try new JSON format first for Super 32
    if (athlete?.super32_results && Array.isArray(athlete.super32_results) && athlete.super32_results.length > 0) {
      athlete.super32_results.forEach((result: any) => {
        tournaments.push({
          tournament: "Super 32",
          year: result.year,
          placement: result.placement,
          record: result.record,
          type: "national",
        })
      })
    } else {
      // Fallback to old columns
      const super32Years = [
        { year: 2025, record: athlete?.super_32_2025_record, placement: athlete?.super_32_2025_placement },
        { year: 2024, record: athlete?.super_32_2024_record, placement: athlete?.super_32_2024_placement },
        { year: 2023, record: athlete?.super_32_2023_record, placement: athlete?.super_32_2023_placement },
      ]

      super32Years.forEach(({ year, record, placement }) => {
        if (record || placement) {
          tournaments.push({
            tournament: "Super 32",
            year,
            placement: placement ? Number.parseInt(placement) || placement : null,
            record,
            type: "elite",
          })
        }
      })
    }

    try {
      return tournaments.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        const order = { NCHSAA: 1, NHSCA: 2, "Super 32": 3 }
        return (order[a.tournament] || 999) - (order[b.tournament] || 999)
      })
    } catch (error) {
      console.error("[v0] Error sorting tournaments:", error)
      return tournaments
    }
  }

  const consolidatedTournaments = getConsolidatedTournamentData() || []

  useEffect(() => {
    async function fetchNchsaaData() {
      if (!athleteName) return

      try {
        const response = await fetch(`/api/wrestling-achievements?name=${encodeURIComponent(athleteName)}`)
        const data = await response.json()

        if (data.success && data.achievements) {
          const stateChampionships = data.achievements.state_championships || []

          const nchsaaData = stateChampionships.map((achievement: any) => ({
            year: achievement.year || 0,
            place: achievement.place || 1,
            classification: achievement.division || "",
            weight_class: achievement.weight_class || "",
          }))

          setFetchedNchsaaResults(nchsaaData)
        }
      } catch (error) {
        console.error("[v0] Error fetching NCHSAA data:", error)
      }
    }

    fetchNchsaaData()
  }, [athleteName])

  useEffect(() => {
    async function fetchUserEmail() {
      if (!currentUserId) return
      try {
        const response = await fetch("/api/user/profile")
        if (response.ok) {
          const data = await response.json()
          setCurrentUserEmail(data.email || null)
        }
      } catch (error) {
        console.error("[v0] Error fetching user email:", error)
      }
    }
    fetchUserEmail()
  }, [currentUserId])

  const getInstagramHandle = () => {
    let instagram = athlete?.instagram || athlete?.instagram_handle || athlete?.instagram_username

    if (!instagram && athlete?.socialMedia) {
      try {
        const socialData =
          typeof athlete.socialMedia === "string" ? JSON.parse(athlete.socialMedia) : athlete.socialMedia
        if (socialData && typeof socialData === "object") {
          instagram = socialData.instagram || socialData.Instagram
        }
      } catch (error) {
        console.error("[v0] Error parsing socialMedia:", error)
      }
    }

    if (!instagram && athlete?.social_media) {
      try {
        const socialData =
          typeof athlete.social_media === "string" ? JSON.parse(athlete.social_media) : athlete.social_media
        if (socialData && typeof socialData === "object") {
          instagram = socialData.instagram || socialData.Instagram
        }
      } catch (error) {
        console.error("[v0] Error parsing social_media:", error)
      }
    }

    return instagram || null
  }

  const instagramHandle = getInstagramHandle()

  const getInstagramUrl = () => {
    if (!instagramHandle) return null

    const cleanHandle = instagramHandle.replace("@", "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")

    return `https://www.instagram.com/${cleanHandle}`
  }

  const instagramUrl = getInstagramUrl()

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Mobile view */}
          <div className="block lg:hidden">
            <div className="relative h-80 w-full">
              <Image
                src={athletePhoto || "/placeholder.svg"}
                alt={athleteName}
                fill
                className={cn("object-cover", isKayne && "scale-90 origin-center")}
                style={{
                  objectPosition: "center 35%",
                }}
                onError={() => setImageError(true)}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Instagram Icon - Bottom Left of Photo */}
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 left-4 z-20 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all"
                >
                  <svg className="w-5 h-5 text-[#13294B]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.646.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}

              {/* Edit Button - Bottom Right of Photo */}
              {currentUserId && (
                <Button
                  size="sm"
                  className="absolute bottom-4 right-4 z-20 bg-white/90 hover:bg-white text-[#13294B] shadow-lg p-2 h-auto"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] text-white p-6 relative">
              {/* Star Button - Top Right of Banner */}
              <div className="absolute top-4 right-4">
                <WatchListButton athleteId={athlete.id} />
              </div>

              <h1 className="text-3xl font-bold mb-3">{athleteName}</h1>

              {isCommittedStatus && college && college !== "Not specified" && (
                <div className="flex items-center gap-3 mb-4">
                  {collegeLogo ? (
                    <div className="relative h-14 w-14 rounded-full overflow-hidden border border-white/40 bg-white/90 shadow-lg">
                      <Image
                        src={collegeLogo}
                        alt={`${college} logo`}
                        fill
                        className="object-contain p-2"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-white text-lg font-semibold shadow-lg">
                      {college
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase())
                        .join("") || "C"}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Committed To</p>
                    <p className="text-lg font-bold text-white drop-shadow">
                      {college}
                    </p>
                  </div>
                </div>
              )}

              {prospectRanking && (
                <div className="mb-4">
                  <Badge className="bg-[#D3B574] text-[#13294B] px-3 py-1.5 text-sm font-bold">
                    #{prospectRanking} - Class of {graduationYear}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <p className="text-gray-200 text-xs font-medium uppercase tracking-wide">Year</p>
                  <p className="text-xl font-bold">{graduationYear || "N/A"}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <p className="text-gray-200 text-xs font-medium uppercase tracking-wide">Weight</p>
                  <p className="text-xl font-bold">{weightClass}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop view */}
          <div className="hidden lg:block">
            <div className="relative min-h-[360px] bg-gradient-to-r from-[#13294B] to-[#1e3a5f]">
              <div className="absolute inset-0 bg-black/10" />

              {/* Star Button - Top Right */}
              <div className="absolute top-6 right-6 z-20">
                <WatchListButton athleteId={athlete.id} />
              </div>

              <div className="relative z-10 flex items-start gap-8 p-8">
                <div className="flex-shrink-0 w-80">
                  <div className="relative h-96 w-full rounded-xl overflow-hidden border-4 border-white/30 shadow-2xl">
                    {/* Instagram Icon - Bottom Left */}
                    {instagramUrl && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-4 left-4 z-20 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all"
                      >
                        <svg className="w-5 h-5 text-[#13294B]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.646.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </a>
                    )}

                    {/* Edit Button - Bottom Right */}
                    {currentUserId && (
                      <Button
                        size="sm"
                        className="absolute bottom-4 right-4 z-20 bg-white/90 hover:bg-white text-[#13294B] shadow-lg p-2 h-auto"
                        onClick={() => setShowEditModal(true)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}

                    <Image
                      src={athletePhoto || "/placeholder.svg"}
                      alt={athleteName}
                      fill
                      className={cn("object-cover origin-center", isKayne ? "scale-[.65]" : "scale-75")}
                      style={{
                        objectPosition: "center 35%",
                      }}
                      onError={() => setImageError(true)}
                      priority
                    />
                  </div>
                </div>

                <div className="flex-1 text-white pt-4">
                  <h1 className="text-5xl font-bold mb-4 text-white drop-shadow-lg">{athleteName}</h1>

                  {isCommittedStatus && college && college !== "Not specified" && (
                    <div className="flex items-center gap-4 mb-6">
                      {collegeLogo ? (
                        <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-white/50 bg-white/95 shadow-xl">
                          <Image
                            src={collegeLogo}
                            alt={`${college} logo`}
                            fill
                            className="object-contain p-3"
                          />
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center text-white text-2xl font-semibold shadow-xl">
                          {college
                            .split(" ")
                            .slice(0, 2)
                            .map((word) => word[0]?.toUpperCase())
                            .join("") || "C"}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Committed To</p>
                        <p className="text-3xl font-bold text-white drop-shadow-lg leading-tight">{college}</p>
                      </div>
                    </div>
                  )}

                  {prospectRanking && (
                    <Badge className="bg-[#D3B574] text-[#13294B] px-4 py-2 text-base font-bold shadow-lg mb-4">
                      #{prospectRanking} - Class of {graduationYear}
                    </Badge>
                  )}

                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                      <p className="text-gray-200 text-xs font-semibold uppercase tracking-wider mb-1">Year</p>
                      <p className="text-2xl font-bold text-white">{graduationYear || "N/A"}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                      <p className="text-gray-200 text-xs font-semibold uppercase tracking-wider mb-1">Weight</p>
                      <p className="text-2xl font-bold text-white">{weightClass}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Highlight Video Section */}
      {athlete?.highlight_video_url && (() => {
        const videoId = getYouTubeVideoId(athlete.highlight_video_url)
        if (!videoId) return null
        
        return (
          <Card className="border-t-4 border-t-[#BC0B03] shadow-md">
            <div className="bg-gradient-to-r from-[#BC0B03] to-[#9a0902] p-6">
              <div className="flex items-center gap-3">
                <Video className="h-6 w-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Highlight Reel</h2>
              </div>
            </div>
            <div className="p-8">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="Wrestling Highlight Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          </Card>
        )
      })()}

      {/* Contact Info Section */}
      <ContactInfoSection athlete={athlete} />

      {/* AI Bio Section - Athlete Profile */}
      {(athlete?.bio_headline || athlete?.bio) && (
        <Card className="border-t-4 border-t-[#002147] shadow-md">
          <div className="bg-gradient-to-r from-[#002147] to-[#003366] p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Athlete Profile</h2>
            </div>
          </div>
          <div className="p-8">
            <div className="mb-4">
              <div className="flex-1">
                {athlete?.bio_headline && (
                  <h3 className="text-xl font-semibold text-[#002147] mb-4 leading-relaxed">{athlete.bio_headline}</h3>
                )}
              </div>
            </div>
      {athlete?.bio && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{athlete.bio}</p>
        </div>
      )}
      </div>
    </Card>
  )}

  {/* Removed duplicate Additional Achievements block (will render once after College Opens) */}

      {/* Academics Section */}
      {(highSchool !== "Not specified" || athlete?.academic_gpa || athlete?.academic_sat || athlete?.academic_act) && (
        <Card className="border-t-4 border-t-[#002147] shadow-md">
          <div className="bg-gradient-to-r from-[#002147] to-[#003366] p-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Academics</h2>
            </div>
          </div>
          <div className="p-8">

            {/* High School */}
            {highSchool !== "Not specified" && (
              <div className="mb-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    {highSchoolLogo && (
                      <div className="w-16 h-16 rounded-xl bg-gray-50 p-3 flex items-center justify-center shadow-sm flex-shrink-0 border border-gray-200">
                        <Image
                          src={highSchoolLogo || "/placeholder.svg"}
                          alt={`${highSchool} logo`}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">High School</p>
                      <p className="text-xl font-bold text-gray-900 leading-tight">{highSchool}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Academic Stats - Only visible to coaches and admins */}
            {(isAdmin || isVerifiedCoach) && (athlete?.academic_gpa || athlete?.academic_sat || athlete?.academic_act) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {athlete.academic_gpa && (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <p className="text-sm text-gray-600 font-semibold uppercase tracking-wider mb-2">GPA</p>
                    <p className="text-4xl font-bold text-[#002147]">
                      {athlete.academic_gpa.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Grade Point Average</p>
                  </div>
                )}
                {athlete.academic_sat && (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <p className="text-sm text-gray-600 font-semibold uppercase tracking-wider mb-2">SAT</p>
                    <p className="text-4xl font-bold text-[#002147]">
                      {athlete.academic_sat}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Standardized Test Score</p>
                  </div>
                )}
                {athlete.academic_act && (
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <p className="text-sm text-gray-600 font-semibold uppercase tracking-wider mb-2">ACT</p>
                    <p className="text-4xl font-bold text-[#002147]">
                      {athlete.academic_act}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Standardized Test Score</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Message for non-coaches */}
            {!(isAdmin || isVerifiedCoach) && (athlete?.academic_gpa || athlete?.academic_sat || athlete?.academic_act) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm text-blue-700 text-center">
                  📊 Academic information is only visible to verified college coaches.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Clubs & Programs Section */}
      {(wrestlingClub !== "Not specified" || ncUnitedTeam) && (
        <Card className="border-t-4 border-t-[#B31B1B] shadow-md">
          <div className="bg-gradient-to-r from-[#B31B1B] to-[#8B1515] p-6">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Clubs & Programs</h2>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {wrestlingClub !== "Not specified" && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    {clubLogo && (
                      <div className="w-20 h-20 rounded-xl bg-gray-50 p-3 flex items-center justify-center shadow-sm flex-shrink-0 border border-gray-200">
                        <Image
                          src={clubLogo || "/placeholder.svg"}
                          alt={`${wrestlingClub} logo`}
                          width={64}
                          height={64}
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                        Wrestling Club
                      </p>
                      <p className="text-xl font-bold text-gray-900 leading-tight">{wrestlingClub}</p>
                    </div>
                  </div>
                </div>
              )}
              {ncUnitedTeam && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gray-50 p-3 flex items-center justify-center shadow-sm flex-shrink-0 border border-gray-200">
                      <Image
                        src="/nc-united-logo.png"
                        alt="NC United logo"
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
                        NC United Team
                      </p>
                      <p className="text-xl font-bold text-gray-900 leading-tight">{ncUnitedTeam}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Additional Achievements will be rendered after College Opens Experience */}

      {/* Tournament Results - New Format */}
      {tournamentResultsComponent}

      {/* College Opens Experience */}
      {(() => {
        console.log("[v0] College Opens data:", athlete.college_opens_experience)
        return athlete.college_opens_experience ? (
          <div className="container mx-auto px-4 py-8">
            <Card className="shadow-lg border-l-4 border-l-blue-600">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                <CardTitle className="flex items-center gap-2 text-[#13294B]">
                  <Trophy className="h-6 w-6 text-blue-600" />
                  College Opens Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {athlete.college_opens_experience}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null
      })()}

      {additionalAchievements.length > 0 && (
        <div className="container mx-auto px-4 py-8">
          <Card className="border-t-4 border-t-[#1D4ED8] shadow-md">
            <div className="bg-gradient-to-r from-[#1D4ED8] to-[#1E3A8A] p-6">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Additional Achievements</h2>
              </div>
            </div>
            <div className="p-8">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {additionalAchievements.map((achievement, index) => (
                  <li key={`additional-achievement-${index}`} className="text-base leading-relaxed">
                    {achievement}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}

      {/* Match Data Section */}
      <MatchDataSectionImproved athleteId={athlete.id} athleteName={athleteName} graduationYear={graduationYear} />

      {/* Request Profile Edit Modal */}
      <RequestProfileEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        athleteId={athlete.id}
        athleteName={athleteName}
        currentUserEmail={currentUserEmail || undefined}
      />
    </div>
  )
}
