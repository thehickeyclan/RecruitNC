"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RotateCw, ExternalLink, Instagram, Calendar } from "lucide-react"
import {
  getCommitmentHonorBadgesForAthlete,
  COMMITMENT_CARD_HONOR_ORDER,
  mergeCommitmentHonorBadgesForDisplay,
  stateHonorsFromNchsaaMergedRows,
} from "@/lib/commitment-card-honors"
interface Athlete {
  id: string
  name: string
  graduationyear?: number
  graduationYear?: number
  weightclass?: string
  weightClass?: string
  weight_class?: string
  college_weight_class?: string
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
  location?: string
  ncUnitedTeam?: string
  rankings?: { nc_rank: string }
  prospect_ranking?: string
  gpa?: number
  GPA?: number
}

interface ProfessionalCommitmentCardProps {
  athlete: Athlete
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

export function ProfessionalCommitmentCard({ athlete }: ProfessionalCommitmentCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [highSchoolLogoUrl, setHighSchoolLogoUrl] = useState<string | null>(null)
  const [highSchoolLogoError, setHighSchoolLogoError] = useState(false)
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null)
  const [clubLogoError, setClubLogoError] = useState(false)
  const [collegeLogoUrl, setCollegeLogoUrl] = useState<string | null>(null)
  const [displayClubName, setDisplayClubName] = useState<string>("")
  const [careerStats, setCareerStats] = useState<{
    seasons: SeasonRecord[]
    totalWins: number
    totalLosses: number
    totalWinPercentage: number
  } | null>(null)
  /** NCHSAA rows from /api/wrestling-achievements (table-backed state champ / placer / SQ). */
  const [serverStateHonors, setServerStateHonors] = useState<string[]>([])

