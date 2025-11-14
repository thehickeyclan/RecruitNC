import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function BentleySlyPage() {
  const supabase = createClient()

  // Try to find Bentley Sly by name
  const { data: athletes } = await supabase.from("athletes").select("*").ilike("name", "%bentley%sly%").limit(1)

  // If found, redirect to the athlete's ID-based page
  if (athletes && athletes.length > 0) {
    redirect(`/athletes/${athletes[0].id}`)
  }

  // If not found, redirect to the athletes page
  redirect("/athletes")
}
