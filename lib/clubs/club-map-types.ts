export type ClubMapPin = {
  id: string
  name: string
  normalizedName: string
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  latitude: number
  longitude: number
  website: string | null
  logoUrl: string | null
  verified: boolean
  contactPhone: string | null
  contactEmail: string | null
  /**
   * What the club told us it runs, captured on the submission form and confirmed at
   * approval. This is club-supplied fact, unlike the profile counts below, which only
   * reflect how many RecruitNC profiles happen to name this club.
   */
  programs: {
    youth: boolean
    middleSchool: boolean
    highSchool: boolean
    boys: boolean
    girls: boolean
    freestyleGreco: boolean
  }
  programsOffered: string | null
  athleteCount: number
  boysCount: number
  girlsCount: number
  commitCount: number
  recentCommits: Array<{
    name: string
    college: string
    classYear: string | number | null
  }>
  profileHref: string
}

export type UnlocatedClub = {
  name: string
  normalizedName: string
  athleteCount: number
  boysCount: number
  girlsCount: number
  commitCount: number
}

export type ClubMapResponse = {
  success: boolean
  pins: ClubMapPin[]
  unlocatedClubs: UnlocatedClub[]
  summary: {
    mappedClubs: number
    unlocatedClubs: number
    athletesRepresented: number
    commitsRepresented: number
    verifiedClubs: number
  }
  setupNeeded?: boolean
  error?: string
}
