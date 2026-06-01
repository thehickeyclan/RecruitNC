import { resolveCollegeLogoUrlMap } from "@/lib/entity-logo-resolve"
import { AWARD_COLLEGE_LOGO_LOOKUP } from "@/lib/content/recruiting-awards-2026"

export async function getRecruitingAwardsCollegeLogoMap(): Promise<Record<string, string>> {
  return resolveCollegeLogoUrlMap(AWARD_COLLEGE_LOGO_LOOKUP)
}
