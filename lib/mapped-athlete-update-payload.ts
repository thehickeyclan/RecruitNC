/**
 * Builds the same camelCase payload shape as `AthleteForm` submit, from a `mapDbToAthlete` result.
 * Used by admin wizards so partial flows do not omit fields and null out columns in `mapAthleteToDb`.
 */
import type { Athlete } from "@/types/athlete"

function st(v: unknown): string | null {
  if (v == null || v === "") return null
  if (typeof v === "string") {
    const t = v.trim()
    return t || null
  }
  return String(v)
}

export function mappedAthleteToFormUpdatePayload(athlete: Athlete & Record<string, unknown>): Record<string, unknown> {
  const a = athlete
  const rankings = (a.rankings || {}) as Record<string, unknown>

  return {
    firstName: st(a.firstName) ?? st(a.name?.split?.(" ")?.[0]),
    lastName: st(a.lastName) ?? st(a.name?.split?.(" ")?.slice(1).join(" ")),
    gender: st(a.gender) ?? "Male",
    birthdate: a.birthdate ?? null,
    graduationYear: st(String(a.graduationYear ?? a.graduationyear ?? "")),
    weightClass: st(a.weightClass ?? a.weightclass),
    college_weight_class: st(a.college_weight_class),
    highSchool: st(a.highSchool ?? a.highschool),
    highSchoolDivision: st(a.highSchoolDivision),
    highSchoolLogoUrl: st(a.highSchoolLogoUrl),
    college: st(a.college),
    college_id: a.college_id ?? null,
    commitmentDate: st(a.commitmentDate ?? a.commitmentdate),
    wrestlingClub: st(a.wrestlingClub),
    customWrestlingClub: st(a.customWrestlingClub as string),
    photoUrl: st(a.photoUrl ?? a.photourl),
    commitmentPhotoUrl: st(a.commitmentPhotoUrl),
    highlightVideoUrl: st(a.highlight_video_url),
    achievements: Array.isArray(a.achievements)
      ? a.achievements.filter((x) => typeof x === "string" && x.trim() !== "")
      : [],
    additional_achievements: st(a.additional_achievements),
    careerRecord: st(a.careerRecord),
    stateRanking: st(rankings.state != null ? String(rankings.state) : ""),
    nationalRanking: st(rankings.national != null ? String(rankings.national) : ""),
    location: st(a.location),
    bio: st(a.bio),
    bio_headline: st(a.bio_headline),
    twitterUrl: st((a.socialMedia as Record<string, string> | undefined)?.twitter),
    instagramUrl: st((a.socialMedia as Record<string, string> | undefined)?.instagram),
    facebookUrl: st((a.socialMedia as Record<string, string> | undefined)?.facebook),
    floProfileUrl: st(a.flo_profile_url),
    trackWrestlingProfileUrl: st(a.track_wrestling_profile_url),
    ncUnitedTeam: st(a.ncUnitedTeam) ?? "none",
    contactEmail: st(a.contactEmail),
    phone: st(a.phone),
    featured: a.featured ?? false,
    recruiting_status: st(a.recruiting_status) ?? "Uncommitted",
    prospect_ranking: a.prospect_ranking ?? null,
    prospect_notes: st(a.prospect_notes),
    collegeLogoUrl: st(a.collegeLogoUrl),
    academicGPA: a.academic_gpa != null ? Number(a.academic_gpa) : null,
    academicSAT: a.academic_sat != null ? Number(a.academic_sat) : null,
    academicACT: a.academic_act != null ? Number(a.academic_act) : null,
    academicSummary: st(a.academic_summary),
    academic_interest: st((a as Record<string, unknown>).academic_interest),
    super_32_2024_record: st(a.super_32_2024_record),
    super_32_2024_placement: st(a.super_32_2024_placement),
    super_32_2025_record: st(a.super_32_2025_record),
    super_32_2025_placement: st(a.super_32_2025_placement),
    nationally_ranked_wins: st(a.nationally_ranked_wins),
    college_opens_experience: st(a.college_opens_experience),
    nhsca_2024_record: st(a.nhsca_2024_record),
    nhsca_2024_placement: st(a.nhsca_2024_placement),
    nhsca_2025_record: st(a.nhsca_2025_record),
    nhsca_2025_placement: st(a.nhsca_2025_placement),
    super_32_2023_record: st(a.super_32_2023_record),
    super_32_2023_placement: st(a.super_32_2023_placement),
    nhsca_2023_record: st(a.nhsca_2023_record),
    nhsca_2023_placement: st(a.nhsca_2023_placement),
  }
}
