/** Instagram / social caption template for college commitments (admin copy-paste). */

export type CommitmentInstagramCaptionInput = {
  athleteFullName: string
  athleteFirstName: string
  highSchool: string
  classYear: string
  collegeName: string
  collegeDivision: string
  /** City, region, or "City, ST" — not stored on college row today. */
  collegeCity: string
  gender?: string | null
  /** e.g. https://app.ncwrestlingunited.com (no trailing slash) */
  appBaseUrl?: string
}

const HASHTAGS =
  "#RecruitNC #NCWrestlingUnited #NCWrestling #NCCollegeCommitments #NorthCarolinaWrestling"

function possessiveAcademic(gender: string | null | undefined): "his" | "her" | "their" {
  const g = (gender ?? "").trim().toLowerCase()
  if (g === "female") return "her"
  if (g === "male") return "his"
  return "their"
}

function normalizeBaseUrl(url: string): string {
  const t = url.trim()
  if (!t) return "https://app.ncwrestlingunited.com"
  return t.replace(/\/$/, "")
}

export function buildCommitmentInstagramCaption(i: CommitmentInstagramCaptionInput): string {
  const pronoun = possessiveAcademic(i.gender)
  const cityTrim = i.collegeCity.trim()
  const city = cityTrim || "[College city — fill in above]"
  const base = normalizeBaseUrl(i.appBaseUrl ?? "")
  const line1 = `📣 "${i.athleteFullName}"  Commits to "${i.collegeName}"🎓`
  const line2 = `"${i.highSchool}" Class of "${i.classYear}" "${i.athleteFullName}" has officially committed to continue ${pronoun} academic and wrestling career at "${i.collegeName}", a "${i.collegeDivision}" program located in "${city}".`
  const line3 = `See "${i.athleteFirstName}" full profile including all HS accomplishments — plus North Carolina's complete list of college commitments, prospect profiles and rankings at:`
  return [
    line1,
    "",
    line2,
    "",
    line3,
    "",
    "📲 RecruitNC",
    "",
    `${base}/`,
    "",
    HASHTAGS,
  ].join("\n")
}
