import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

import { COACH_HOME_PATH } from "@/lib/portal-hint"

/**
 * The Recruiting Command Center is for families. A college coach's only way in to recruiting is
 * the coach portal (Matt, 19 Oct 2026): a coach who opens a family page is sent to Coach Home.
 * Admins are never sent away - they check both sides.
 */
export async function sendCollegeCoachesToTheirPortal(admin: SupabaseClient, userId: string): Promise<void> {
  const { data } = await admin.from("user_profiles").select("role, profile_type, is_admin").eq("user_id", userId).maybeSingle()
  if (!data || data.is_admin === true || data.role === "admin") return
  if (data.role === "college_coach" || data.profile_type === "college-coach") redirect(COACH_HOME_PATH)
}
