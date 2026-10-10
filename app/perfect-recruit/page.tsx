/**
 * Your perfect recruit: a program's standard, on its own page, and who meets it.
 *
 * It lived inside the comparison, where a coach met it only after picking two wrestlers. A
 * standard is not about two wrestlers; it is the program's, set once and read everywhere - so it
 * is set here, and every North Carolina wrestler in the current classes is flagged against it
 * rather than filtered by it (Matt, 10 October 2026).
 */
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { currentClassYears } from "@/lib/class-years"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import PerfectRecruitClient, { type PerfectRecruitMatch } from "./perfect-recruit-client"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export const metadata = { title: "Your Perfect Recruit | RecruitNC" }

export default async function PerfectRecruitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <PerfectRecruitClient access="signed-out" />

  const admin = createAdminClient()
  const viewer = await resolveFitViewer(admin, user.id)
  if (!viewer.allowed) return <PerfectRecruitClient access="not-coach" />

  const classYears = currentClassYears()
  let matches: PerfectRecruitMatch[] = []
  let checked = 0
  let failed = false
  if (viewer.hasStandard) {
    try {
      const { data: roster } = await admin
        .from("athletes")
        .select("id,name,highschool,graduationyear,weightclass")
        .eq("is_nc_athlete", true)
        .gte("graduationyear", classYears[0]!)
        .lte("graduationyear", classYears[classYears.length - 1]!)
        .order("name")
        .limit(2000)
      const athletes = (roster ?? []) as Array<{ id: string; name: string; highschool: string | null; graduationyear: number | null; weightclass: string | null }>
      checked = athletes.length
      const flags = await loadFitFlags(admin, athletes.map((a) => a.id), viewer.saved!.criteria, { personal: viewer.personal })
      matches = athletes
        .map((a) => ({ athlete: a, flag: flags.get(a.id) }))
        // The page lists who meets it and who might; a miss is flagged on the wrestler's own profile.
        .filter((m): m is { athlete: (typeof athletes)[number]; flag: NonNullable<typeof m.flag> } => Boolean(m.flag) && m.flag!.verdict !== "misses")
        .map(({ athlete, flag }) => ({
          id: athlete.id,
          name: athlete.name,
          highSchool: athlete.highschool,
          classYear: athlete.graduationyear,
          weight: athlete.weightclass,
          verdict: flag.verdict as "meets" | "possible",
          summary: flag.summary,
          met: flag.met,
          total: flag.total,
          checks: flag.checks.map((c) => ({ key: c.key, label: c.label, status: c.status, detail: c.detail, mustHave: c.mustHave })),
        }))
        .sort((a, b) => Number(b.verdict === "meets") - Number(a.verdict === "meets") || b.met - a.met || a.name.localeCompare(b.name))
    } catch (error) {
      console.error("[perfect-recruit] matching failed:", error)
      failed = true
    }
  }

  return (
    <PerfectRecruitClient
      access="ok"
      saved={viewer.saved}
      hasStandard={viewer.hasStandard}
      classYearOptions={classYears}
      matches={matches}
      checked={checked}
      failed={failed}
    />
  )
}
