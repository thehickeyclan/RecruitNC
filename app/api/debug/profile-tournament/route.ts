/**
 * GET /api/debug/profile-tournament?id=<athlete-uuid>
 * Returns what view-profile uses: athlete name, namesToTry, and counts from NCHSAA/NHSCA/Super32 tables.
 * Use to see why tournament results are blank (wrong name, empty tables, or lookup bug).
 */
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getNCHSAAResultsForProfile } from "@/lib/nchsaa-results"
import { getNameVariants, getNHSCAFromTables, getSuper32FromTable } from "@/lib/tournament-tables"

export async function GET(request: Request) {
  const id = request.nextUrl.searchParams.get("id")?.trim()
  if (!id) return NextResponse.json({ error: "?id= athlete uuid required" }, { status: 400 })

  const supabase = createAdminClient()
  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("id, name, wrestling_name, graduationyear")
    .eq("id", id)
    .single()

  if (athleteError || !athlete) {
    return NextResponse.json({ error: athleteError?.message ?? "Athlete not found", id }, { status: 200 })
  }

  const name = (athlete.name ?? "").toString().trim()
  const wrestlingName = (athlete.wrestling_name ?? "").toString().trim()
  const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
  const namesToTry = [...new Set([...getNameVariants(name), ...(wrestlingName ? getNameVariants(wrestlingName) : [])])]

  const [nchsaa, nhsca, super32] = await Promise.all([
    getNCHSAAResultsForProfile(supabase, name, gradYear),
    (async () => {
      const merged: Awaited<ReturnType<typeof getNHSCAFromTables>> = []
      const seen = new Set<string>()
      for (const n of namesToTry) {
        if (!n) continue
        const rows = await getNHSCAFromTables(supabase, n, gradYear)
        for (const r of rows) {
          const key = `${r.year}-${r.placement}-${r.weight ?? ""}-${r.division ?? ""}`
          if (!seen.has(key)) {
            seen.add(key)
            merged.push(r)
          }
        }
      }
      return merged
    })(),
    (async () => {
      for (const n of namesToTry) {
        if (!n) continue
        const rows = await getSuper32FromTable(supabase, n, gradYear, {})
        if (rows.length) return rows
      }
      return []
    })(),
  ])

  return NextResponse.json({
    athlete: { id: athlete.id, name, wrestling_name: wrestlingName, graduationyear: athlete.graduationyear },
    namesToTry,
    counts: { nchsaa: nchsaa.length, nhsca: nhsca.length, super32: super32.length },
    nchsaa_sample: nchsaa.slice(0, 3),
    nhsca_sample: nhsca.slice(0, 3),
    super32_sample: super32.slice(0, 3),
  })
}
