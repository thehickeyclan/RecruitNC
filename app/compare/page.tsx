import { createAdminClient } from "@/lib/supabase/admin"
import { loadCoachRoster } from "@/lib/coach-roster"
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
    // Weights are the last competed (lib/coach-roster.ts), the same list Coach Home searches.
    athletes = await loadCoachRoster()
    // The pitch quotes a real number, never a rounded-up one.
    const { count } = await supabase.from("other_tournament_bouts").select("id", { count: "exact", head: true })
    boutsOnFile = count ?? null
  } catch (error) {
    console.error("[compare] roster load failed:", error)
  }
  return <CompareClient athletes={athletes} initialLeft={left} initialRight={right} initialRows={rows} boutsOnFile={boutsOnFile} initialSource={src} />
}
