"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, GraduationCap, Award, TrendingUp, Trophy, Video, ExternalLink, Shield, Share2, Phone } from "lucide-react"
import { UnifiedProfileMobileNav } from "./unified-profile-mobile-nav"
import { AauScholasticProfileQualityWinsSection } from "@/components/national-team/aau-scholastic-profile-quality-wins"
import type { AauScholasticWrestlerQualityWins } from "@/lib/aau-scholastic-duals-2026-quality-wins"
import {
  PROFILE_CARD_BODY,
  PROFILE_SECTION_HEADER,
  PROFILE_SECTION_ORDER,
  PROFILE_SECTION_TITLE,
} from "@/lib/unified-profile-section-styles"
import { cn } from "@/lib/utils"
import { WatchListButton } from "./watch-list-button"
import { MessageAthleteButton } from "@/components/messaging/message-athlete-button"
import { RequestProfileEditModal } from "./request-profile-edit-modal"
import { MatchDataSectionImproved } from "./match-data-section-improved"
import { useAuth } from "@/contexts/auth-context"
import { InlineEditSection } from "./inline-edit-section"
import { InlineEditHeader } from "./inline-edit-header"
import { ImageUploadEditor } from "./image-upload-editor"
import { InlineBioEditor } from "./inline-bio-editor"
import { InlineContactEditor } from "./inline-contact-editor"
import { InlineAcademicsEditor } from "./inline-academics-editor"
import { InlineAchievementsEditor } from "./inline-achievements-editor"
import { InlineCollegeOpensEditor } from "./inline-college-opens-editor"
import { InlineSchoolClubEditor } from "./inline-school-club-editor"
import { InlineWeightEditor } from "./inline-weight-editor"
import { InlineHighlightVideoEditor } from "./inline-highlight-video-editor"
import { WorkingEntityLogo } from "./working-entity-logo"
import { useToast } from "@/components/ui/use-toast"
import { getYouTubeVideoId, isDirectHighlightVideoUrl } from "@/lib/highlight-video-url"
import { PROFILE_DARK_THEME } from "@/lib/profile-dark-theme"

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
    gpa?: number
    sat?: number
    act?: number
    academic_gpa?: number
    academic_sat?: number
    academic_act?: number
    academic_summary?: string | null
    academic_interest?: string | null
    recruiting_status?: string
    nhsca_2026_record?: string
    nhsca_2026_placement?: string
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
    ultimate_club_duals_2025_record?: string
    ultimate_club_duals_2024_record?: string
    nationally_ranked_wins?: string
    college_opens_experience?: string
    prospect_ranking?: number
    rankings?: unknown
    instagram?: string
    instagram_handle?: string
    instagram_username?: string
    highlight_video_url?: string
    socialMedia?: any
    social_media?: any
    claimed_by_user_id?: string
    profile_verified?: boolean
    additional_achievements?: string | null
    flo_profile_url?: string
    track_wrestling_profile_url?: string
    last_edited_by?: string
    last_edited_at?: string
  }
  nchsaaResults?: Array<{
    year: number
    place: number
    classification: string
    weight_class: string
  }>
  currentUserId?: string | null
  tournamentResultsComponent?: React.ReactNode
  /** Public view-profile uses dark navy panels to match /athletes and /colleges. */
  theme?: "light" | "dark"
  /** Mobile: national-first section order, jump nav, compact school block, collapsed match log. */
  mobileRecruiterLayout?: boolean
}

