import { getSupabaseAdmin } from "@/lib/server-supabase"
import { QueryHandler } from "./index"

type NhscaAaRow = {
  athlete_name?: string | null
  year?: number | null
  placement?: number | null
  high_school?: string | null
  weight_class?: string | null
  weight?: string | null
  division?: string | null
}

function aaKey(r: NhscaAaRow): string {
  return [
    String(r.athlete_name ?? "").trim().toLowerCase(),
    String(r.year ?? ""),
    String(r.placement ?? ""),
    String(r.high_school ?? "").trim().toLowerCase(),
    String(r.weight_class ?? r.weight ?? ""),
    String(r.division ?? ""),
  ].join("|")
}

/** Merge placements + legacy NHSCA so school AA counts include full history. */
async function loadMergedNhscaAaRows(
  adminClient: ReturnType<typeof getSupabaseAdmin>,
  schoolFragment?: string,
): Promise<NhscaAaRow[]> {
  const schoolFilter = schoolFragment?.trim()
  let plc = adminClient
    .from("nhsca_placements")
    .select("athlete_name,year,placement,high_school,weight_class,division")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .limit(100000)
  let leg = adminClient
    .from("wrestling_nhsca_results")
    .select("athlete_name,year,placement,high_school,weight,division")
    .gte("placement", 1)
    .lte("placement", 8)
    .not("high_school", "is", null)
    .neq("high_school", "")
    .not("high_school", "ilike", "unknown")
    .limit(100000)
  if (schoolFilter) {
    plc = plc.ilike("high_school", `%${schoolFilter}%`)
    leg = leg.ilike("high_school", `%${schoolFilter}%`)
  }
  const [plcRes, legRes] = await Promise.all([plc, leg])
  if (plcRes.error && legRes.error) {
    console.error("[Handler] nhsca_school_leaderboard error:", plcRes.error, legRes.error)
    throw plcRes.error
  }
  const seen = new Set<string>()
  const out: NhscaAaRow[] = []
  for (const r of [...(plcRes.data ?? []), ...(legRes.data ?? [])] as NhscaAaRow[]) {
    const k = aaKey(r)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

export const handleNhscaSchoolLeaderboard: QueryHandler = async (
  params,
  _request,
  _messageId
) => {
  const adminClient = getSupabaseAdmin()
  const school = params.school

  if (school) {
    const rows = await loadMergedNhscaAaRows(adminClient, school)
    return {
      aggregateResult: {
        school,
        count: rows.length,
        type: "nhsca_school_leaderboard",
      },
    }
  }

  const rows = await loadMergedNhscaAaRows(adminClient)
  const bySchool: Record<string, number> = {}
  for (const r of rows) {
    const hs = String(r.high_school ?? "").trim()
    if (!hs) continue
    bySchool[hs] = (bySchool[hs] ?? 0) + 1
  }

  const schoolCounts = Object.entries(bySchool)
    .map(([schoolName, count]) => ({
      school: schoolName,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    aggregateResult: {
      schoolCounts,
      type: "nhsca_school_leaderboard",
    },
  }
}

