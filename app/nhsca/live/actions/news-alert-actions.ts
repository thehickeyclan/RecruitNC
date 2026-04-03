"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createManualNewsAlert(formData: FormData) {
  const supabase = await getSupabaseServerClient()

  const alertText = formData.get("alert_text") as string
  const wrestlerName = formData.get("wrestler_name") as string
  const weightClass = formData.get("weight_class") as string

  if (!alertText) {
    return { success: false, error: "Alert text is required" }
  }

  const { error } = await supabase.from("news_alerts").insert({
    alert_text: alertText,
    alert_type: "manual",
    wrestler_name: wrestlerName || null,
    weight_class: weightClass || null,
  })

  if (error) {
    console.error("Error creating news alert:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  revalidatePath("/nhsca/live/control")

  return { success: true }
}

export async function deleteNewsAlert(alertId: string) {
  const supabase = await getSupabaseServerClient()

  const { error } = await supabase.from("news_alerts").delete().eq("id", alertId)

  if (error) {
    console.error("Error deleting news alert:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  revalidatePath("/nhsca/live/control")

  return { success: true }
}
