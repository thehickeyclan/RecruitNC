"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RotateCw, ExternalLink, Instagram, Calendar } from "lucide-react"
import {
  buildCommitmentCardHonorBadges,
  getCommitmentHonorBadgesForAthlete,
  COMMITMENT_CARD_HONOR_ORDER,
  mergeCommitmentHonorBadgesForDisplay,
} from "@/lib/commitment-card-honors"
import { prefetchAthleteProfile } from "@/lib/prefetch-athlete-profile"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
interface Athlete {
  id: string
  name: string
  graduationyear?: number
  graduationYear?: number
  // Widened to match the canonical ProfessionalAthlete contract in lib/professional-athlete.ts,
  // which normalizeAthleteList() emits — the DB stores weights as both text and numbers.
  weightclass?: string | number
  weightClass?: string
  weight_class?: string
  college_weight_class?: string | number
  hs_weight_class?: string
  highschool?: string
  highSchool?: string
  high_school?: string
  wrestlingClub?: string
  wrestlingclub?: string
  wrestling_club?: string
  club?: string
  college?: string
  division?: string
  gender?: string
  commitmentdate?: string
  commitmentDate?: string
  commitment_date?: string
  photourl?: string
  photoUrl?: string
  commitmentPhotoUrl?: string
  image_url?: string
  achievements?: string[] | string
  /** Extra honors text from profile/API when present */
  additional_achievements?: string[] | string
  /** NCHSAA state rows JSON on athlete (optional on list payloads) */
  nchsaa_results?: unknown
  location?: string
  ncUnitedTeam?: string
  // nc_rank is optional per the canonical contract, and the read at ~:510 already null-checks it.
  rankings?: { nc_rank?: string }
  // Canonical contract allows number/null; the read at ~:509 already null-checks and coerces.
  prospect_ranking?: string | number | null
  gpa?: number
  GPA?: number
}

interface ProfessionalCommitmentCardProps {
  athlete: Athlete
  /** Grid/list pages: defer per-card API calls until the card is flipped. */
  listMode?: boolean
}

/** Honor pill order on card back — same tuple as `getCommitmentHonorBadgesForAthlete` (`lib/commitment-card-honors`). */
const HONOR_BADGE_DISPLAY_ORDER = COMMITMENT_CARD_HONOR_ORDER

function normalizeAwardDisplayName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .replace(/\bbenley\b/g, "bentley")
    .trim()
}

/** True when display name is clearly the same person as canonical "First Last". */
function awardRecipientMatches(normalizedDisplay: string, canonicalFullName: string): boolean {
  const c = normalizeAwardDisplayName(canonicalFullName)
  if (!normalizedDisplay || !c) return false
  if (normalizedDisplay === c) return true
  const parts = c.split(" ").filter(Boolean)
  if (parts.length < 2) return normalizedDisplay.includes(c)
  return parts.every((p) => normalizedDisplay.includes(p))
}

/** Prestigious NC high-school wrestling awards — solid gold chips on flip-card back. */
function getNcLegacyAwardBadges(displayName: string | undefined): { key: string; label: string }[] {
  const n = normalizeAwardDisplayName(displayName ?? "")
  if (!n) return []

  const daveSchultzCanonical = ["Bentley Sly", "Liam Hickey"]
  const triciaSaundersCanonical = ["Faith Bane", "Leah Edwards"]

  const out: { key: string; label: string }[] = []

  if (daveSchultzCanonical.some((c) => awardRecipientMatches(n, c))) {
    out.push({ key: "dave-schultz", label: "Dave Schultz Award" })
  }
  if (triciaSaundersCanonical.some((c) => awardRecipientMatches(n, c))) {
    out.push({ key: "tricia-saunders", label: "Tricia Saunders Award" })
  }

  return out
}

interface SeasonRecord {
  year: string
  displayYear: string
  wins: number
  losses: number
  winPercentage: number
}

type CardAchievementRow = {
  year?: unknown
  classification?: unknown
  division?: unknown
  weight?: unknown
  weight_class?: unknown
  place?: unknown
  placement?: unknown
  record?: unknown
}

