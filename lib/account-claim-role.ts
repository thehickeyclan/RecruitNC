import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizePhoneForStorage } from "@/lib/phone-format"

export type ClaimRelationship = "self" | "parent"

/**
 * Who this account is, for claiming. The account's role decides the relationship, not the button
 * the family pressed: parents were taking their child's profile as the wrestler from forms that
 * defaulted to "self", and 35 had to be re-linked by hand (3 Nov 2026). A role of athlete or parent
 * wins; any other role (coach, fan, unset) falls back to what the request asked for.
 */
export function relationshipForRole(
  account: { role?: string | null; profile_type?: string | null } | null,
  requested: ClaimRelationship | null,
): ClaimRelationship | null {
  const r = [account?.role, account?.profile_type].map((x) => String(x ?? "").toLowerCase())
  if (r.includes("parent")) return "parent"
  if (r.includes("athlete")) return "self"
  return requested
}

export type ClaimAccount = {
  role: string | null
  profileType: string | null
  fullName: string | null
  cellPhone: string | null
}

export async function loadClaimAccount(admin: SupabaseClient, userId: string): Promise<ClaimAccount> {
  const { data } = await admin
    .from("user_profiles")
    .select("role, profile_type, full_name, first_name, last_name, cell_phone")
    .eq("user_id", userId)
    .maybeSingle()
  const row = (data ?? {}) as Record<string, string | null>
  const fullName = String(row.full_name ?? "").trim() || [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || null
  return { role: row.role ?? null, profileType: row.profile_type ?? null, fullName, cellPhone: row.cell_phone ?? null }
}

/** The account's cell, saved from a claim or create step when sign-up didn't collect one. Never overwrites. */
export async function saveCellIfMissing(admin: SupabaseClient, userId: string, account: ClaimAccount, phone: unknown) {
  if (account.cellPhone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 10) return
  const { error } = await admin.from("user_profiles").update({ cell_phone: normalizePhoneForStorage(phone) }).eq("user_id", userId)
  if (error) console.error("[account-claim-role] saving cell:", error.message)
}
