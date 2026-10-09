import { createAdminClient } from "@/lib/supabase/admin"
import { currentClassYears } from "@/lib/class-years"
import CompareClient from "./compare-client"

export const revalidate = 300

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string; right?: string; rows?: string; src?: string }>
}) {
  const { left = "", right = "", rows = "", src = "" } = await searchParams
  let boutsOnFile: number | null = null
  let athletes: Array<{ id: string; name: string; highschool: string | null; graduationyear: number | null; weightclass: string | null }> = []
  try {
    const supabase = createAdminClient()
    const active = currentClassYears()
    const { data } = await supabase
      .from("athletes")
      .select("id,name,highschool,graduationyear,weightclass")
      .eq("is_nc_athlete", true)
      .gte("graduationyear", active[0]!)
      .lte("graduationyear", active[active.length - 1]!)
      .order("name")
      .limit(2000)
    athletes = (data ?? []) as typeof athletes
    // The pitch quotes a real number, never a rounded-up one.
    const { count } = await supabase.from("other_tournament_bouts").select("id", { count: "exact", head: true })
    boutsOnFile = count ?? null
  } catch (error) {
    console.error("[compare] roster load failed:", error)
  }
  return <CompareClient athletes={athletes} initialLeft={left} initialRight={right} initialRows={rows} boutsOnFile={boutsOnFile} initialSource={src} />
}
