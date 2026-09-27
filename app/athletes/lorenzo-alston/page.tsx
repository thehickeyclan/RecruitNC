import { ATHLETE_PUBLIC_COLUMNS } from "@/lib/athlete-public-columns"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LorenzoAlstonPage() {
  const supabase = createClient()

  // Try to find Lorenzo Alston by name
  const { data: athletes } = await supabase.from("athletes").select(ATHLETE_PUBLIC_COLUMNS).ilike("name", "%lorenzo%alston%").limit(1)

  // If found, redirect to the athlete's ID-based page
  if (athletes && athletes.length > 0) {
    redirect(`/athletes/${athletes[0].id}`)
  }

  // If not found, redirect to the athletes page
  redirect("/athletes")
}
