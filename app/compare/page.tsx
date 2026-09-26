import { createAdminClient } from "@/lib/supabase/admin"
import { currentClassYears } from "@/lib/class-years"
import CompareClient from "./compare-client"

export const revalidate = 300

export default async function ComparePage() {
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
  } catch (error) {
    console.error("[compare] roster load failed:", error)
  }
  return <CompareClient athletes={athletes} />
}
