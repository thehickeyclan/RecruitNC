"use client"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthlete } from "@/lib/professional-athlete"

interface FixedProductionFlipCardProps {
  athlete: {
    id: string
    name: string
    firstName?: string
    lastName?: string
    highschool?: string
    highSchool?: string
    college?: string
    division?: string
    weightclass?: string
    weightClass?: string
    graduationyear?: number
    graduationYear?: number
    commitmentdate?: string
    commitmentDate?: string
    photourl?: string
    photoUrl?: string
    commitmentPhotoUrl?: string
    achievements?: string[]
    bio?: string
    gender?: string
    weight?: number
    highSchoolLogoUrl?: string
    wrestlingClub?: string
    wrestlingclub?: string
    club?: string
    wrestlingClubLogoUrl?: string
    ncUnitedTeam?: string
    collegeLogoUrl?: string
    careerRecord?: string
    rankings?: any
    location?: string
    socialMedia?: any
    contactEmail?: string
    featured?: boolean
    instagram?: string
    // Additional database field names that might be used
    wrestling_club?: string
    nc_united_team?: string
    graduation_year?: number
    weight_class?: string | number
    high_school?: string
    image_url?: string
    photo_url?: string
    commitment_date?: string
    college_division?: string
    social_media?: any
  }
}

interface LogoState {
  college?: string
  highschool?: string
  club?: string
}

export function FixedProductionFlipCard({ athlete }: FixedProductionFlipCardProps) {
  const candidate = athlete ?? {}
  const normalizedAthlete = normalizeAthlete(candidate)
  return <ProfessionalCommitmentCard athlete={normalizedAthlete} />
}

export default FixedProductionFlipCard