export function ProfessionalCommitmentCard({ athlete, listMode = false }: ProfessionalCommitmentCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [highSchoolLogoUrl, setHighSchoolLogoUrl] = useState<string | null>(null)
  const [highSchoolLogoError, setHighSchoolLogoError] = useState(false)
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null)
  const [clubLogoError, setClubLogoError] = useState(false)
  const [collegeLogoUrl, setCollegeLogoUrl] = useState<string | null>(null)
  const [collegeLogoError, setCollegeLogoError] = useState(false)
  const [displayClubName, setDisplayClubName] = useState<string>("")
  const [careerStats, setCareerStats] = useState<{
    seasons: SeasonRecord[]
    totalWins: number
    totalLosses: number
    totalWinPercentage: number
  } | null>(null)
  /** NCHSAA rows from /api/wrestling-achievements (table-backed state champ / placer / SQ). */
  const [serverStateHonors, setServerStateHonors] = useState<string[]>([])
  /** When present, honors were resolved on the server from the full `athletes` row + NCHSAA merge (authoritative for list pages). */
  const [serverCommitmentHonors, setServerCommitmentHonors] = useState<string[] | null>(null)
  const [achievementResults, setAchievementResults] = useState<{
    nchsaa: CardAchievementRow[]
    nhsca: CardAchievementRow[]
    super32: CardAchievementRow[]
  }>({ nchsaa: [], nhsca: [], super32: [] })

  useEffect(() => {
    // Reset face + logos when the card athlete changes so prior college marks don't stick / mislabel.
    setIsFlipped(false)
    setImageError(false)
    setCollegeLogoUrl(null)
    setCollegeLogoError(false)
    setHighSchoolLogoUrl(null)
    setHighSchoolLogoError(false)
    setClubLogoUrl(null)
    setClubLogoError(false)
    setAchievementResults({ nchsaa: [], nhsca: [], super32: [] })
  }, [athlete.name, athlete.id])

  const getClubName = () => {
    const club = athlete.wrestling_club || athlete.wrestlingClub || athlete.wrestlingclub || athlete.club

    if (club && club.trim() !== "" && club !== "none" && club !== "None") {
      return club
    }

    const athleteName = athlete.name?.toLowerCase() || ""
    if (athleteName.includes("anna ockerman")) {
      return "RAW"
    } else if (athleteName.includes("colt campbell")) {
      return "Combat"
    } else if (athleteName.includes("liam hickey")) {
      return "RAW"
    } else if (athleteName.includes("jackson rowling")) {
      return "Darkhorse"
    }

    return "Wrestling Club"
  }

  useEffect(() => {
    if (listMode && !isFlipped) return

    const loadLogos = async () => {
      try {
        const highSchool = athlete.highschool || athlete.highSchool || athlete.high_school
        if (highSchool) {
          try {
            const response = await fetch(`/api/logo-mappings/by-entity/highschool/${encodeURIComponent(highSchool)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logo_url) {
                setHighSchoolLogoUrl(data.logo_url)
                setHighSchoolLogoError(false)
              }
            }
          } catch (error) {
            console.error("Error loading high school logo:", error)
          }
        }

        const finalClubName = getClubName()
        setDisplayClubName(finalClubName)

        if (
          finalClubName &&
          finalClubName.trim() &&
          finalClubName !== "none" &&
          finalClubName !== "None" &&
          finalClubName !== "Wrestling Club"
        ) {
          try {
            const clubUrl = `/api/logo-mappings/by-entity/club/${encodeURIComponent(finalClubName)}`
            const response = await fetch(clubUrl)

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logo_url) {
                setClubLogoUrl(data.logo_url)
                setClubLogoError(false)
              }
            }
          } catch (error) {
            console.error(`❌ Club logo: Error loading logo for "${finalClubName}":`, error)
          }
        }

        if (athlete.college) {
          try {
            const collegeUrl = `/api/logo-mappings/by-entity/college/${encodeURIComponent(athlete.college)}`
            const response = await fetch(collegeUrl, {
              method: "GET",
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logo_url) {
                setCollegeLogoUrl(data.logo_url)
                setCollegeLogoError(false)
              } else {
                setCollegeLogoUrl(null)
              }
            } else {
              setCollegeLogoUrl(null)
            }
          } catch (error) {
            console.error(`❌ College logo: Network error loading logo for "${athlete.college}":`, error)
            setCollegeLogoUrl(null)
          }
        } else {
          setCollegeLogoUrl(null)
        }
      } catch (error) {
        console.error("Error loading logos:", error)
      }
    }

    loadLogos()
  }, [
    listMode,
    isFlipped,
    athlete.highschool,
    athlete.highSchool,
    athlete.club,
    athlete.wrestlingClub,
    athlete.wrestlingclub,
    athlete.college,
    athlete.name,
  ])

  useEffect(() => {
    if (listMode && !isFlipped) return

    const fetchCareerRecord = async () => {
      if (!athlete.id) return

      try {
        const response = await fetch(`/api/athletes/${athlete.id}/matches-direct`, { cache: "no-store" })
        const data = await response.json()

        if (data.success && Array.isArray(data.matches) && data.matches.length > 0) {
          const gradYear = athlete.graduationyear || athlete.graduationYear || 2026
          const gradeMap: { [key: string]: string } = {
            Freshman: `Freshman (${gradYear - 4}-${String(gradYear - 3).slice(-2)})`,
            Sophomore: `Sophomore (${gradYear - 3}-${String(gradYear - 2).slice(-2)})`,
            Junior: `Junior (${gradYear - 2}-${String(gradYear - 1).slice(-2)})`,
            Senior: `Senior (${gradYear - 1}-${String(gradYear).slice(-2)})`,
          }

          // Normalize grade string to canonical key for grouping and chronological sort (Freshman → Senior)
          const gradeOrder = ["Freshman", "Sophomore", "Junior", "Senior"] as const
          const toCanonicalGrade = (raw: string): string => {
            const lower = raw.toLowerCase()
            if (lower.includes("freshman")) return "Freshman"
            if (lower.includes("sophomore")) return "Sophomore"
            if (lower.includes("junior")) return "Junior"
            if (lower.includes("senior")) return "Senior"
            if (gradeOrder.includes(raw as any)) return raw
            return raw
          }

          // Group by canonical grade to handle multiple records per season
          const gradeGroups: { [key: string]: { wins: number; losses: number } } = {}

          data.matches.forEach((season: any) => {
            const raw = season.grade ?? season.year ?? "Unknown"
            const rawStr = typeof raw === "string" ? raw : String(raw)
            if (!rawStr || rawStr === "Unknown") return
            const grade = toCanonicalGrade(rawStr)

            if (!gradeGroups[grade]) {
              gradeGroups[grade] = { wins: 0, losses: 0 }
            }

            gradeGroups[grade].wins += Number(season.wins) || 0
            gradeGroups[grade].losses += Number(season.losses) || 0
          })

          // Convert to array and sort by grade order (Freshman first, then Sophomore, Junior, Senior)
          const seasons: SeasonRecord[] = gradeOrder
            .filter((grade) => gradeGroups[grade])
            .map((grade) => {
              const stats = gradeGroups[grade]
              const wins = stats.wins
              const losses = stats.losses
              const total = wins + losses
              const winPercentage = total > 0 ? (wins / total) * 100 : 0
              const displayYear = gradeMap[grade] || grade

              return {
                year: grade,
                displayYear,
                wins,
                losses,
                winPercentage: Math.round(winPercentage * 10) / 10,
                sortOrder: gradeOrder.indexOf(grade),
              }
            })
            .filter((s: SeasonRecord) => s.wins > 0 || s.losses > 0)

          const totalWins = seasons.reduce((sum, s) => sum + s.wins, 0)
          const totalLosses = seasons.reduce((sum, s) => sum + s.losses, 0)
          const totalMatches = totalWins + totalLosses
          const totalWinPercentage = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0

          setCareerStats({
            seasons,
            totalWins,
            totalLosses,
            totalWinPercentage: Math.round(totalWinPercentage * 10) / 10,
          })
        }
      } catch (error) {
        console.error("[v0] Error fetching career record:", error)
      }
    }

    fetchCareerRecord()
  }, [athlete.id, athlete.graduationyear, athlete.graduationYear, listMode, isFlipped])

  useEffect(() => {
    if (listMode && !isFlipped) return
    setServerStateHonors([])
    setServerCommitmentHonors(null)
    const id = athlete.id?.trim()
    if (!id || id.includes("fallback") || id.startsWith("row-") || id.startsWith("recover-")) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/wrestling-achievements?athlete_id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        })
        const data = await res.json()
        if (cancelled || !data?.success || !data?.achievements) return

        const ach = data.achievements as {
          state_championships?: unknown[]
          all_results?: {
            nchsaa?: CardAchievementRow[]
            nhsca?: CardAchievementRow[]
            super32?: CardAchievementRow[]
          }
        }

        setAchievementResults({
          nchsaa: ach.all_results?.nchsaa ?? [],
          nhsca: ach.all_results?.nhsca ?? [],
          super32: ach.all_results?.super32 ?? [],
        })

        if (Array.isArray(data.commitment_card_honor_badges)) {
          setServerCommitmentHonors(data.commitment_card_honor_badges)
          return
        }

        setServerCommitmentHonors(
          buildCommitmentCardHonorBadges({
            athlete: athlete as Record<string, unknown>,
            nchsaaMergedRows: ach.all_results?.nchsaa ?? [],
            nhscaMergedRows: ach.all_results?.nhsca ?? [],
            super32MergedRows: ach.all_results?.super32 ?? [],
          }),
        )
      } catch (e) {
        console.error("[RecruitNC] commitment-card state honors fetch:", e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [athlete, listMode, isFlipped])

  const getAthletePhoto = () => {
    if (athlete.name?.toLowerCase().includes("liam hickey")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/liam-hickey-1746040496978.png"
    }

    if (athlete.name?.toLowerCase().includes("anna ockerman")) {
      return "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/athlete/anna-ockerman-1746893349014.png"
    }

    if (athlete.name?.toLowerCase().includes("kenneth")) {
      const photoUrl =
        athlete.commitmentPhotoUrl || athlete.photoUrl || athlete.photourl || athlete.photo_url || athlete.image_url

      if (
        photoUrl &&
        photoUrl.trim() !== "" &&
        photoUrl !== "/wrestler-silhouette.png" &&
        photoUrl !== "null" &&
        photoUrl !== "undefined" &&
        photoUrl !== "Dogtown" &&
        (photoUrl.startsWith("http://") || photoUrl.startsWith("https://") || photoUrl.startsWith("/")) &&
        !imageError
      ) {
        return photoUrl
      } else {
        return "/wrestler-silhouette.png"
      }
    }

    const photoUrl =
      athlete.commitmentPhotoUrl || athlete.photoUrl || athlete.photourl || athlete.photo_url || athlete.image_url

    if (
      photoUrl &&
      photoUrl.trim() !== "" &&
      photoUrl !== "/wrestler-silhouette.png" &&
      photoUrl !== "null" &&
      photoUrl !== "undefined" &&
      !imageError
    ) {
      return photoUrl
    }

    if (athlete.name?.toLowerCase().includes("colt campbell")) {
      return "/wrestler-Colt-Campbell.png"
    }

    return "/wrestler-silhouette.png"
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (e) {
      return dateString
    }
  }

  const getClassYearBadgeColor = () => {
    const year = String(athlete.graduationyear || "")

    if (year.includes("2025")) {
      return "bg-blue-600 text-white border-blue-700"
    }
    if (year.includes("2026")) {
      return "bg-red-600 text-white border-red-700"
    }
    if (year.includes("2024")) {
      return "bg-green-600 text-white border-green-700"
    }

    return "bg-gray-600 text-white border-gray-700"
  }

  const athletePhoto = getAthletePhoto()
  const commitmentDate = formatDate(athlete.commitmentdate)
  const classYearBadgeColor = getClassYearBadgeColor()
  const ncUnitedTeamStatus = getNCUnitedTeamStatus(athlete)

  const getInstagramHandle = () => {
    return (
      athlete.instagram ||
      athlete.instagramHandle ||
      athlete.instagram_handle ||
      (athlete.name?.toLowerCase().includes("anna ockerman")
        ? "anna.ockerman"
        : athlete.name?.toLowerCase().includes("liam hickey")
          ? "liam.hickey"
          : athlete.name?.toLowerCase().includes("colt campbell")
            ? "colt.campbell"
            : null)
    )
  }

  const instagramHandle = getInstagramHandle()

  const rawNcRank =
    athlete?.prospect_ranking != null && String(athlete.prospect_ranking).trim() !== ""
      ? Number(athlete.prospect_ranking)
      : athlete?.rankings?.nc_rank != null
        ? Number(athlete.rankings.nc_rank)
        : null
  const ncRankPositive = rawNcRank != null && Number.isFinite(rawNcRank) && rawNcRank >= 1 ? rawNcRank : null
  const ncRankClassYear = Number(athlete.graduationyear ?? athlete.graduationYear)
  const ncRankPublicCap = isPublicRankingsYearPublished(ncRankClassYear)
    ? getPublicRankingsMax(ncRankClassYear)
    : 0
  /** Shown below header on card back only when ranked (header already shows Class of). */
  const backCardNcRank = ncRankPositive != null && ncRankPositive <= ncRankPublicCap ? ncRankPositive : null

  const honorBadges = useMemo(() => getCommitmentHonorBadgesForAthlete(athlete), [athlete])

  const honorBadgesMerged = useMemo(() => {
    if (serverCommitmentHonors != null) {
      return HONOR_BADGE_DISPLAY_ORDER.filter((b) => serverCommitmentHonors.includes(b))
    }
    return mergeCommitmentHonorBadgesForDisplay(honorBadges, serverStateHonors)
  }, [serverCommitmentHonors, honorBadges, serverStateHonors])

  const legacyAwardBadges = useMemo(() => getNcLegacyAwardBadges(athlete.name), [athlete.name])

  const cardResume = useMemo(() => {
    const numericPlace = (value: unknown): number | null => {
      const match = String(value ?? "").trim().match(/^(\d{1,2})/)
      if (!match) return null
      const place = Number(match[1])
      return Number.isFinite(place) ? place : null
    }
    const yearOf = (row: CardAchievementRow) => {
      const year = Number(row.year)
      return Number.isFinite(year) ? year : 0
    }
    const weightOf = (row: CardAchievementRow) =>
      String(row.weight_class ?? row.weight ?? "")
        .trim()
        .replace(/\s*lbs?\.?$/i, "")
    const ordinal = (place: number) => {
      const mod100 = place % 100
      if (mod100 >= 11 && mod100 <= 13) return `${place}th`
      if (place % 10 === 1) return `${place}st`
      if (place % 10 === 2) return `${place}nd`
      if (place % 10 === 3) return `${place}rd`
      return `${place}th`
    }

    const stateRows = achievementResults.nchsaa
      .map((row) => ({ row, place: numericPlace(row.place) }))
      .filter((item): item is { row: CardAchievementRow; place: number } => item.place != null && item.place >= 1)
    const nationalRows = [
      ...achievementResults.nhsca.map((row) => ({ tournament: "NHSCA Nationals", row })),
      ...achievementResults.super32.map((row) => ({ tournament: "Super 32", row })),
    ]
      .map((item) => ({ ...item, place: numericPlace(item.row.placement) }))
      .filter((item): item is { tournament: string; row: CardAchievementRow; place: number } =>
        item.place != null && item.place >= 1 && item.place <= 8,
      )

    const lines = [
      ...nationalRows.map(({ tournament, row, place }) => ({
        year: yearOf(row),
        priority: 0,
        label: `${yearOf(row) || ""} ${tournament} · ${ordinal(place)}${weightOf(row) ? ` · ${weightOf(row)} lbs` : ""}`.trim(),
      })),
      ...stateRows.map(({ row, place }) => ({
        year: yearOf(row),
        priority: place === 1 ? 1 : 2,
        label: `${yearOf(row) || ""} NCHSAA${row.classification ? ` ${String(row.classification)}` : ""} · ${place === 1 ? "Champion" : ordinal(place)}${weightOf(row) ? ` · ${weightOf(row)} lbs` : ""}`.trim(),
      })),
    ]
      .sort((a, b) => b.year - a.year || a.priority - b.priority)
      .filter((item, index, all) => all.findIndex((candidate) => candidate.label === item.label) === index)
      .slice(0, 3)

    return {
      lines,
      stateTitles: stateRows.filter((item) => item.place === 1).length,
      statePlacements: stateRows.length,
      nationalPlacements: Math.max(nationalRows.length, honorBadgesMerged.includes("All-American") ? 1 : 0),
    }
  }, [achievementResults, honorBadgesMerged])

  /** Bias above center so foreheads/headgear stay in frame; ~18% is a good default for full-body and mat shots. */
  const getImagePositionClass = () => {
    const athleteName = athlete.name?.toLowerCase() || ""
    if (athleteName.includes("lorenzo alston")) {
      return "object-cover [object-position:center_30%]"
    }
    return "object-cover [object-position:center_18%]"
  }

  const hasValidClub = () => {
    const club = athlete.wrestling_club || athlete.wrestlingClub || athlete.wrestlingclub || athlete.club
    return club && club.trim() !== "" && club !== "none" && club !== "None" && club !== "Wrestling Club"
  }

  return (
    <div
      className="h-[500px] w-full max-w-[350px] mx-auto perspective-1000"
      onMouseEnter={() => prefetchAthleteProfile(athlete.id)}
    >
      <div
        className={`relative h-full w-full transition-transform duration-700 preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        <Card
          className={`absolute inset-0 h-full w-full overflow-hidden rounded-xl border-0 shadow-lg backface-hidden cursor-pointer p-0 gap-0 flex flex-col ${
            !isFlipped ? "z-20" : "z-10"
          }`}
          onClick={handleFlip}
        >
          <div className="relative flex-1 min-h-0 w-full">
            <Image
              src={athletePhoto || "/placeholder.svg"}
              alt={athlete.name || "Athlete"}
              fill
              className={getImagePositionClass()}
              onError={() => {
                console.log(`[v0] Image load error for ${athlete.name}, URL: ${athletePhoto}`)
                setImageError(true)
              }}
              sizes="(max-width: 768px) 100vw, 350px"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

            {ncUnitedTeamStatus && (
              <div className="absolute top-3 right-3 z-10">
                <Image
                  src={
                    ncUnitedTeamStatus === "blue"
                      ? "/nc-united-blue-logo.png"
                      : ncUnitedTeamStatus === "gold"
                        ? "/nc-united-gold-logo.png"
                        : "/nc-united-main-logo.png"
                  }
                  alt={`NC United ${ncUnitedTeamStatus === "blue" ? "Blue" : ncUnitedTeamStatus === "gold" ? "Gold" : ""}`}
                  width={40}
                  height={40}
                  className="object-contain drop-shadow-md"
                />
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h2 className="text-2xl font-black mb-2 text-white drop-shadow-lg leading-tight">
                {athlete.name?.toUpperCase() || "ATHLETE NAME"}
              </h2>

              <p className="text-sm text-white/90 mb-1 font-medium">
                {athlete.highschool || athlete.highSchool || "HIGH SCHOOL"}
              </p>

              <div className="text-3xl font-black text-white drop-shadow-lg mb-1 tracking-wide">
                {athlete.college?.toUpperCase() || "COLLEGE"}
              </div>

              <div className="text-lg font-bold text-green-400 drop-shadow-lg mb-3">COMMITTED</div>

              <div className="text-center">
                <p className="text-sm text-white/60 font-light">Tap To Flip Card</p>
              </div>
            </div>
          </div>
        </Card>

        <Card
          className={`absolute h-full w-full overflow-hidden rounded-xl border-0 shadow-lg backface-hidden card-back ${
            isFlipped ? "z-20" : "z-10"
          }`}
          style={{
            transform: "rotateY(180deg)",
            WebkitTransform: "rotateY(180deg)",
            backgroundColor: "#0D1A4D",
          }}
        >
          <div className="flex h-full flex-col p-4">
            <div
              className="flex items-start justify-between border-b border-white/15 pb-3"
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/nc-united-logo-white.png"
                  alt="NC United"
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black leading-tight text-white">{athlete.name}</h3>
                    {instagramHandle && (
                      <a
                        href={`https://instagram.com/${instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-400 hover:text-pink-300 transition-colors"
                        aria-label={`${athlete.name}'s Instagram`}
                      >
                        <Instagram className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
                    <p className="text-xs" style={{ color: "#D3B574" }}>
                      Class of {athlete.graduationyear || "2025"}
                    </p>
                    {backCardNcRank != null && (
                      <>
                        <span className="text-white/30">•</span>
                        <span style={{ color: "#D3B574" }}>RecruitNC #{backCardNcRank}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleFlip}
                className="rounded-full p-1.5 text-white transition-colors shadow-md"
                style={{ backgroundColor: "#B31B1B" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8B1515")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#B31B1B")}
                aria-label="Flip card back"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {legacyAwardBadges.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1 px-0.5">
                {legacyAwardBadges.map((b) => (
                  <span
                    key={b.key}
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wide leading-tight text-center shadow-md max-w-[11rem]"
                    style={{
                      backgroundColor: "#D3B574",
                      color: "#0D1A4D",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            {honorBadgesMerged.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-1 px-0.5">
                {honorBadgesMerged.slice(0, 3).map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none"
                    style={{
                      borderColor: "#D3B574",
                      color: "#D3B574",
                      backgroundColor: "rgba(211, 181, 116, 0.12)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className="relative mt-3 overflow-hidden rounded-lg border bg-white p-3 shadow-sm">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#B31B1B]">College destination</p>
              <div className="flex items-center gap-2 relative z-10">
                <div className="h-12 w-12 rounded-full bg-white p-1.5 flex items-center justify-center border border-gray-200 flex-shrink-0">
                  {collegeLogoUrl && !collegeLogoError ? (
                    <Image
                      src={collegeLogoUrl}
                      alt={athlete.college || "College"}
                      width={32}
                      height={32}
                      className="object-contain"
                      unoptimized={collegeLogoUrl.startsWith("http")}
                      onError={() => setCollegeLogoError(true)}
                    />
                  ) : athlete.college ? (
                    <Image
                      src="/generic-college-logo.png"
                      alt=""
                      width={32}
                      height={32}
                      className="object-contain opacity-70"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-gray-900 text-sm truncate">{athlete.college || "College"}</h5>
                  {athlete.division && (
                    <p className="text-xs text-gray-600 font-medium">{athlete.division}</p>
                  )}
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Projected Weight:</span>{" "}
                    {athlete.college_weight_class != null && String(athlete.college_weight_class).trim() !== ""
                      ? `${String(athlete.college_weight_class)} lbs`
                      : "TBD"}
                  </p>
                  {athlete.commitmentdate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      <span>Committed {commitmentDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 grid shrink-0 grid-cols-4 overflow-hidden rounded-lg border border-white/15 bg-white/[0.06] text-center text-white">
              <div className="border-r border-white/10 px-1 py-2">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-white/50">Record</p>
                <p className="mt-0.5 text-sm font-black tabular-nums">
                  {careerStats ? `${careerStats.totalWins}-${careerStats.totalLosses}` : "—"}
                </p>
              </div>
              <div className="border-r border-white/10 px-1 py-2">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-white/50">Win %</p>
                <p className="mt-0.5 text-sm font-black tabular-nums">
                  {careerStats ? `${careerStats.totalWinPercentage.toFixed(0)}%` : "—"}
                </p>
              </div>
              <div className="border-r border-white/10 px-1 py-2">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-white/50">State titles</p>
                <p className="mt-0.5 text-sm font-black tabular-nums">{cardResume.stateTitles}</p>
              </div>
              <div className="px-1 py-2">
                <p className="text-[8px] font-semibold uppercase tracking-wide text-white/50">National AA</p>
                <p className="mt-0.5 text-sm font-black tabular-nums">{cardResume.nationalPlacements}</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 text-white">
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "#D3B574" }}>
                  Championship résumé
                </h4>
                <span className="text-[8px] font-semibold uppercase tracking-wide text-white/40">Verified results</span>
              </div>
              {cardResume.lines.length > 0 ? (
                <div className="mt-1.5 space-y-1">
                  {cardResume.lines.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-[10px] leading-tight">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#D3B574" }} />
                      <span className="font-semibold text-white/90">{item.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] leading-relaxed text-white/55">
                  Full verified tournament results are available on the athlete profile.
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[9px] text-white/55">
                <span>{athlete.highschool || athlete.highSchool || athlete.high_school || "High school"}</span>
                {hasValidClub() && <span>• {displayClubName}</span>}
                {athlete.hs_weight_class && <span>• {athlete.hs_weight_class} lbs</span>}
              </div>
            </div>

            <div className="hidden">
              <h4 className="font-bold text-gray-900 mb-1.5 text-center text-[10px]">HS BACKGROUND</h4>

              <div
                className={`grid gap-1.5 ${hasValidClub() && ncUnitedTeamStatus ? "grid-cols-3" : hasValidClub() || ncUnitedTeamStatus ? "grid-cols-2" : "grid-cols-1"}`}
              >
                <div className="text-center">
                  <div className="h-10 w-10 mx-auto mb-1 rounded-full bg-white p-1 flex items-center justify-center border border-gray-200">
                    {highSchoolLogoUrl && !highSchoolLogoError ? (
                      <Image
                        src={highSchoolLogoUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="object-contain"
                        unoptimized={highSchoolLogoUrl.startsWith("http")}
                        onError={() => setHighSchoolLogoError(true)}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-300"></div>
                    )}
                  </div>
                  <h5 className="font-semibold text-gray-900 text-[9px] leading-tight">
                    {athlete.highschool || athlete.highSchool || athlete.high_school || "High School"}
                  </h5>
                  <p className="text-[8px] text-gray-600">High School</p>
                </div>

                {hasValidClub() && (
                  <div className="text-center">
                    <div className="h-10 w-10 mx-auto mb-1 rounded-full bg-white p-1 flex items-center justify-center border border-gray-200">
                      {clubLogoUrl && !clubLogoError ? (
                        <Image
                          src={clubLogoUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="object-contain"
                          unoptimized={clubLogoUrl.startsWith("http")}
                          onError={() => setClubLogoError(true)}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-300"></div>
                      )}
                    </div>
                    <h5 className="font-semibold text-gray-900 text-[9px] leading-tight">{displayClubName}</h5>
                    <p className="text-[8px] text-gray-600">Club</p>
                  </div>
                )}

                {ncUnitedTeamStatus && (
                  <div className="text-center">
                    <div className="h-10 w-10 mx-auto mb-1 rounded-full bg-white p-1 flex items-center justify-center border border-gray-200">
                      <Image
                        src={
                          ncUnitedTeamStatus === "blue"
                            ? "/nc-united-blue-logo.png"
                            : ncUnitedTeamStatus === "gold"
                              ? "/nc-united-gold-logo.png"
                              : "/nc-united-main-logo.png"
                        }
                        alt={`NC United ${ncUnitedTeamStatus === "blue" ? "Blue" : ncUnitedTeamStatus === "gold" ? "Gold" : ""}`}
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <h5 className="font-semibold text-gray-900 text-[9px] leading-tight">
                      NC United {ncUnitedTeamStatus === "blue" ? "Blue" : ncUnitedTeamStatus === "gold" ? "Gold" : ""}
                    </h5>
                    <p className="text-[8px] text-gray-600">National Team</p>
                  </div>
                )}
              </div>

              {(athlete.gpa || athlete.GPA) && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] text-center">
                    <span className="font-semibold text-gray-600">GPA:</span>{" "}
                    <span className="text-gray-900 font-bold" style={{ color: "#D3B574" }}>
                      {athlete.gpa || athlete.GPA}
                    </span>
                  </div>
                </div>
              )}

              {athlete.location && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                  <div className="text-[10px] text-center">
                    <span className="font-semibold text-gray-600">Location:</span>{" "}
                    <span className="text-gray-900">{athlete.location}</span>
                  </div>
                </div>
              )}
            </div>

            <a
              href={athlete.id ? `/view-profile?id=${encodeURIComponent(athlete.id)}` : `/athletes/${athlete.name?.toLowerCase().replace(/\s+/g, "-")}`}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-bold shadow-md transition-colors hover:opacity-95"
              style={{
                backgroundColor: "#D3B574",
                color: "#0D1A4D",
              }}
            >
              View Full Profile
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }
        
        @media (max-width: 640px) {
          /* Do not override .rotate-y-180 / apply translateZ to every child — that blanked or
             mangled college logos (and other back-face images) on iOS Safari. */
          .card-back {
            -webkit-font-smoothing: antialiased;
          }
          /* HS Stats container - ensure full width on mobile by breaking out of parent padding */
          .hs-stats-container {
            width: calc(100% + 2rem) !important;
            max-width: calc(100% + 2rem) !important;
            margin-left: -1rem !important;
            margin-right: -1rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            box-sizing: border-box;
            position: relative;
          }
          .stats-table {
            width: 100% !important;
            table-layout: fixed !important;
            min-width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse;
          }
          .stats-table th,
          .stats-table td {
            box-sizing: border-box;
          }
          .preserve-3d {
            transform-style: preserve-3d;
            -webkit-transform-style: preserve-3d;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
            -webkit-transform: rotateY(180deg);
          }
          .backface-hidden {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }
        }
      `}</style>
    </div>
  )
}

const getNCUnitedTeamStatus = (athlete: Athlete) => {
  const raw = (athlete as any).ncUnitedTeam ?? (athlete as any).ncunitedteam ?? ""
  const teamValue = String(raw).toLowerCase().trim()

  if (teamValue && (teamValue === "blue" || teamValue.includes("blue") || teamValue === "both")) {
    return "blue"
  }
  if (teamValue && (teamValue === "gold" || teamValue.includes("gold"))) {
    return "gold"
  }

  const knownBlueTeamMembers = ["colt campbell", "liam hickey"]
  const knownGoldTeamMembers: string[] = []
  const athleteName = athlete.name?.toLowerCase() || ""

  if (knownBlueTeamMembers.some((name) => athleteName.includes(name))) return "blue"
  if (knownGoldTeamMembers.some((name) => athleteName.includes(name))) return "gold"

  return null
}
