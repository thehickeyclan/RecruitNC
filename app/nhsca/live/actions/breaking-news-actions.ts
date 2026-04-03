"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function publishBreakingNews(message: string, severity: "info" | "warning" | "critical" = "critical") {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("breaking_news")
    .insert({
      message,
      severity,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error publishing breaking news:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  revalidatePath("/nhsca/live/control")

  return { success: true, data }
}

export async function deactivateBreakingNews(id: string) {
  const supabase = await getSupabaseServerClient()

  const { error } = await supabase.from("breaking_news").update({ is_active: false }).eq("id", id)

  if (error) {
    console.error("[v0] Error deactivating breaking news:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  revalidatePath("/nhsca/live/control")

  return { success: true }
}

export async function getActiveBreakingNews() {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("breaking_news")
    .select("*")
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("[v0] Error fetching breaking news:", error)
    return null
  }

  return data
}
