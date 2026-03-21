/**
 * Canonical Professional Athlete contract used by ProfessionalCommitmentCard.
 */
export type ProfessionalAthlete = {
  id: string
  name: string
  college?: string
  division?: string
  highschool?: string
  wrestlingClub?: string
  graduationyear?: number
  weightclass?: string | number
  college_weight_class?: string | number
  gender?: string
  commitmentdate?: string
  photourl?: string
  achievements?: string[]
  location?: string
  ncUnitedTeam?: string
  instagram?: string
  nhsca_2025_record?: string
  nhsca_2025_placement?: string
  /** Our class ranking (1–30). Used on commitment card back. */
  prospect_ranking?: number | string | null
  rankings?: { nc_rank?: string }
}

/**
 * Best-effort normalization from any backend or legacy shape to ProfessionalAthlete.
 */
export function normalizeAthlete(input: any): ProfessionalAthlete {
  const first = input?.firstName ?? input?.first_name ?? input?.firstname ?? ""
  const last = input?.lastName ?? input?.last_name ?? input?.lastname ?? ""
  const combined = `${first} ${last}`.trim()
  const name: string = (input?.name as string) || combined || "Unknown Athlete"

  const safeSlug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

  const rawId = input?.id ?? input?.athlete_id ?? input?.uuid ?? input?.slug ?? null
  const id: string = String(
    rawId ||
      safeSlug(`${name}-${input?.highschool || input?.high_school || ""}-${input?.college || ""}`) ||
      safeSlug(name) ||
      cryptoRandomId(),
  )

  const highschool: string | undefined = input?.highschool ?? input?.highSchool ?? input?.high_school ?? undefined
  const wrestlingClub: string | undefined =
    input?.wrestlingClub ?? input?.wrestlingclub ?? input?.wrestling_club ?? input?.club ?? undefined

  const college: string | undefined = input?.college ?? undefined
  const division: string | undefined = input?.division ?? input?.college_division ?? undefined

  const graduationyear: number | undefined =
    (input?.graduationyear as number) ??
    (input?.graduation_year as number) ??
    (typeof input?.class_year === "string" || typeof input?.class_year === "number"
      ? Number(input?.class_year)
      : undefined)

  const rawWeightclass = input?.weightclass ?? input?.weight_class ?? input?.weight ?? undefined
  const weightclass: string | number | undefined =
    rawWeightclass != null && rawWeightclass !== "" ? rawWeightclass : undefined

  const rawCollegeWeight = input?.college_weight_class ?? input?.collegeWeightClass ?? undefined
  const college_weight_class: string | number | undefined =
    rawCollegeWeight != null && rawCollegeWeight !== "" ? rawCollegeWeight : undefined

  const commitmentdate: string | undefined = input?.commitmentdate ?? input?.commitment_date ?? undefined

  const photourl: string | undefined =
    input?.photourl ?? input?.photoUrl ?? input?.photo_url ?? input?.image_url ?? input?.athlete_image ?? undefined

  const gender: string | undefined = input?.gender ?? undefined

  let achievements: string[] | undefined
  if (Array.isArray(input?.achievements)) {
    achievements = input.achievements.filter(Boolean)
  } else if (typeof input?.achievements === "string") {
    achievements = input.achievements
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
  }

  const location: string | undefined = input?.location ?? undefined
  const ncUnitedTeam: string | undefined = input?.ncUnitedTeam ?? input?.team ?? input?.nc_united_team ?? undefined
  const instagram: string | undefined =
    input?.instagram ??
    input?.instagramHandle ??
    input?.instagram_handle ??
    input?.socialMedia?.instagram ??
    input?.social_media?.instagram ??
    undefined

  const nhsca_2025_record: string | undefined =
    input?.nhsca_2025_record != null && String(input.nhsca_2025_record).trim() !== ""
      ? String(input.nhsca_2025_record).trim()
      : undefined
  const nhsca_2025_placement: string | undefined =
    input?.nhsca_2025_placement != null && String(input.nhsca_2025_placement).trim() !== ""
      ? String(input.nhsca_2025_placement).trim()
      : undefined

  const prospect_ranking: number | string | null | undefined =
    input?.prospect_ranking != null ? input.prospect_ranking : undefined
  const rankings: { nc_rank?: string } | undefined =
    input?.rankings != null && typeof input.rankings === "object"
      ? { nc_rank: input.rankings?.nc_rank }
      : undefined

  return {
    id,
    name,
    college,
    division,
    highschool,
    wrestlingClub,
    graduationyear,
    weightclass,
    college_weight_class,
    gender,
    commitmentdate,
    photourl,
    achievements,
    location,
    ncUnitedTeam,
    instagram,
    nhsca_2025_record,
    nhsca_2025_placement,
    prospect_ranking,
    rankings,
  }
}

export function normalizeAthleteList(list: any): ProfessionalAthlete[] {
  if (!Array.isArray(list)) return []
  return list.map(normalizeAthlete)
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID()
  }
  return "athlete-" + Math.random().toString(36).slice(2, 10)
}
