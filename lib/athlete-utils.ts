"use server"

import type { Athlete } from "@/types/athlete"
import { normalizeCollegeToCanonical } from "@/lib/canonical-college"

// Map database fields to our Athlete type (DB → Frontend)
export async function mapDbToAthlete(data: any): Promise<Athlete> {
  if (!data) return null as any

  const validatePhotoUrl = (url: string | null): string => {
    if (!url) return "/wrestler-silhouette.png"

    // If it's a valid HTTP/HTTPS URL, use it
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }

    // If it's a relative path starting with /, use it
    if (url.startsWith("/")) {
      return url
    }

    // If it contains spaces or looks like a name/club, it's not a valid URL
    if (url.includes(" ") || (!url.includes(".") && !url.startsWith("/"))) {
      return "/wrestler-silhouette.png"
    }

    return url
  }

  // Create a mapped athlete object with default values for all fields
  const athlete: Athlete = {
    id: data.id || "",
    name: data.name || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    highschool: data.highschool || "",
    highSchool: data.highschool || "",
    college: (data.colleges?.name ?? data.college_name ?? data.college ?? "") as string,
    college_id: data.college_id ?? null,
    division: (data.colleges?.division ?? data.college_division ?? data.division ?? undefined) as string | undefined,
    weightclass: data.weightclass || "",
    weightClass: data.weightclass || "",
    college_weight_class: data.college_weight_class ?? "",
    graduationyear: data.graduationyear || new Date().getFullYear(),
    graduationYear: data.graduationyear || new Date().getFullYear(),
    birthdate: data.birthdate || null,
    commitmentdate: data.commitmentdate || new Date().toISOString().split("T")[0],
    commitmentDate: data.commitmentdate || new Date().toISOString().split("T")[0],
    photourl: validatePhotoUrl(data.photourl),
    photoUrl: validatePhotoUrl(data.photourl),
    commitmentPhotoUrl: data.commitmentPhotoUrl || "",
    highlight_video_url: data.highlight_video_url || "",
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
    additional_achievements: data.additional_achievements || "", // Added additional_achievements field mapping
    bio: data.bio || "",
    bio_headline: data.bio_headline || "", // Added bio_headline field mapping
    gender: data.gender || "Male",
    weight: data.weight || null,
    highSchoolLogoUrl: data.highSchoolLogoUrl || "",
    wrestlingClub: data.wrestlingClub || "",
    wrestlingClubLogoUrl: data.wrestlingClubLogoUrl || "",
    ncUnitedTeam: data.ncUnitedTeam || "none",
    collegeLogoUrl: data.collegeLogoUrl || "",
    careerRecord: data.careerRecord || "",
    rankings: data.rankings || {},
    location: data.location || "",
    socialMedia: data.socialMedia || {},
    contactEmail: data.contactEmail || "",
    phone: data.phone || "", // Added phone field mapping from user_profiles
    featured: data.featured || false,
    recruiting_status: data.recruiting_status || "Uncommitted",
    is_prospect: data.is_prospect || false,
    prospect_ranking: data.prospect_ranking || null,
    prospect_notes: data.prospect_notes || "",
    academic_gpa: data.academic_gpa || null,
    academic_sat: data.academic_sat || null,
    academic_act: data.academic_act || null,
    academic_summary: data.academic_summary || null,
    super_32_2023_record: data.super_32_2023_record || null, // Added Super 32 2023 record field
    super_32_2023_placement: data.super_32_2023_placement || null, // Added Super 32 2023 placement field
    super_32_2024_record: data.super_32_2024_record || null,
    super_32_2024_placement: data.super_32_2024_placement || null,
    super_32_2025_record: data.super_32_2025_record || null,
    super_32_2025_placement: data.super_32_2025_placement || null,
    nhsca_2023_record: data.nhsca_2023_record || null,
    nhsca_2023_placement: data.nhsca_2023_placement || null,
    nhsca_2024_record: data.nhsca_2024_record || null,
    nhsca_2024_placement: data.nhsca_2024_placement || null,
    nhsca_2025_record: data.nhsca_2025_record || null,
    nhsca_2025_placement: data.nhsca_2025_placement || null,
    // New JSON tournament results - handle JSONB properly (may be string, array, or null)
    nhsca_results: (() => {
      if (!data.nhsca_results) return []
      if (Array.isArray(data.nhsca_results)) return data.nhsca_results
      if (typeof data.nhsca_results === 'string') {
        try {
          const parsed = JSON.parse(data.nhsca_results)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
      return []
    })(),
    super32_results: (() => {
      if (!data.super32_results) return []
      if (Array.isArray(data.super32_results)) return data.super32_results
      if (typeof data.super32_results === 'string') {
        try {
          const parsed = JSON.parse(data.super32_results)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      }
      return []
    })(),
    nationally_ranked_wins: data.nationally_ranked_wins || null,
    college_opens_experience: data.college_opens_experience || null,
    flo_profile_url: data.flo_profile_url || null,
    track_wrestling_profile_url: data.track_wrestling_profile_url || null,
  }

  return athlete
}

// Map Athlete to database format (Frontend → DB)
export async function mapAthleteToDb(athlete: any): Promise<any> {
  try {
    const socialMedia: any = {}
    if (athlete.instagramUrl) socialMedia.instagram = athlete.instagramUrl
    if (athlete.twitterUrl) socialMedia.twitter = athlete.twitterUrl
    if (athlete.facebookUrl) socialMedia.facebook = athlete.facebookUrl

    const dbData = {
      name: athlete.name || "",
      firstName: athlete.firstName || "",
      lastName: athlete.lastName || "",
      highschool: athlete.highSchool || athlete.highschool || "",
      college: normalizeCollegeToCanonical(athlete.college) || athlete.college || "",
      college_id: athlete.college_id ?? null,
      weightclass: athlete.weightClass || athlete.weightclass || "",
      college_weight_class: athlete.collegeWeightClass || athlete.college_weight_class || "", // Added college_weight_class field mapping to database
      graduationyear: athlete.graduationYear || athlete.graduationyear || new Date().getFullYear(),
      birthdate: athlete.birthdate || null,
      commitmentdate: athlete.commitmentDate || athlete.commitmentdate || new Date().toISOString().split("T")[0],
      photourl: athlete.photoUrl || athlete.photourl || "/wrestler-silhouette.png",
      commitmentPhotoUrl: athlete.commitmentPhotoUrl || "",
      highlight_video_url: athlete.highlightVideoUrl || athlete.highlight_video_url || "",
      achievements: (() => {
        if (Array.isArray(athlete.achievements)) {
          return athlete.achievements.map((achievement) => {
            if (typeof achievement === "string") {
              return achievement.replace(/^"/, "").replace(/"$/, "")
            }
            return achievement
          })
        } else if (typeof athlete.achievements === "string") {
          return athlete.achievements
            .split(",")
            .map((a) => a.trim().replace(/^"/, "").replace(/"$/, ""))
            .filter(Boolean)
        }
        return []
      })(),
      additional_achievements: athlete.additional_achievements || "",
      bio: athlete.bio !== undefined && athlete.bio !== null ? String(athlete.bio) : "",
      bio_headline: athlete.bio_headline !== undefined && athlete.bio_headline !== null ? String(athlete.bio_headline) : "",
      gender: athlete.gender || "Male",
      weight: athlete.weight === "" ? null : athlete.weight,
      highSchoolLogoUrl: athlete.highSchoolLogoUrl || "",
      wrestlingClub: athlete.wrestlingClub || "",
      wrestlingClubLogoUrl: athlete.wrestlingClubLogoUrl || "",
      ncUnitedTeam: athlete.ncUnitedTeam || "none",
      collegeLogoUrl: athlete.collegeLogoUrl || "",
      careerRecord: athlete.careerRecord || "",
      rankings: athlete.rankings || {},
      location: athlete.location || "",
      socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : athlete.socialMedia || {},
      contactEmail: athlete.contactEmail || "",
      phone: athlete.phone || "", // Added phone field mapping to database
      featured: athlete.featured || false,
      recruiting_status: athlete.recruiting_status || "Uncommitted",
      is_prospect: athlete.is_prospect || false,
      prospect_ranking: athlete.prospect_ranking || null,
      prospect_notes: athlete.prospect_notes || "",
      academic_gpa: athlete.academicGpa || athlete.academicGPA || athlete.academic_gpa || null,
      academic_sat: athlete.academicSat || athlete.academicSAT || athlete.academic_sat || null,
      academic_act: athlete.academicAct || athlete.academicACT || athlete.academic_act || null,
      academic_summary: athlete.academicSummary || athlete.academic_summary || null,
      super_32_2023_record: athlete.super_32_2023_record || null, // Added Super 32 2023 record field mapping
      super_32_2023_placement: athlete.super_32_2023_placement || null, // Added Super 32 2023 placement field mapping
      super_32_2024_record: athlete.super_32_2024_record || null,
      super_32_2024_placement: athlete.super_32_2024_placement || null,
      super_32_2025_record: athlete.super_32_2025_record || null,
      super_32_2025_placement: athlete.super_32_2025_placement || null,
      nhsca_2023_record: athlete.nhsca_2023_record || null,
      nhsca_2023_placement: athlete.nhsca_2023_placement || null,
      nhsca_2024_record: athlete.nhsca_2024_record || null,
      nhsca_2024_placement: athlete.nhsca_2024_placement || null,
      nhsca_2025_record: athlete.nhsca_2025_record || null,
      nhsca_2025_placement: athlete.nhsca_2025_placement || null,
      ultimate_club_duals_2025_record: athlete.ultimate_club_duals_2025_record || null,
      ultimate_club_duals_2024_record: athlete.ultimate_club_duals_2024_record || null,
      nationally_ranked_wins: athlete.nationally_ranked_wins || null,
      college_opens_experience: athlete.college_opens_experience || null,
      flo_profile_url: athlete.floProfileUrl || athlete.flo_profile_url || null,
      track_wrestling_profile_url: athlete.trackWrestlingProfileUrl || athlete.track_wrestling_profile_url || null,
    }

    console.log("[v0] mapAthleteToDb - Super 32 fields being mapped:", {
      super_32_2023_record: dbData.super_32_2023_record,
      super_32_2023_placement: dbData.super_32_2023_placement,
      super_32_2024_record: dbData.super_32_2024_record,
      super_32_2024_placement: dbData.super_32_2024_placement,
      super_32_2025_record: dbData.super_32_2025_record,
      super_32_2025_placement: dbData.super_32_2025_placement,
    })

    return dbData
  } catch (error) {
    console.error("Error in mapAthleteToDb:", error)
    return {
      name: athlete?.name || "Unknown Athlete",
      firstName: athlete?.firstName || "",
      lastName: athlete?.lastName || "",
      gender: "Male",
      highschool: athlete?.highSchool || athlete?.highschool || "",
      college: normalizeCollegeToCanonical(athlete?.college) || athlete?.college || "",
      college_id: athlete?.college_id ?? null,
      graduationyear: new Date().getFullYear(),
      commitmentdate: new Date().toISOString().split("T")[0],
      recruiting_status: athlete?.recruiting_status || "Uncommitted",
      is_prospect: athlete?.is_prospect || false,
      phone: athlete?.phone || "", // Added phone field to fallback mapping
      college_weight_class: athlete?.collegeWeightClass || athlete?.college_weight_class || "", // Added college_weight_class to fallback mapping
    }
  }
}

// For backward compatibility
export const mapAthleteFromDatabase = mapDbToAthlete
export const mapAthleteToDatabaseFields = mapAthleteToDb
