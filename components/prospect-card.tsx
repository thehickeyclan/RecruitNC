"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RotateCw, ExternalLink, Instagram, Trophy, GraduationCap, Weight } from "lucide-react"
import { getLatestNhscaResult } from "@/lib/tournament-utils"

interface ProspectAthlete {
  id: string
  name: string
  graduationyear?: number
  weightclass?: string
  weight_class?: string
  highschool?: string
  high_school?: string
  wrestlingClub?: string
  wrestling_club?: string
  club?: string
  gender?: string
  photourl?: string
  photo_url?: string
  image_url?: string
  achievements?: string[] | string
  location?: string
  ncUnitedTeam?: string
  recruiting_status?: string
  gpa?: number
  academic_gpa?: number
  careerRecord?: string
  nhsca_results?: Array<{ year?: number; placement?: string; record?: string }>
  nhsca_2026_placement?: string
  nhsca_2025_placement?: string
  nhsca_2024_placement?: string
  nhsca_2026_record?: string
  nhsca_2025_record?: string
  nhsca_2024_record?: string
  super_32_2024_placement?: string
  super_32_2025_placement?: string
  super_32_2024_record?: string
  super_32_2025_record?: string
  additional_achievements?: string
  instagram?: string
  instagram_handle?: string
}

interface ProspectCardProps {
  athlete: ProspectAthlete
}

