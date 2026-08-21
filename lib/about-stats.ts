import { getSupabaseAdmin } from "@/lib/server-supabase"
import { fetchCommitmentAthletes } from "@/lib/athletes-commitments-fetch"

/**
 * Live counts for the About page.
 *
 * Every number here is also rendered somewhere else on the site, so hard-coding them would
 * guarantee the About page is the one that goes stale — and a nonprofit's About page is exactly
 * where a wrong number costs the most.
 *
 * A failed query returns null rather than zero. "0 commitments" reads as a claim; a missing number
 * reads as a missing number, and the page is written so each stat can simply not appear.
 *
 * No club count here on purpose. /clubs shows 74, which is 68 directory clubs with coordinates
 * plus 6 club names that appear only on athlete records; the wrestling_clubs table itself holds
 * 70 rows. Until those reconcile there is no number an About page can state without contradicting
 * a page one click away.
 */

export type AboutStats = {
  commitments: number | null
  athleteProfiles: number | null
  collegeCoaches: number | null
}

async function countCommitments(): Promise<number | null> {
  try {
    const admin = getSupabaseAdmin()
    // `total` is the unpaginated count from the query itself. `athletes` is one page — 100 rows
    // by default — so counting that array would silently cap the number the moment the site
    // passed a hundred commitments, which it already has.
    const { total } = await fetchCommitmentAthletes(admin, { limit: 1 })
    return total
  } catch (e) {
    console.warn("[about] commitment count:", e instanceof Error ? e.message : e)
    return null
  }
}

/** Every athlete record we hold, committed or not — /athletes lists only the committed ones. */
async function countAthleteProfiles(): Promise<number | null> {
  try {
    const admin = getSupabaseAdmin()
    const { count, error } = await admin.from("athletes").select("id", { count: "exact", head: true })
    if (error) throw new Error(error.message)
    return typeof count === "number" ? count : null
  } catch (e) {
    console.warn("[about] athlete profile count:", e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * College coaches with accounts.
 *
 * Both spellings are counted because production holds both: 35 rows say `college_coach` and 4 say
 * `college-coach`. Querying either one alone silently undercounts, and this is a number we state
 * in public.
 */
async function countCollegeCoaches(): Promise<number | null> {
  try {
    const admin = getSupabaseAdmin()
    const { count, error } = await admin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["college_coach", "college-coach"])
    if (error) throw new Error(error.message)
    return typeof count === "number" ? count : null
  } catch (e) {
    console.warn("[about] college coach count:", e instanceof Error ? e.message : e)
    return null
  }
}

export async function getAboutStats(): Promise<AboutStats> {
  const [commitments, athleteProfiles, collegeCoaches] = await Promise.all([
    countCommitments(),
    countAthleteProfiles(),
    countCollegeCoaches(),
  ])
  return { commitments, athleteProfiles, collegeCoaches }
}
