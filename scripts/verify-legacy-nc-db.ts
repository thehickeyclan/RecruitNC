/**
 * Verify values in DB for legacy NC data (athletes + matches).
 * Usage: npx tsx scripts/verify-legacy-nc-db.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const supabase = createClient(url, key)

const CURRENT_YEAR = new Date().getFullYear()
const CAREER_RECORD_REGEX = /^\d+-\d+$/
const SEASON_REGEX = /^\d{4}-\d{2}$/
const VALID_GRADES = new Set(["freshman", "9", "fr", "sophomore", "10", "so", "junior", "11", "jr", "senior", "12", "sr"])

async function main() {
  console.log("=== Legacy NC DB Verification ===\n")

  console.log("1. athletes table")
  const { data: athletes, error: athletesError } = await supabase
    .from("athletes")
    .select("id, name, graduationyear, college, division, recruiting_status, careerRecord")
    .limit(10000)
  if (athletesError) {
    console.error("   Error:", athletesError.message)
  } else {
    const total = athletes?.length ?? 0
    console.log("   Rows (max 10k):", total)
    const withName = (athletes ?? []).filter((a: any) => a.name != null && String(a.name).trim() !== "")
    if (total - withName.length) console.log("   Warning: missing/empty name:", total - withName.length)
    const gradYearBad = (athletes ?? []).filter((a: any) => {
      const y = Number(a.graduationyear)
      return a.graduationyear != null && (isNaN(y) || y < 2015 || y > CURRENT_YEAR + 4)
    })
    if (gradYearBad.length) console.log("   Warning: graduationyear outside 2015-" + (CURRENT_YEAR + 4) + ":", gradYearBad.length)
    const committedNoCollege = (athletes ?? []).filter((a: any) => {
      const s = String(a.recruiting_status ?? "").toLowerCase()
      return (s.includes("committed") || s.includes("signed")) && !(a.college != null && String(a.college).trim() !== "")
    })
    if (committedNoCollege.length) console.log("   Warning: Committed/Signed but college empty:", committedNoCollege.length)
    const careerRecordBad = (athletes ?? []).filter((a: any) => {
      const c = a.careerRecord != null ? String(a.careerRecord).trim() : ""
      return c !== "" && !CAREER_RECORD_REGEX.test(c)
    })
    if (careerRecordBad.length) console.log("   Warning: careerRecord not W-L format:", careerRecordBad.length)
    console.log("   With name:", withName.length, "| With college:", (athletes ?? []).filter((a: any) => a.college != null && String(a.college).trim() !== "").length)
    ;(athletes ?? []).slice(0, 3).forEach((a: any) => console.log("     -", a.name ?? "-", "| grad:", a.graduationyear ?? "-", "|", a.college ?? "-", "| career:", a.careerRecord ?? "-"))
  }
  console.log("")

  console.log("2. matches table")
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, athlete_id, first_name, last_name, season, grade, high_school, wins, losses, total_matches, matches")
    .limit(5000)
  if (matchesError) {
    console.error("   Error:", matchesError.message)
  } else {
    const total = matches?.length ?? 0
    console.log("   Rows (max 5k):", total)
    const linked = (matches ?? []).filter((m: any) => m.athlete_id != null && String(m.athlete_id).trim() !== "")
    console.log("   With athlete_id:", linked.length, "| Unlinked:", total - linked.length)
    const badSeason = (matches ?? []).filter((m: any) => {
      const s = m.season != null ? String(m.season).trim() : ""
      return s !== "" && !SEASON_REGEX.test(s)
    })
    if (badSeason.length) console.log("   Warning: season not YYYY-YY:", badSeason.length)
    const badGrade = (matches ?? []).filter((m: any) => {
      const g = m.grade != null ? String(m.grade).trim().toLowerCase() : ""
      return g !== "" && !VALID_GRADES.has(g)
    })
    if (badGrade.length) console.log("   Warning: grade not in expected set:", badGrade.length)
    const winsLossesMismatch = (matches ?? []).filter((m: any) => {
      const t = Number(m.total_matches)
      const w = Number(m.wins)
      const l = Number(m.losses)
      return !Number.isNaN(t) && !Number.isNaN(w) && !Number.isNaN(l) && t > 0 && w + l !== t
    })
    if (winsLossesMismatch.length) console.log("   Warning: wins+losses != total_matches:", winsLossesMismatch.length)
    const withMatchesJson = (matches ?? []).filter((m: any) => Array.isArray(m.matches) && m.matches.length > 0)
    console.log("   Rows with non-empty matches JSONB:", withMatchesJson.length)
    ;(matches ?? []).slice(0, 3).forEach((m: any) => console.log("     -", m.first_name, m.last_name, "|", m.season, "|", m.grade, "|", m.wins + "-" + m.losses, "| athlete_id:", m.athlete_id ? "set" : "null"))
  }
  console.log("\n=== Done ===")
}
main().catch((e) => { console.error(e); process.exit(1) })
