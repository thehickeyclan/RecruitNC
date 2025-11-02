"use client"
import { useState, useEffect } from "react"
import Image from "next/image"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface FixedCommitmentCardFinalProps {
  athlete: {
    id: string
    name: string
    graduationyear?: number
    graduation_year?: number
    weightclass?: number | string
    weight_class?: number | string
    college?: string
    highschool?: string
    high_school?: string
    wrestlingclub?: string
    wrestling_club?: string
    wrestlingClub?: string
    club?: string
    division?: string
    photourl?: string
    photo_url?: string
    image_url?: string
  }
}

export function FixedCommitmentCardFinal(props: any) {
  const candidate = props?.athlete ?? props?.data ?? props
  const athlete = normalizeAthlete(candidate)

  const [logos, setLogos] = useState<{
    college?: string
    highschool?: string
    club?: string
  }>({})
  const [imageError, setImageError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>({})

  // Get the best available value for each field
  const getClubName = () => {
    const clubOptions = [athlete.wrestlingclub, athlete.club, athlete.wrestlingClub, athlete.wrestling_club].filter(
      Boolean,
    ) // Remove empty/null values

    return clubOptions[0] || null
  }

  const getHighSchoolName = () => {
    return athlete.highschool || athlete.high_school || null
  }

  const getGradYear = () => {
    return athlete.graduationyear || athlete.graduation_year || null
  }

  const getWeightClass = () => {
    return athlete.weightclass || athlete.weight_class || null
  }

  const getPhotoUrl = () => {
    return athlete.photourl || athlete.photo_url || athlete.image_url || null
  }

  useEffect(() => {
    const fetchLogos = async () => {
      setLogoLoading(true)
      const logoResults: any = {}
      const debug: any = {}

      // Get the actual values we'll use
      const clubName = getClubName()
      const highSchoolName = getHighSchoolName()
      const collegeName = athlete.college

      debug.clubName = clubName
      debug.highSchoolName = highSchoolName
      debug.collegeName = collegeName
      debug.allClubFields = {
        wrestlingclub: athlete.wrestlingclub,
        club: athlete.club,
        wrestlingClub: athlete.wrestlingClub,
        wrestling_club: athlete.wrestling_club,
      }

      // Use the EXACT same API pattern that works for Jackson Rowling
      const fetchLogo = async (entityType: string, entityName: string) => {
        try {
          console.log(`🔍 Fetching ${entityType} logo for "${entityName}"`)
          const response = await fetch(`/api/logo-mappings/by-entity/${entityType}/${encodeURIComponent(entityName)}`)
          const data = await response.json()
          console.log(`📡 Response for ${entityName}:`, data)
          if (data.success && data.logo_url) {
            return data.logo_url
          }
        } catch (error) {
          console.error(`Failed to fetch ${entityType} logo for ${entityName}:`, error)
        }
        return null
      }

      // Fetch all logos in parallel
      const [collegeLogoUrl, highschoolLogoUrl, clubLogoUrl] = await Promise.all([
        collegeName ? fetchLogo("college", collegeName) : null,
        highSchoolName ? fetchLogo("highschool", highSchoolName) : null,
        clubName ? fetchLogo("club", clubName) : null,
      ])

      if (collegeLogoUrl) logoResults.college = collegeLogoUrl
      if (highschoolLogoUrl) logoResults.highschool = highschoolLogoUrl
      if (clubLogoUrl) logoResults.club = clubLogoUrl

      debug.logoResults = logoResults

      setLogos(logoResults)
      setDebugInfo(debug)
      setLogoLoading(false)
    }

    fetchLogos()
  }, [athlete])

  const getDivisionColor = (division: string) => {
    const div = division?.toLowerCase() || ""
    if (div.includes("d1") || div.includes("division 1") || div.includes("division i")) return "bg-yellow-500"
    if (div.includes("d2") || div.includes("division 2") || div.includes("division ii")) return "bg-blue-500"
    if (div.includes("d3") || div.includes("division 3") || div.includes("division iii")) return "bg-green-500"
    if (div.includes("naia")) return "bg-purple-500"
    if (div.includes("njcaa") || div.includes("juco")) return "bg-orange-500"
    return "bg-gray-500"
  }

  const LogoWithFallback = ({ src, alt, fallback }: { src?: string; alt: string; fallback: string }) => {
    if (logoLoading) {
      return <div className="w-5 h-5 bg-gray-200 animate-pulse rounded mr-2"></div>
    }

    return (
      <Image
        src={src || fallback}
        alt={alt}
        width={20}
        height={20}
        className="mr-2 rounded object-contain"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = fallback
        }}
      />
    )
  }

  const clubName = getClubName()
  const highSchoolName = getHighSchoolName()
  const gradYear = getGradYear()
  const weightClass = getWeightClass()
  const photoUrl = getPhotoUrl()

  return <ProfessionalCommitmentCard athlete={athlete} />
}

export default FixedCommitmentCardFinal
