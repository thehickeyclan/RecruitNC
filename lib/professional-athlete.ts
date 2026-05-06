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
  nhsca_2024_record?: string
  nhsca_2024_placement?: string
  nhsca_2023_record?: string
  nhsca_2023_placement?: string
  super_32_2025_record?: string
  super_32_2025_placement?: string
  super_32_2024_record?: string
  super_32_2024_placement?: string
  super_32_2023_record?: string
  super_32_2023_placement?: string
  /** NCHSAA state tournament rows (JSON on athletes row) — used for honor chips on commitment cards. */
  nchsaa_results?: unknown
  /** Our class ranking (1–30). Used on commitment card back. */
  prospect_ranking?: number | string | null
  rankings?: { nc_rank?: string }
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID()
  }
  return "athlete-" + Math.random().toString(36).slice(2, 10)
}

/** Slim plain rows for the client — avoids odd blobs from `athletes.nchsaa_results`. */
function sanitizeNchsaaResults(raw: unknown): unknown[] | undefined {
  if (raw == null) return undefined
  let arr: unknown[] = []
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw)
      if (!Array.isArray(p)) return undefined
      arr = p
    } catch {
      return undefined
    }
  } else {
    return undefined
  }

  const slim: Record<string, unknown>[] = []
  for (const item of arr.slice(0, 100)) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    slim.push({
      year: o.year,
      place: o.place,
      classification: o.classification ?? o.class,
      weight_class: o.weight_class ?? o.weightClass,
      school: o.school,
      wrestler_name: o.wrestler_name ?? o.wrestlerName,
    })
  }
  return slim.length ? slim : undefined
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

  const nhscaStr = (v: unknown) => (v != null && String(v).trim() !== "" ? String(v).trim() : undefined)

  const nhsca_2024_record = nhscaStr(input?.nhsca_2024_record)
  const nhsca_2024_placement = nhscaStr(input?.nhsca_2024_placement)
  const nhsca_2023_record = nhscaStr(input?.nhsca_2023_record)
  const nhsca_2023_placement = nhscaStr(input?.nhsca_2023_placement)

  const super_32_2025_record = nhscaStr(input?.super_32_2025_record)
  const super_32_2025_placement = nhscaStr(input?.super_32_2025_placement)
  const super_32_2024_record = nhscaStr(input?.super_32_2024_record)
  const super_32_2024_placement = nhscaStr(input?.super_32_2024_placement)
  const super_32_2023_record = nhscaStr(input?.super_32_2023_record)
  const super_32_2023_placement = nhscaStr(input?.super_32_2023_placement)

  const nchsaa_results = sanitizeNchsaaResults(input?.nchsaa_results)

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
    nhsca_2024_record,
    nhsca_2024_placement,
    nhsca_2023_record,
    nhsca_2023_placement,
    super_32_2025_record,
    super_32_2025_placement,
    super_32_2024_record,
    super_32_2024_placement,
    super_32_2023_record,
    super_32_2023_placement,
    nchsaa_results,
    prospect_ranking,
    rankings,
  }
}

export function normalizeAthleteList(list: any): ProfessionalAthlete[] {
  if (!Array.isArray(list)) return []
  const out: ProfessionalAthlete[] = []
  for (let i = 0; i < list.length; i++) {
    try {
      out.push(normalizeAthlete(list[i]))
    } catch (e) {
      console.error("[RecruitNC] normalizeAthlete failed for commitment feed row:", i, e)
      const raw = list[i] as Record<string, unknown>
      out.push({
        id: String(raw?.id ?? `row-${i}`),
        name: String(raw?.name ?? "Unknown Athlete"),
      })
    }
  }
  return out
}