  useEffect(() => {
    setIsFlipped(false)
    setImageError(false)
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
              }
            }
          } catch (error) {
            console.error(`❌ College logo: Network error loading logo for "${athlete.college}":`, error)
          }
        }
      } catch (error) {
        console.error("Error loading logos:", error)
      }
    }

    loadLogos()
  }, [
    athlete.highschool,
    athlete.highSchool,
    athlete.club,
    athlete.wrestlingClub,
    athlete.wrestlingclub,
    athlete.college,
    athlete.name,
  ])

  useEffect(() => {
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
  }, [athlete.id, athlete.graduationyear, athlete.graduationYear])

  useEffect(() => {
    setServerStateHonors([])
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
            nchsaa?: Array<{ year?: unknown; classification?: unknown; weight_class?: unknown; place?: unknown }>
          }
        }
        const found = new Set<string>(stateHonorsFromNchsaaMergedRows(ach.all_results?.nchsaa ?? []))
        if (Array.isArray(ach.state_championships) && ach.state_championships.length > 0) {
          found.add("State Champion")
        }

        setServerStateHonors(
          (["State Champion", "State Placer", "State Qualifier"] as const).filter((b) => found.has(b)),
        )
      } catch (e) {
        console.error("[RecruitNC] commitment-card state honors fetch:", e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [athlete.id])

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
  /** Shown below header on card back only when ranked (header already shows Class of). */
  const backCardNcRank = ncRankPositive != null && ncRankPositive <= 30 ? ncRankPositive : null

  const honorBadges = useMemo(() => getCommitmentHonorBadgesForAthlete(athlete), [athlete])

  const honorBadgesMerged = useMemo(
    () => mergeCommitmentHonorBadgesForDisplay(honorBadges, serverStateHonors),
    [honorBadges, serverStateHonors],
  )

  const legacyAwardBadges = useMemo(() => getNcLegacyAwardBadges(athlete.name), [athlete.name])

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
    <div className="h-[500px] w-full max-w-[350px] mx-auto perspective-1000">
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
              priority
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
          className={`absolute h-full w-full overflow-auto rounded-xl border-0 shadow-lg backface-hidden card-back ${
            isFlipped ? "z-20" : "z-10"
          }`}
          style={{
            transform: "rotateY(180deg)",
            WebkitTransform: "rotateY(180deg)",
            backgroundColor: "#0D1A4D",
          }}
        >
          <div className="p-4">
            <div
              className="flex items-center justify-between mb-3 sticky top-0 py-2 -mt-2 -mx-4 px-4 z-10 backdrop-blur-sm"
              style={{ backgroundColor: "rgba(13, 26, 77, 0.95)" }}
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
                    <h3 className="text-lg font-bold text-white">{athlete.name}</h3>
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs" style={{ color: "#D3B574" }}>
                      Class of {athlete.graduationyear || "2025"}
                    </p>
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

            {backCardNcRank != null && (
              <div className="text-center mb-3 px-1">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "#D3B574" }}
                >
                  RecruitNC Ranking
                </p>
                <p className="text-xl font-black tabular-nums leading-tight mt-1" style={{ color: "#D3B574" }}>
                  #{backCardNcRank}
                </p>
              </div>
            )}

            {legacyAwardBadges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-2.5 px-0.5">
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
              <div className="flex flex-wrap justify-center gap-1 mb-3 px-0.5">
                {honorBadgesMerged.map((label) => (
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

            <div className="bg-white rounded-lg p-3 mb-3 shadow-sm border relative overflow-hidden">
              <h4 className="font-bold text-gray-900 mb-2 text-center text-xs relative z-10">COLLEGE COMMITMENT</h4>
              <div className="flex items-center gap-2 relative z-10">
                <div className="h-12 w-12 rounded-full bg-white p-1.5 flex items-center justify-center border border-gray-200 flex-shrink-0">
                  {collegeLogoUrl ? (
                    <Image
                      src={collegeLogoUrl || "/placeholder.svg"}
                      alt={athlete.college || "College"}
                      width={32}
                      height={32}
                      className="object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
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

            {careerStats && careerStats.seasons.length > 0 && (
              <div className="hs-stats-container rounded-lg p-2.5 mb-3 shadow-sm text-white" style={{ backgroundColor: "#B31B1B" }}>
                <h4 className="font-bold text-center mb-1.5 text-xs">HS CAREER STATS</h4>
                <div className="bg-white/10 rounded overflow-hidden w-full">
                  <table className="stats-table w-full table-fixed text-[10px]">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-0.5 px-1.5 font-semibold w-2/5">Year</th>
                        <th className="text-center py-0.5 px-1 font-semibold w-1/5">W</th>
                        <th className="text-center py-0.5 px-1 font-semibold w-1/5">L</th>
                        <th className="text-center py-0.5 px-1 font-semibold w-1/5">Win%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {careerStats.seasons.map((season, index) => (
                        <tr key={index} className="border-b border-white/10">
                          <td className="py-0.5 px-1.5 text-[9px]">{season.displayYear}</td>
                          <td className="text-center py-0.5 px-1">{season.wins}</td>
                          <td className="text-center py-0.5 px-1">{season.losses}</td>
                          <td className="text-center py-0.5 px-1">{season.winPercentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t-2 border-white/30" style={{ backgroundColor: "#0D1A4D" }}>
                        <td className="py-0.5 px-1.5">Total</td>
                        <td className="text-center py-0.5 px-1">{careerStats.totalWins}</td>
                        <td className="text-center py-0.5 px-1">{careerStats.totalLosses}</td>
                        <td className="text-center py-0.5 px-1">{careerStats.totalWinPercentage.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg p-2 mb-2 shadow-sm border">
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
              className="block w-full font-bold py-2 flex items-center justify-center gap-2 shadow-md text-sm transition-colors rounded-md hover:opacity-95"
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
          /* iOS/Safari fix: prevent 3D backface scaling */
          .card-back {
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
            will-change: transform;
          }
          .card-back * {
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
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