export function AthleteDetail({
  athlete,
  nchsaaResults = [],
  currentUserId = null,
  tournamentResultsComponent,
  theme = "light",
  mobileRecruiterLayout = false,
}: AthleteDetailProps) {
  const isDark = theme === "dark"
  const { isAdmin, isVerifiedCoach } = useAuth()
  const [imageError, setImageError] = useState(false)
  const [highSchoolLogo, setHighSchoolLogo] = useState<string | null>(null)
  const [highSchoolLogoLoadError, setHighSchoolLogoLoadError] = useState(false)
  const [collegeLogo, setCollegeLogo] = useState<string | null>(null)
  const [clubLogo, setClubLogo] = useState<string | null>(null)
  const [clubLogoLoadError, setClubLogoLoadError] = useState(false)
  const [instagramLogo, setInstagramLogo] = useState<string | null>(null)
  const [floLogo, setFloLogo] = useState<string | null>(null)
  const [trackWrestlingLogo, setTrackWrestlingLogo] = useState<string | null>(null)
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
  const [athleteData, setAthleteData] = useState(athlete)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const { toast } = useToast()

  const handleShareProfile = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copied", description: "Profile link copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", description: "Could not copy link. Try selecting the URL manually.", variant: "destructive" })
    }
  }

  // Profile owner can see their own private info (cell, GPA, ACT, SAT)
  const isViewingOwnProfile = Boolean(currentUserId && athlete.claimed_by_user_id === currentUserId)
  // Owner, or admin, can edit (admins can edit any profile on public or when viewing)
  const canEdit = Boolean(currentUserId) || isAdmin
  // Private info (contact, GPA, ACT, SAT) visible only to self, coaches, and admins
  const canSeePrivateInfo = isViewingOwnProfile || isAdmin || isVerifiedCoach

  // Academic fields: support both gpa/sat/act and academic_gpa/academic_sat/academic_act (DB column variants)
  const effectiveGpa = athleteData?.academic_gpa ?? athleteData?.gpa
  const effectiveSat = athleteData?.academic_sat ?? athleteData?.sat
  const effectiveAct = athleteData?.academic_act ?? athleteData?.act
  const hasAcademicData = Boolean(effectiveGpa || effectiveSat || effectiveAct)

  type NationalTeamHighlightVideo = {
    event: string
    year: number
    title: string
    videoSrc: string
    ariaLabel: string
  }

  const nationalTeamHighlightVideos: NationalTeamHighlightVideo[] = Array.isArray(
    (athleteData as { national_team_highlight_videos?: NationalTeamHighlightVideo[] })
      ?.national_team_highlight_videos
  )
    ? ((athleteData as { national_team_highlight_videos?: NationalTeamHighlightVideo[] })
        .national_team_highlight_videos as NationalTeamHighlightVideo[])
    : []

  const aauScholasticQualityWins =
    (athleteData as { aau_scholastic_quality_wins?: AauScholasticWrestlerQualityWins | null })
      ?.aau_scholastic_quality_wins ?? null

  const renderDirectHighlightVideo = (url: string, title: string) => (
    <div className="relative w-full overflow-hidden rounded-lg shadow-lg bg-black">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="w-full max-h-[min(70vh,720px)]"
        title={title}
      >
        <source src={url} type="video/quicktime" />
        <source src={url} type="video/mp4" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Watch highlight video
        </a>
      </video>
    </div>
  )

  // Handler for inline edits
  const handleInlineSave = async (updates: Record<string, any>) => {
    const response = await fetch(`/api/athletes/${athlete.id}/self-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to save")
    }

    const data = await response.json()
    // Update local state
    setAthleteData((prev) => ({ ...prev, ...updates }))
    setEditingSection(null)
    // Refresh page data
    window.location.reload()
  }

  // Handler for image upload
  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("athleteId", athlete.id)
    formData.append("category", "profile")

    const response = await fetch("/api/athletes/upload-image", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to upload image")
    }

    const data = await response.json()
    // Update local state
    setAthleteData((prev) => ({ ...prev, photourl: data.url }))
    return data.url
  }

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
  const rawRank = (() => {
    const p = (athlete as any)?.prospect_ranking
    if (p != null && Number.isFinite(Number(p))) return Number(p)
    const r = (athlete as any)?.rankings
    if (r != null && typeof r === "number" && Number.isFinite(r)) return r
    if (r != null && typeof r === "object") {
      const n = (r as Record<string, unknown>)[2028] ?? (r as Record<string, unknown>)["2028"] ?? (r as Record<string, unknown>).class_2028 ?? (r as Record<string, unknown>).state ?? (r as Record<string, unknown>).national
      if (typeof n === "number" && Number.isFinite(n)) return n
    }
    return null
  })()
  // Only show rank on profile when athlete is on our official rankings: top 30 in 2026/2027, top 25 in 2028
  const maxRankForClass =
    graduationYear === 2028 ? 25 : graduationYear === 2026 || graduationYear === 2027 ? 30 : 0
  const prospectRanking =
    rawRank != null &&
    Number.isFinite(rawRank) &&
    rawRank >= 1 &&
    rawRank <= maxRankForClass
      ? rawRank
      : null

  const getAthletePhoto = () => {
    if (athleteName.toLowerCase().includes("liam hickey")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/liam-hickey-1746040496978.png"
    }

    if (athleteName.toLowerCase().includes("anna ockerman")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/anna-ockerman-1746893349014.png"
    }

    // Prefer athleteData so uploaded photo shows immediately (athleteData is updated on save)
    const photoUrl =
      athleteData?.photourl ||
      athleteData?.photo_url ||
      athleteData?.image_url ||
      athlete?.photourl ||
      athlete?.photo_url ||
      athlete?.image_url

    if (photoUrl && !imageError && photoUrl !== "/wrestler-silhouette.png") {
      return photoUrl
    }

    return "/wrestler-silhouette.png"
  }

  useEffect(() => {
    const loadLogos = async () => {
      try {
        if (highSchool && highSchool !== "Not specified") {
          const hsLogoUrl = athlete?.highSchoolLogoUrl ?? athlete?.highschoollogourl ?? (athlete as any)?.high_school_logo_url
          if (hsLogoUrl) {
            setHighSchoolLogo(hsLogoUrl)
          } else {
            const response = await fetch(`/api/logo-mappings/by-entity/highschool/${encodeURIComponent(highSchool)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logo_url) {
                setHighSchoolLogo(data.logo_url)
                setHighSchoolLogoLoadError(false)
              }
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

        const clubLogoUrl = athlete?.wrestlingClubLogoUrl ?? athlete?.wrestlingclublogourl ?? (athlete as any)?.wrestling_club_logo_url
        if (clubLogoUrl) {
          setClubLogo(clubLogoUrl)
          setClubLogoLoadError(false)
        } else if (wrestlingClub && wrestlingClub !== "Not specified") {
          const response = await fetch(`/api/logo-mappings/by-entity/club/${encodeURIComponent(wrestlingClub)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.logo_url) {
              setClubLogo(data.logo_url)
              setClubLogoLoadError(false)
            }
          }
        }

        // Load social media logos from logo manager with fallbacks
        const instagramResponse = await fetch(`/api/logo-mappings/by-entity/other/Instagram`)
        if (instagramResponse.ok) {
          const instagramData = await instagramResponse.json()
          if (instagramData.success && instagramData.logo_url) {
            console.log("✅ Instagram logo from logo manager:", instagramData.logo_url)
            setInstagramLogo(instagramData.logo_url)
          }
        }

        const floResponse = await fetch(`/api/logo-mappings/by-entity/other/Flo`)
        if (floResponse.ok) {
          const floData = await floResponse.json()
          console.log("🔍 Flo API response:", floData)
          if (floData.success && floData.logo_url) {
            console.log("✅ Flo logo from logo manager:", floData.logo_url)
            setFloLogo(floData.logo_url)
          } else {
            console.log("⚠️ Flo logo not found in logo manager, using fallback")
            // Fallback to provided URL only if not found in logo manager
            setFloLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/tSowJ6H6xqarm-EN8yomh-Flo.png")
          }
        } else {
          console.log("⚠️ Flo API call failed, using fallback")
          // Fallback to provided URL only if API call fails
          setFloLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/tSowJ6H6xqarm-EN8yomh-Flo.png")
        }

        const trackResponse = await fetch(`/api/logo-mappings/by-entity/other/Track`)
        if (trackResponse.ok) {
          const trackData = await trackResponse.json()
          console.log("🔍 Track API response:", trackData)
          if (trackData.success && trackData.logo_url) {
            console.log("✅ Track logo from logo manager:", trackData.logo_url)
            setTrackWrestlingLogo(trackData.logo_url)
          } else {
            console.log("⚠️ Track logo not found in logo manager, using fallback")
            // Fallback to provided URL only if not found in logo manager
            setTrackWrestlingLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/yr63Q1zyRJ9lUKClT1Xy7-Track.png")
          }
        } else {
          console.log("⚠️ Track API call failed, using fallback")
          // Fallback to provided URL only if API call fails
          setTrackWrestlingLogo("https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/yr63Q1zyRJ9lUKClT1Xy7-Track.png")
        }
      } catch (error) {
        console.error("Error loading logos:", error)
      }
    }

    loadLogos()
  }, [highSchool, college, athleteName, wrestlingClub, athlete?.wrestlingClubLogoUrl, athlete?.highSchoolLogoUrl])

  const achievements = (() => {
    try {
      return Array.isArray(athleteData?.achievements)
        ? athleteData.achievements
        : typeof athleteData?.achievements === "string"
          ? athleteData.achievements
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
      if (!athleteData?.additional_achievements) return []
      return athleteData.additional_achievements
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
      const fromJson = Array.isArray(athlete?.nhsca_results)
        ? (athlete.nhsca_results as { year?: number; placement?: string | number }[])
        : []
      const fromLegacy = [
        { year: "2026", placement: athlete?.nhsca_2026_placement },
        { year: "2025", placement: athlete?.nhsca_2025_placement },
        { year: "2024", placement: athlete?.nhsca_2024_placement },
        { year: "2023", placement: athlete?.nhsca_2023_placement },
      ]

      const placeToNum = (raw: string | number | undefined | null): number | null => {
        if (raw == null || raw === "") return null
        if (typeof raw === "number" && !isNaN(raw)) return raw
        const s = String(raw).trim()
        const low = s.toLowerCase()
        if (low.includes("champion") || low === "1st" || /^1(\s|$)/.test(low)) return 1
        const n = Number.parseInt(s, 10)
        if (!isNaN(n) && n >= 1 && n <= 99) return n
        const m = s.match(/^(\d+)(st|nd|rd|th)/i)
        if (m) {
          const v = Number.parseInt(m[1], 10)
          return isNaN(v) ? null : v
        }
        const lead = s.match(/(\d+)(?:st|nd|rd|th)?\s+all-american/i)
        if (lead) {
          const v = Number.parseInt(lead[1], 10)
          return isNaN(v) ? null : v
        }
        return null
      }

      const yearsAa: string[] = []
      for (const r of fromJson) {
        const place = placeToNum(r.placement as string | number | undefined)
        if (place != null && place >= 1 && place <= 8) {
          yearsAa.push(String(r.year ?? ""))
        }
      }
      for (const p of fromLegacy) {
        if (!p.placement || p.placement === "") continue
        const place = placeToNum(p.placement as string | number | undefined)
        if (place != null && place >= 1 && place <= 8) {
          yearsAa.push(p.year)
        }
      }

      const unique = [...new Set(yearsAa.filter(Boolean))]
      return unique.length > 0 ? `All American (${unique.join(", ")})` : null
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
          icon: "/nc-united-blue-logo.png",
        })
      } else if (ncUnitedTeam?.toLowerCase().includes("gold")) {
        badges.push({
          color: "bg-white text-yellow-700 border-2 border-yellow-700",
          text: "NC UNITED GOLD",
          icon: "/nc-united-blue-logo.png",
        })
      }

      const hasStateTitle = Array.isArray(nchsaaResults) && nchsaaResults.some((result) => result?.place === 1)
      if (hasStateTitle) {
        badges.push({ color: "bg-yellow-600 text-white", text: "STATE CHAMPION" })
      }

      const stateQualifier = (athlete?.state_qualifier ?? athleteData?.state_qualifier ?? "").toString().trim()
      if (stateQualifier) {
        badges.push({ color: "bg-green-600 text-white", text: "STATE QUALIFIER" })
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
      // Fallback to old columns (include 2026 — nhsca_results JSON may be empty while legacy cols are set)
      const nhscaYears = [
        { year: 2026, record: athlete?.nhsca_2026_record, placement: athlete?.nhsca_2026_placement },
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

    // Super 32: only from table (super32_results). Do NOT use athlete row (super_32_* / super32_results JSONB)
    // so we never show wrong/stale data. When tournamentResultsComponent is passed, Super32 comes from table only.
    // consolidatedTournaments is used for ordering; Super32 display is from tournamentResultsComponent.
    // Skip adding Super32 from athlete row here to avoid double/wrong data.

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
      if (nchsaaResults.length > 0) return

      try {
        const params = new URLSearchParams({ name: athleteName })
        const wrestlingName = (athlete as { wrestling_name?: string })?.wrestling_name?.trim()
        if (wrestlingName && wrestlingName !== athleteName) params.set("wrestling_name", wrestlingName)
        if (graduationYear && graduationYear > 0) params.set("graduation_year", String(graduationYear))
        const response = await fetch(`/api/wrestling-achievements?${params.toString()}`)
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
  }, [athleteName, graduationYear, (athlete as { wrestling_name?: string })?.wrestling_name, nchsaaResults.length])

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
  const cellPhone = (athleteData.cell || athleteData.cell_number || athleteData.phone)?.trim() || null
  const showHeroContactRow =
    !!instagramUrl ||
    !!athlete?.flo_profile_url ||
    !!athlete?.track_wrestling_profile_url ||
    (canSeePrivateInfo && !!cellPhone) ||
    (canEdit && !cellPhone)
  const scrollToContactAndEdit = () => {
    setEditingSection("contact")
    document.querySelector("[data-section=\"contact\"]")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div
      className={cn(
        mobileRecruiterLayout
          ? "flex flex-col gap-6 lg:gap-8 min-w-0 max-w-full"
          : "space-y-8 min-w-0 max-w-full",
        isDark && PROFILE_DARK_THEME,
      )}
    >
      {/* 1. Banner (hero with photo, name, weight, college) */}
      <Card
        className={cn(
          "profile-card overflow-hidden",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.hero,
          mobileRecruiterLayout && "-mx-4 rounded-none border-x-0 lg:mx-0 lg:rounded-lg lg:border-x",
        )}
      >
        <div className="relative">
          {/* Mobile view */}
          <div className="block lg:hidden">
            {mobileRecruiterLayout ? (
              <div className="relative min-h-[360px] h-[min(92vw,440px)] w-full overflow-hidden">
                <Image
                  src={athletePhoto || "/wrestler-silhouette.png"}
                  alt={athleteName}
                  fill
                  className="object-cover object-top"
                  onError={() => setImageError(true)}
                  priority
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#13294B] via-[#13294B]/55 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent" />

                <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2">
                  {currentUserId ? (
                    <Button
                      size="sm"
                      className="bg-white/90 hover:bg-white text-[#13294B] shadow-lg p-2 h-auto"
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/90 hover:text-white hover:bg-white/20 h-9 px-2"
                      onClick={handleShareProfile}
                      aria-label="Share profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {athlete.id && !isViewingOwnProfile && (
                      <MessageAthleteButton
                        athleteId={athlete.id}
                        claimedByUserId={athlete.claimed_by_user_id}
                        athleteName={athleteName}
                        className="h-9 px-2 text-white/90 hover:text-white hover:bg-white/20 border-0"
                        size="md"
                        iconClassName="w-4 h-4"
                      />
                    )}
                    <WatchListButton athleteId={athlete.id} />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pt-16 text-white">
                  <h1 className="text-3xl font-bold leading-tight drop-shadow-lg">{athleteName}</h1>

                  {isCommittedStatus && college && college !== "Not specified" && (
                    <div className="mt-3 flex items-center gap-3">
                      {collegeLogo ? (
                        <div className="relative h-12 w-12 shrink-0 rounded-full overflow-hidden border border-white/40 bg-white/90 shadow-lg">
                          <Image
                            src={collegeLogo}
                            alt={`${college} logo`}
                            fill
                            className="object-contain p-1.5"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-white text-base font-semibold shadow-lg">
                          {college
                            .split(" ")
                            .slice(0, 2)
                            .map((word) => word[0]?.toUpperCase())
                            .join("") || "C"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Committed To</p>
                        <p className="text-base font-bold truncate">{college}</p>
                      </div>
                    </div>
                  )}

                  {prospectRanking ? (
                    <div className="mt-3">
                      <Badge className="bg-[#D3B574] text-[#13294B] px-3 py-1 text-sm font-bold">
                        #{prospectRanking} - Class of {graduationYear}
                      </Badge>
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2 max-w-xs">
                    <div className="rounded-lg border border-white/20 bg-black/25 p-2.5 backdrop-blur-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">Year</p>
                      <p className="text-lg font-bold">{graduationYear || "N/A"}</p>
                    </div>
                    <div className="rounded-lg border border-white/20 bg-black/25 p-2.5 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">Weight</p>
                        {canEdit ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 text-white/80 hover:text-white hover:bg-white/20"
                            onClick={() => setEditingSection("weight")}
                            aria-label="Edit weight"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-lg font-bold">{weightClass}</p>
                    </div>
                  </div>

                  {showHeroContactRow ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto scroll-table-x pb-0.5">
                      {instagramUrl && instagramLogo && (
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white"
                          aria-label="Instagram"
                        >
                          <Image src={instagramLogo} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                          IG
                        </a>
                      )}
                      {canSeePrivateInfo && cellPhone && (
                        <a
                          href={`tel:${cellPhone.replace(/\D/g, "")}`}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white"
                          aria-label="Call"
                        >
                          <Phone className="h-4 w-4" />
                          Call
                        </a>
                      )}
                      {athlete?.flo_profile_url && floLogo && (
                        <a
                          href={athlete.flo_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white"
                          aria-label="Flo Wrestling"
                        >
                          <Image src={floLogo} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                          Flo
                        </a>
                      )}
                      {athlete?.track_wrestling_profile_url && trackWrestlingLogo && (
                        <a
                          href={athlete.track_wrestling_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white"
                          aria-label="Track Wrestling"
                        >
                          <Image src={trackWrestlingLogo} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                          Track
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
            <div className="relative h-80 w-full overflow-hidden">
              <Image
                src={athletePhoto || "/wrestler-silhouette.png"}
                alt={athleteName}
                fill
                className="object-cover object-top"
                onError={() => setImageError(true)}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

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
              {/* Share + Star - Top Right of Banner */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/20 h-9 px-3"
                  onClick={handleShareProfile}
                  aria-label="Share profile"
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Share
                </Button>
                {athlete.id && !isViewingOwnProfile && (
                  <MessageAthleteButton
                    athleteId={athlete.id}
                    claimedByUserId={athlete.claimed_by_user_id}
                    athleteName={athleteName}
                    className="h-9 px-2 text-white/90 hover:text-white hover:bg-white/20 border-0"
                    size="md"
                    iconClassName="w-4 h-4 mr-1"
                  />
                )}
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
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 flex flex-col">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-gray-200 text-xs font-medium uppercase tracking-wide">Weight</p>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20 -mr-1 -mt-0.5"
                        onClick={() => setEditingSection("weight")}
                        aria-label="Edit weight"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xl font-bold">{weightClass}</p>
                </div>
              </div>

              {/* Social / contact - Instagram, cell (coaches), Flo, Track; or prompt to add cell */}
              {showHeroContactRow && (
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {instagramUrl && instagramLogo && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                      aria-label="Instagram"
                    >
                      <Image
                        src={instagramLogo}
                        alt="Instagram"
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain"
                      />
                      <span>Instagram</span>
                    </a>
                  )}
                  {canSeePrivateInfo && cellPhone && (
                    <a
                      href={`tel:${cellPhone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                      aria-label="Call"
                    >
                      <Phone className="h-5 w-5 flex-shrink-0" />
                      <span>{cellPhone}</span>
                    </a>
                  )}
                  {athlete?.flo_profile_url && floLogo && (
                    <a
                      href={athlete.flo_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                      aria-label="Flo Wrestling"
                    >
                      <Image
                        src={floLogo}
                        alt="Flo"
                        width={18}
                        height={18}
                        className="w-[18px] h-[18px] object-contain"
                      />
                      <span>Flo</span>
                    </a>
                  )}
                  {athlete?.track_wrestling_profile_url && trackWrestlingLogo && (
                    <a
                      href={athlete.track_wrestling_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                      aria-label="Track Wrestling"
                    >
                      <Image
                        src={trackWrestlingLogo}
                        alt="Track"
                        width={18}
                        height={18}
                        className="w-[18px] h-[18px] object-contain"
                      />
                      <span>Track</span>
                    </a>
                  )}
                  {canEdit && !cellPhone && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2">
                      <p className="text-white/90 text-sm">Add your cell in Contact so coaches can reach you.</p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white text-[#13294B] hover:bg-white/90 shrink-0"
                        onClick={scrollToContactAndEdit}
                      >
                        Add cell
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
              </>
            )}
          </div>

          {/* Desktop view */}
          <div className="hidden lg:block">
            <div className="relative min-h-[360px] bg-gradient-to-r from-[#13294B] to-[#1e3a5f]">
              <div className="absolute inset-0 bg-black/10" />

              {/* Share + Message + Star - Top Right */}
              <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/90 hover:text-white hover:bg-white/20"
                  onClick={handleShareProfile}
                  aria-label="Share profile"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share profile
                </Button>
                {athlete.id && !isViewingOwnProfile && (
                  <MessageAthleteButton
                    athleteId={athlete.id}
                    claimedByUserId={athlete.claimed_by_user_id}
                    athleteName={athleteName}
                    className="h-9 px-2 text-white/90 hover:text-white hover:bg-white/20 border-0"
                    size="md"
                    iconClassName="w-4 h-4 mr-1"
                  />
                )}
                <WatchListButton athleteId={athlete.id} />
              </div>

              <div className="relative z-10 flex items-start gap-8 p-8">
                <div className="flex-shrink-0 w-72 h-[360px]">
                  <div className="relative w-full h-full rounded-xl overflow-hidden border-4 border-white/30 shadow-2xl bg-[#13294B]">
                    {canEdit ? (
                      <ImageUploadEditor
                        athleteId={athlete.id}
                        currentImageUrl={athletePhoto || undefined}
                        onUpload={handleImageUpload}
                        canEdit={canEdit}
                        className="w-full h-full"
                      />
                    ) : (
                      <Image
                        src={athletePhoto || "/wrestler-silhouette.png"}
                        alt={athleteName}
                        fill
                        className="object-cover object-top"
                        sizes="320px"
                        onError={() => setImageError(true)}
                        priority
                      />
                    )}
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
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 flex flex-col">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-gray-200 text-xs font-semibold uppercase tracking-wider">Weight</p>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/20 -mr-1"
                            onClick={() => setEditingSection("weight")}
                            aria-label="Edit weight"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white">{weightClass}</p>
                    </div>
                  </div>

                  {/* Social / contact - Instagram, cell (coaches), Flo, Track; or prompt to add cell */}
                  {showHeroContactRow && (
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {instagramUrl && instagramLogo && (
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                          aria-label="Instagram"
                        >
                          <Image
                            src={instagramLogo}
                            alt="Instagram"
                            width={20}
                            height={20}
                            className="w-5 h-5 object-contain"
                          />
                          <span>Instagram</span>
                        </a>
                      )}
                      {canSeePrivateInfo && cellPhone && (
                        <a
                          href={`tel:${cellPhone.replace(/\D/g, "")}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                          aria-label="Call"
                        >
                          <Phone className="h-5 w-5 flex-shrink-0" />
                          <span>{cellPhone}</span>
                        </a>
                      )}
                      {athlete?.flo_profile_url && floLogo && (
                        <a
                          href={athlete.flo_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                          aria-label="Flo Wrestling"
                        >
                          <Image
                            src={floLogo}
                            alt="Flo"
                            width={18}
                            height={18}
                            className="w-[18px] h-[18px] object-contain"
                          />
                          <span>Flo</span>
                        </a>
                      )}
                      {athlete?.track_wrestling_profile_url && trackWrestlingLogo && (
                        <a
                          href={athlete.track_wrestling_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-white text-sm font-medium transition-colors"
                          aria-label="Track Wrestling"
                        >
                          <Image
                            src={trackWrestlingLogo}
                            alt="Track"
                            width={18}
                            height={18}
                            className="w-[18px] h-[18px] object-contain"
                          />
                          <span>Track</span>
                        </a>
                      )}
                      {canEdit && !cellPhone && (
                        <div className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2">
                          <p className="text-white/90 text-sm">Add your cell in Contact so coaches can reach you.</p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white text-[#13294B] hover:bg-white/90 shrink-0"
                            onClick={scrollToContactAndEdit}
                          >
                            Add cell
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {mobileRecruiterLayout ? (
        <div className={PROFILE_SECTION_ORDER.nav}>
          <UnifiedProfileMobileNav showQualityWins={Boolean(aauScholasticQualityWins)} />
        </div>
      ) : null}

      {/* Weight Section (edit form when canEdit) */}
      {canEdit && editingSection === "weight" && (
        <Card className="profile-card border-t-4 border-t-[#D3B574] shadow-md">
          <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">Weight Class</h2>
            </div>
          </div>
          <div className="profile-card-body p-8">
            <InlineWeightEditor
              athleteId={athlete.id}
              weightClass={athleteData.weightclass || athleteData.weight_class}
              gender={athleteData.gender}
              onSave={handleInlineSave}
              onCancel={() => setEditingSection(null)}
            />
          </div>
        </Card>
      )}

      {/* 2. Athlete Profile (Bio) - always show for consistent structure */}
      <Card
        id="bio"
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.bio,
        )}
        data-section="bio"
      >
        <div className={cn(mobileRecruiterLayout ? PROFILE_SECTION_HEADER : "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className={cn("text-white", mobileRecruiterLayout ? "h-5 w-5" : "h-6 w-6")} />
                <h2 className={cn(mobileRecruiterLayout ? PROFILE_SECTION_TITLE : "text-2xl font-bold text-white")}>
                  Athlete Profile
                </h2>
              </div>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setEditingSection("bio")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className={cn(mobileRecruiterLayout ? PROFILE_CARD_BODY : "profile-card-body p-8")}>
            {editingSection === "bio" ? (
              <InlineBioEditor
                athleteId={athlete.id}
                bio={athleteData.bio}
                bioHeadline={athleteData.bio_headline}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex-1">
                    {athleteData?.bio_headline && (
                      <h3 className="profile-headline text-xl font-semibold text-[#002147] mb-4 leading-relaxed">{athleteData.bio_headline}</h3>
                    )}
                  </div>
                </div>
                {athleteData?.bio ? (
                  <div className="profile-panel bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{athleteData.bio}</p>
                  </div>
                ) : (
                  <p className="profile-text-muted text-gray-500 italic">{canEdit ? "No bio yet. Click Edit to add." : "No bio available."}</p>
                )}
              </>
            )}
          </div>
        </Card>

      {/* 3. High School and Programs - always show for consistent structure */}
      <Card
        id="programs"
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.programs,
        )}
        data-section="programs"
      >
          <div className={cn(mobileRecruiterLayout ? PROFILE_SECTION_HEADER : "bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className={cn("text-white", mobileRecruiterLayout ? "h-5 w-5" : "h-6 w-6")} />
                <h2 className={cn(mobileRecruiterLayout ? PROFILE_SECTION_TITLE : "text-2xl font-bold text-white")}>
                  {mobileRecruiterLayout ? (
                    <>
                      <span className="lg:hidden">School & Programs</span>
                      <span className="hidden lg:inline">High School and Programs</span>
                    </>
                  ) : (
                    "High School and Programs"
                  )}
                </h2>
              </div>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setEditingSection("school-club")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className={cn(mobileRecruiterLayout ? PROFILE_CARD_BODY : "profile-card-body p-8")}>
            {editingSection === "school-club" ? (
              <InlineSchoolClubEditor
                athleteId={athlete.id}
                highSchool={athleteData.highschool || athleteData.high_school}
                wrestlingClub={athleteData.wrestlingclub || athleteData.wrestlingClub}
                ncUnitedTeam={athleteData.ncUnitedTeam || athleteData.ncunitedteam}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <div
                className={cn(
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  mobileRecruiterLayout ? "grid-cols-2 gap-3 lg:gap-6" : "gap-6",
                )}
              >
                {highSchool && highSchool !== "Not specified" && (
                  <div className="profile-panel bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg bg-gray-50 p-1.5 lg:p-2 flex items-center justify-center mb-2 lg:mb-3 border border-gray-200 overflow-hidden">
                      {highSchoolLogo && !highSchoolLogoLoadError ? (
                        <Image
                          src={highSchoolLogo}
                          alt=""
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized={highSchoolLogo.startsWith("http")}
                          onError={() => setHighSchoolLogoLoadError(true)}
                        />
                      ) : (
                        <WorkingEntityLogo entityName={highSchool} entityType="highschool" size={48} />
                      )}
                    </div>
                    <p className="profile-label text-[10px] lg:text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 lg:mb-2">High School</p>
                    <p className="profile-text text-base lg:text-xl font-bold text-gray-900 leading-tight">{highSchool}</p>
                  </div>
                )}
                {wrestlingClub && wrestlingClub !== "Not specified" && (
                  <div className="profile-panel bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg bg-gray-50 p-1.5 lg:p-2 flex items-center justify-center mb-2 lg:mb-3 border border-gray-200 overflow-hidden">
                      {clubLogo && !clubLogoLoadError ? (
                        <Image
                          src={clubLogo}
                          alt=""
                          width={48}
                          height={48}
                          className="object-contain"
                          unoptimized={clubLogo.startsWith("http")}
                          onError={() => setClubLogoLoadError(true)}
                        />
                      ) : (
                        <WorkingEntityLogo entityName={wrestlingClub} entityType="club" size={48} />
                      )}
                    </div>
                    <p className="profile-label text-[10px] lg:text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 lg:mb-2">Wrestling Club</p>
                    <p className="profile-text text-base lg:text-xl font-bold text-gray-900 leading-tight">{wrestlingClub}</p>
                  </div>
                )}
                {ncUnitedTeam && ncUnitedTeam !== "none" && (
                  <div className="profile-panel bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
                    <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-lg bg-gray-50 p-1.5 lg:p-2 flex items-center justify-center mb-2 lg:mb-3 border border-gray-200">
                      <Image
                        src="/nc-united-blue-logo.png"
                        alt="NC United logo"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <p className="profile-label text-[10px] lg:text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1 lg:mb-2">NC United Program</p>
                    <p className="profile-text text-base lg:text-xl font-bold text-gray-900 leading-tight">
                      {ncUnitedTeam === "blue" ? "Blue Team" : ncUnitedTeam === "gold" ? "Gold Team" : ncUnitedTeam === "both" ? "Both Teams" : ncUnitedTeam}
                    </p>
                  </div>
                )}
                {(!highSchool || highSchool === "Not specified") && (!wrestlingClub || wrestlingClub === "Not specified") && (!ncUnitedTeam || ncUnitedTeam === "none") && (
                  <p className="profile-text-muted text-gray-500 italic col-span-full">{canEdit ? "No school or programs listed. Click Edit to add." : "No school or programs listed."}</p>
                )}
              </div>
            )}
          </div>
        </Card>

      {/* 4. Tournament Results - NC United National Team, NCHSAA, NHSCA, Super 32 */}
      <div
        className={cn(
          "min-w-0 max-w-full",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.nationalResults,
        )}
      >
        {tournamentResultsComponent}
      </div>

      {aauScholasticQualityWins ? (
        <div className={cn("min-w-0 max-w-full", mobileRecruiterLayout && PROFILE_SECTION_ORDER.qualityWins)}>
          <AauScholasticProfileQualityWinsSection entry={aauScholasticQualityWins} theme={theme} />
        </div>
      ) : null}

      {/* 5. Contact Information - always show for consistent structure */}
      <Card
        id="contact"
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.contact,
        )}
        data-section="contact"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Contact Information</h2>
            </div>
            {canEdit && !editingSection && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setEditingSection("contact")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <div className="p-8">
          {canEdit ? (
            editingSection === "contact" ? (
              <InlineContactEditor
                athleteId={athlete.id}
                cell={athleteData.cell || athleteData.cell_number || athleteData.phone}
                email={athleteData.email || athleteData.contact_email || athleteData.email_address}
                instagram={athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username}
                highlightVideoUrl={athleteData.highlight_video_url}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <div className="space-y-4">
                {(athleteData.cell || athleteData.cell_number || athleteData.phone) && (
                  <div className="profile-panel bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Cell Phone</p>
                    <p className="font-semibold text-gray-900">
                      {athleteData.cell || athleteData.cell_number || athleteData.phone}
                    </p>
                  </div>
                )}
                {(athleteData.email || athleteData.contact_email || athleteData.email_address) && (
                  <div className="profile-panel bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">
                      {athleteData.email || athleteData.contact_email || athleteData.email_address}
                    </p>
                  </div>
                )}
                {(athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username) && (
                  <div className="profile-panel bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Instagram</p>
                    <p className="font-semibold text-gray-900">
                      {athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username}
                    </p>
                  </div>
                )}
                {athleteData.highlight_video_url && (
                  <div className="profile-panel bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Highlight Video</p>
                    <a 
                      href={athleteData.highlight_video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      Watch Video
                    </a>
                  </div>
                )}
                {!(athleteData.cell || athleteData.cell_number || athleteData.phone) && !(athleteData.email || athleteData.contact_email || athleteData.email_address) && !(athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username) && !athleteData.highlight_video_url && (
                  <p className="profile-text-muted text-gray-500 italic">No contact information yet. Click Edit to add.</p>
                )}
              </div>
            )
          ) : (
            (isAdmin || isVerifiedCoach) && (athleteData.cell || athleteData.cell_number || athleteData.phone || athleteData.email || athleteData.contact_email || athleteData.email_address || athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username) ? (
              <div className="space-y-4">
                {(athleteData.cell || athleteData.cell_number || athleteData.phone) && (
                  <div className="profile-panel bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Cell Phone</p>
                    <p className="font-semibold text-gray-900">{athleteData.cell || athleteData.cell_number || athleteData.phone}</p>
                  </div>
                )}
                {(athleteData.email || athleteData.contact_email || athleteData.email_address) && (
                  <div className="profile-panel bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{athleteData.email || athleteData.contact_email || athleteData.email_address}</p>
                  </div>
                )}
                {(athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username) && (
                  <div className="profile-panel bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Instagram</p>
                    <p className="font-semibold text-gray-900">{athleteData.instagram || athleteData.instagram_handle || athleteData.instagram_username}</p>
                  </div>
                )}
                <p className="text-xs text-amber-700 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Visible to verified coaches and administrators only.</p>
              </div>
            ) : (
              <p className="profile-text-muted text-gray-500 italic">Contact information is available to verified college coaches and administrators.</p>
            )
          )}
        </div>
      </Card>

      {/* 6. Academics - always show for consistent structure */}
      <Card
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.academics,
        )}
        data-section="academics"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Academics</h2>
              </div>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setEditingSection("academics")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="profile-card-body p-8">
            {editingSection === "academics" ? (
              <InlineAcademicsEditor
                athleteId={athlete.id}
                gpa={effectiveGpa}
                sat={effectiveSat}
                act={effectiveAct}
                academicInterest={athleteData?.academic_interest}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <>
                {canSeePrivateInfo && hasAcademicData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {effectiveGpa != null && (
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <p className="text-sm text-gray-600 font-semibold uppercase tracking-wider mb-2">GPA</p>
                        <p className="text-4xl font-bold text-[#002147]">
                          {Number(effectiveGpa).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Grade Point Average</p>
                      </div>
                    )}
                    {effectiveSat != null && (
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <p className="text-sm text-gray-600 font-semibold uppercase tracking-wider mb-2">SAT</p>
                        <p className="text-4xl font-bold text-[#002147]">{effectiveSat}</p>
                        <p className="text-xs text-gray-500 mt-2">Standardized Test Score</p>
                      </div>
                    )}
                    {effectiveAct != null && (
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <p className="text-sm text-gray-600 font-semibold uppercase tracking-wider mb-2">ACT</p>
                        <p className="text-4xl font-bold text-[#002147]">{effectiveAct}</p>
                        <p className="text-xs text-gray-500 mt-2">Standardized Test Score</p>
                      </div>
                    )}
                  </div>
                )}
                {(athleteData?.academic_summary || athleteData?.academic_interest) && canSeePrivateInfo && (
                  <div className="mt-4 space-y-2">
                    {athleteData.academic_summary && (
                      <p className="text-sm text-gray-700">{athleteData.academic_summary}</p>
                    )}
                    {athleteData.academic_interest && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Academic Interest:</span> {athleteData.academic_interest}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            {!canSeePrivateInfo && hasAcademicData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-sm text-blue-700 text-center">
                  📊 GPA, SAT, and ACT are only visible to you (when signed in as this athlete), verified college coaches, and administrators.
                </p>
              </div>
            )}
          </div>
        </Card>

      {/* 7. Highlight Reel - always show for consistent structure */}
      <Card
        id="highlights"
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.highlights,
        )}
        data-section="highlights"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video className="h-6 w-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Highlight Reel</h2>
              </div>
              {canEdit && !editingSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setEditingSection("highlight-video")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {athleteData?.highlight_video_url ? "Update video" : "Add video"}
                </Button>
              )}
            </div>
          </div>
          <div className="profile-card-body p-8">
            {editingSection === "highlight-video" ? (
              <InlineHighlightVideoEditor
                athleteId={athlete.id}
                highlightVideoUrl={athleteData.highlight_video_url}
                onSave={handleInlineSave}
                onCancel={() => setEditingSection(null)}
              />
            ) : athleteData?.highlight_video_url ? (
              (() => {
                const url = athleteData.highlight_video_url
                const videoId = getYouTubeVideoId(url)
                if (isDirectHighlightVideoUrl(url)) {
                  return renderDirectHighlightVideo(
                    url,
                    `${athleteData.name ?? "Athlete"} highlight reel`
                  )
                }
                if (!videoId) {
                  return (
                    <p className="text-gray-600">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Watch video
                      </a>
                      {canEdit && " — Use Edit to replace with a valid YouTube link for embedding."}
                    </p>
                  )
                }
                return (
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="Wrestling Highlight Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                      style={{ border: "none" }}
                    />
                  </div>
                )
              })()
            ) : nationalTeamHighlightVideos.length > 0 ? (
              <div className="space-y-6">
                {nationalTeamHighlightVideos.map((highlight) => (
                  <div key={`${highlight.event}-${highlight.year}-${highlight.videoSrc}`}>
                    <p className={cn("text-sm font-semibold mb-3", isDark ? "text-white/80" : "text-gray-700")}>
                      {highlight.event} {highlight.year}
                    </p>
                    {renderDirectHighlightVideo(highlight.videoSrc, highlight.ariaLabel)}
                    <p className={cn("mt-2 text-sm", isDark ? "text-white/55" : "text-gray-600")}>{highlight.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={isDark ? "text-white/55" : "text-gray-600"}>
                {canEdit ? "Add a YouTube highlight video or upload a video file via admin. Click the button above to paste your link." : "No highlight video yet."}
              </p>
            )}
            {athleteData?.highlight_video_url && nationalTeamHighlightVideos.length > 0 ? (
              <div
                className={cn(
                  "mt-8 space-y-6 border-t pt-8",
                  isDark ? "border-white/10" : "border-gray-200",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold uppercase tracking-wider",
                    isDark ? "text-white/45" : "text-gray-500",
                  )}
                >
                  NC United National Team Highlights
                </p>
                {nationalTeamHighlightVideos.map((highlight) => (
                  <div key={`${highlight.event}-${highlight.year}-${highlight.videoSrc}`}>
                    <p className={cn("text-sm font-semibold mb-3", isDark ? "text-white/80" : "text-gray-700")}>
                      {highlight.event} {highlight.year}
                    </p>
                    {renderDirectHighlightVideo(highlight.videoSrc, highlight.ariaLabel)}
                    <p className={cn("mt-2 text-sm", isDark ? "text-white/55" : "text-gray-600")}>{highlight.title}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

      {/* 8. College Opens Experience - always show for consistent structure */}
      <Card
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.collegeOpens,
        )}
        data-section="college-opens"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">College Opens Experience</h2>
            </div>
            {canEdit && !editingSection && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setEditingSection("college-opens")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <div className="profile-card-body p-8">
              {editingSection === "college-opens" ? (
                <InlineCollegeOpensEditor
                  athleteId={athlete.id}
                  collegeOpens={athleteData.college_opens_experience}
                  onSave={handleInlineSave}
                  onCancel={() => setEditingSection(null)}
                />
              ) : (
            <div className="whitespace-pre-line text-gray-700 leading-relaxed">
            {athleteData.college_opens_experience || (canEdit ? "No college opens experience listed. Click Edit to add." : "No college opens experience listed.")}
          </div>
          )}
        </div>
      </Card>

      {/* 9. Achievements - always show for consistent structure */}
      <Card
        className={cn(
          "profile-card border-t-4 border-t-[#D3B574] shadow-md",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.achievements,
        )}
        data-section="achievements"
      >
        <div className="bg-gradient-to-r from-[#13294B] to-[#1e3a5f] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Achievements</h2>
            </div>
            {canEdit && !editingSection && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setEditingSection("achievements")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
        <div className="profile-card-body p-8">
              {editingSection === "achievements" ? (
                <InlineAchievementsEditor
                  athleteId={athlete.id}
                  achievements={athleteData.achievements}
                  additionalAchievements={athleteData.additional_achievements}
                  onSave={handleInlineSave}
                  onCancel={() => setEditingSection(null)}
                />
              ) : (
                <>
                  {(() => {
                    const stateQualifierText = (athleteData?.state_qualifier ?? athlete?.state_qualifier ?? "").toString().trim()
                    return stateQualifierText ? (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">State Qualifier</h3>
                        <p className="text-gray-700">{stateQualifierText}</p>
                      </div>
                    ) : null
                  })()}
                  {achievements.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Achievements</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {achievements.map((achievement, index) => (
                          <li key={`achievement-${index}`} className="text-base leading-relaxed">
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {additionalAchievements.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Achievements</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        {additionalAchievements.map((achievement, index) => (
                          <li key={`additional-achievement-${index}`} className="text-base leading-relaxed">
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {achievements.length === 0 && additionalAchievements.length === 0 && !(athleteData?.state_qualifier ?? athlete?.state_qualifier)?.toString().trim() && (
                    <p className="profile-text-muted text-gray-500 italic">{canEdit ? "No achievements yet. Click Edit to add." : "No achievements listed."}</p>
                  )}
                </>
              )}
            </div>
          </Card>

      {/* 10. High School Career Match Results */}
      <div
        className={cn(
          "min-w-0 max-w-full w-full",
          isDark && "profile-match-data",
          mobileRecruiterLayout && PROFILE_SECTION_ORDER.inSeason,
        )}
      >
        <MatchDataSectionImproved
          athleteId={athlete.id}
          athleteName={athleteName}
          graduationYear={graduationYear}
          theme={isDark ? "dark" : "light"}
          collapseOnMobile={mobileRecruiterLayout}
        />
      </div>

      {/* Last Edited By - Footer */}
      {(athlete.last_edited_by || athlete.last_edited_at) && (
        <div className="container mx-auto px-4 py-4">
          <p className={cn("text-xs text-center", isDark ? "text-white/40" : "text-gray-500")}>
            {athlete.last_edited_at && (
              <>
                Last edited{" "}
                {athlete.last_edited_by && (
                  <>
                    by <span className="font-medium">{athlete.last_edited_by}</span>{" "}
                  </>
                )}
                on {new Date(athlete.last_edited_at).toLocaleDateString()} at{" "}
                {new Date(athlete.last_edited_at).toLocaleTimeString()}
              </>
            )}
          </p>
        </div>
      )}

      {/* Request Edit - only for non-owners (owners use inline edit) */}
      {!canEdit && (
        <div className="container mx-auto px-4 py-8">
          <Card className={cn("profile-card border-2", isDark ? "border-white/20 bg-white/5" : "border-blue-200 bg-blue-50")}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className={cn("text-lg font-semibold mb-1", isDark ? "text-white" : "text-gray-900")}>
                    Help Keep This Profile Accurate
                  </h3>
                  <p className={cn("text-sm", isDark ? "text-white/60" : "text-gray-600")}>
                    Found an error or have updated information? Request an edit to this profile.
                  </p>
                </div>
                <Button
                  onClick={() => setShowEditModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                  size="lg"
                >
                  Request Profile Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