export function ProspectCard({ athlete }: ProspectCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [highSchoolLogoUrl, setHighSchoolLogoUrl] = useState<string | null>(null)
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    setIsFlipped(false)
    setImageError(false)
  }, [athlete.name, athlete.id])

  const getClubName = () => {
    const club = athlete.wrestling_club || athlete.wrestlingClub || athlete.club
    if (club && club.trim() !== "" && club !== "none" && club !== "None") {
      return club
    }
    return "Wrestling Club"
  }

  useEffect(() => {
    const loadLogos = async () => {
      try {
        const highSchool = athlete.highschool || athlete.high_school
        if (highSchool) {
          try {
            const response = await fetch(`/api/logo-mappings/by-entity/highschool/${encodeURIComponent(highSchool)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logo_url) {
                setHighSchoolLogoUrl(data.logo_url)
              }
            }
          } catch (error) {
            console.error("Error loading high school logo:", error)
          }
        }

        const finalClubName = getClubName()
        if (
          finalClubName &&
          finalClubName.trim() &&
          finalClubName !== "none" &&
          finalClubName !== "None" &&
          finalClubName !== "Wrestling Club"
        ) {
          try {
            const response = await fetch(`/api/logo-mappings/by-entity/club/${encodeURIComponent(finalClubName)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.logo_url) {
                setClubLogoUrl(data.logo_url)
              }
            }
          } catch (error) {
            console.error("Error loading club logo:", error)
          }
        }
      } catch (error) {
        console.error("Error loading logos:", error)
      }
    }

    loadLogos()
  }, [
    athlete.highschool,
    athlete.high_school,
    athlete.club,
    athlete.wrestlingClub,
    athlete.wrestling_club,
    athlete.name,
  ])

  const getAthletePhoto = () => {
    const photoUrl = athlete.photourl || athlete.photo_url || athlete.image_url
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
    return "/wrestler-silhouette.png"
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const getRecruitingStatusBadge = () => {
    const status = athlete.recruiting_status?.toLowerCase() || "uncommitted"

    if (status.includes("committed") || status.includes("commit")) {
      return { text: "COMMITTED", color: "bg-green-500" }
    }
    if (status.includes("verbal")) {
      return { text: "VERBAL COMMIT", color: "bg-blue-500" }
    }
    if (status.includes("recruited") || status.includes("recruiting")) {
      return { text: "BEING RECRUITED", color: "bg-yellow-500" }
    }
    if (status.includes("interested") || status.includes("interest")) {
      return { text: "INTERESTED", color: "bg-purple-500" }
    }
    return { text: "UNCOMMITTED", color: "bg-gray-500" }
  }

  const athletePhoto = getAthletePhoto()
  const recruitingStatus = getRecruitingStatusBadge()
  const ncUnitedTeamStatus = getNCUnitedTeamStatus(athlete)
  const instagramHandle = athlete.instagram || athlete.instagram_handle
  const gpa = athlete.gpa || athlete.academic_gpa
  const clubName = getClubName()

  // Get state tournament placement
  const getStatePlacement = () => {
    const achievements = Array.isArray(athlete.achievements) ? athlete.achievements : []
    const stateAchievement = achievements.find(
      (a) => a.toLowerCase().includes("nchsaa") || a.toLowerCase().includes("state"),
    )
    return stateAchievement || null
  }

  // NHSCA: JSON + legacy columns including 2026 (same as getNhscaResults / profile merge)
  const getNHSCAInfo = () => getLatestNhscaResult(athlete)

  // Get Super 32 info - uses new utility for backwards compatibility
  const getSuper32Info = () => {
    // Try new JSON format first
    if (athlete.super32_results && Array.isArray(athlete.super32_results) && athlete.super32_results.length > 0) {
      const latest = athlete.super32_results.sort((a: any, b: any) => b.year - a.year)[0]
      return { placement: latest.placement, record: latest.record || '' }
    }
    
    // Fallback to old columns
    const placement = athlete.super_32_2025_placement || athlete.super_32_2024_placement
    const record = athlete.super_32_2025_record || athlete.super_32_2024_record
    if (placement || record) {
      return { placement, record }
    }
    return null
  }

  const statePlacement = getStatePlacement()
  const nhscaInfo = getNHSCAInfo()
  const super32Info = getSuper32Info()

  return (
    <div className="h-[500px] w-full max-w-[350px] mx-auto perspective-1000">
      <div
        className={`relative h-full w-full transition-transform duration-700 preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front of card */}
        <Card
          className={`absolute h-full w-full overflow-hidden rounded-xl border-0 shadow-lg backface-hidden cursor-pointer ${
            !isFlipped ? "z-20" : "z-10"
          }`}
          onClick={handleFlip}
        >
          <div className="relative h-full w-full">
            <Image
              src={athletePhoto || "/placeholder.svg"}
              alt={athlete.name || "Athlete"}
              fill
              className="object-cover object-center"
              onError={() => setImageError(true)}
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
                  alt={`NC United ${ncUnitedTeamStatus}`}
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
                {athlete.highschool || athlete.high_school || "HIGH SCHOOL"}
              </p>

              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <Weight className="h-4 w-4" />
                  <span className="text-lg font-bold">{athlete.weightclass || athlete.weight_class || "N/A"} lbs</span>
                </div>
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-lg font-bold">Class of {athlete.graduationyear || "N/A"}</span>
                </div>
              </div>

              <div
                className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${recruitingStatus.color} text-white drop-shadow-lg mb-3`}
              >
                {recruitingStatus.text}
              </div>

              <div className="text-center">
                <p className="text-sm text-white/60 font-light">Tap To Flip Card</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Back of card */}
        <Card
          className={`absolute h-full w-full overflow-auto rounded-xl border-0 shadow-lg bg-gradient-to-br from-blue-50 to-gray-50 backface-hidden ${
            isFlipped ? "z-20" : "z-10"
          }`}
          style={{
            transform: "rotateY(180deg)",
            WebkitTransform: "rotateY(180deg)",
          }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-blue-50/80 py-2 -mt-2 -mx-5 px-5 z-10 backdrop-blur-sm">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">{athlete.name}</h3>
                  {instagramHandle && (
                    <a
                      href={`https://instagram.com/${instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:text-pink-600 transition-colors"
                      aria-label={`${athlete.name}'s Instagram`}
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-600">Class of {athlete.graduationyear || "N/A"}</p>
              </div>

              <button
                onClick={handleFlip}
                className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700 transition-colors shadow-md"
                aria-label="Flip card back"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border">
              <h4 className="font-bold text-gray-900 mb-3 text-center">ATHLETE INFO</h4>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Weight Class</p>
                  <p className="font-bold text-gray-900">{athlete.weightclass || athlete.weight_class || "N/A"} lbs</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">GPA</p>
                  <p className="font-bold text-gray-900">{gpa ? gpa.toFixed(2) : "N/A"}</p>
                </div>
              </div>

              {athlete.careerRecord && (
                <div className="text-center mb-3 pb-3 border-b border-gray-100">
                  <p className="text-xs text-gray-600 mb-1">Career Record</p>
                  <p className="font-bold text-gray-900 text-lg">{athlete.careerRecord}</p>
                </div>
              )}

              <div className={`grid gap-2 ${ncUnitedTeamStatus ? "grid-cols-3" : "grid-cols-2"}`}>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-white p-2 flex items-center justify-center border border-gray-200">
                    {highSchoolLogoUrl ? (
                      <Image
                        src={highSchoolLogoUrl || "/placeholder.svg"}
                        alt="High School"
                        width={40}
                        height={40}
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                    )}
                  </div>
                  <h5 className="font-semibold text-gray-900 text-xs">
                    {athlete.highschool || athlete.high_school || "High School"}
                  </h5>
                  <p className="text-xs text-gray-600">High School</p>
                </div>

                <div className="text-center">
                  <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-white p-2 flex items-center justify-center border border-gray-200">
                    {clubLogoUrl ? (
                      <Image
                        src={clubLogoUrl || "/placeholder.svg"}
                        alt="Club"
                        width={40}
                        height={40}
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                    )}
                  </div>
                  <h5 className="font-semibold text-gray-900 text-xs">{clubName}</h5>
                  <p className="text-xs text-gray-600">Club</p>
                </div>

                {ncUnitedTeamStatus && (
                  <div className="text-center">
                    <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-white p-2 flex items-center justify-center border border-gray-200">
                      <Image
                        src={
                          ncUnitedTeamStatus === "blue"
                            ? "/nc-united-blue-logo.png"
                            : ncUnitedTeamStatus === "gold"
                              ? "/nc-united-gold-logo.png"
                              : "/nc-united-main-logo.png"
                        }
                        alt={`NC United ${ncUnitedTeamStatus}`}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <h5 className="font-semibold text-gray-900 text-xs">
                      NC United {ncUnitedTeamStatus === "blue" ? "Blue" : ncUnitedTeamStatus === "gold" ? "Gold" : ""}
                    </h5>
                    <p className="text-xs text-gray-600">National Team</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border">
              <h4 className="font-bold text-gray-900 mb-3 text-center flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                ACHIEVEMENTS
              </h4>

              <div className="space-y-2">
                {statePlacement && (
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-xs font-semibold text-blue-900">State Tournament</p>
                    <p className="text-sm text-blue-800">{statePlacement}</p>
                  </div>
                )}

                {nhscaInfo && (
                  <div className="bg-purple-50 p-2 rounded">
                    <p className="text-xs font-semibold text-purple-900">NHSCA Nationals</p>
                    {nhscaInfo.placement && <p className="text-sm text-purple-800">{nhscaInfo.placement}</p>}
                    {nhscaInfo.record && <p className="text-xs text-purple-700">Record: {nhscaInfo.record}</p>}
                  </div>
                )}

                {super32Info && (
                  <div className="bg-red-50 p-2 rounded">
                    <p className="text-xs font-semibold text-red-900">Super 32</p>
                    {super32Info.placement && <p className="text-sm text-red-800">{super32Info.placement}</p>}
                    {super32Info.record && <p className="text-xs text-red-700">Record: {super32Info.record}</p>}
                  </div>
                )}

                {athlete.additional_achievements && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs font-semibold text-gray-900">Other Achievements</p>
                    <p className="text-sm text-gray-800">{athlete.additional_achievements}</p>
                  </div>
                )}

                {!statePlacement && !nhscaInfo && !super32Info && !athlete.additional_achievements && (
                  <p className="text-sm text-gray-500 text-center italic">No achievements listed yet</p>
                )}
              </div>
            </div>

            <a
              href={`/athletes/${athlete.id || athlete.name?.toLowerCase().replace(/\s+/g, "-")}`}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 flex items-center justify-center gap-2 shadow-md text-lg rounded-md"
            >
              View Full Profile
              <ExternalLink className="h-5 w-5" />
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
      `}</style>
    </div>
  )
}

const getNCUnitedTeamStatus = (athlete: ProspectAthlete) => {
  if (athlete.ncUnitedTeam) {
    const teamValue = athlete.ncUnitedTeam.toLowerCase().trim()
    if (teamValue === "blue" || teamValue.includes("blue")) {
      return "blue"
    }
    if (teamValue === "gold" || teamValue.includes("gold")) {
      return "gold"
    }
    if (teamValue === "both") {
      return "blue"
    }
  }
  return null
}
