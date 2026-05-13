import type { SupabaseClient } from "@supabase/supabase-js"

/** Pending activation rows for a fundraising slug (any requester). */
export async function fetchPendingActivationUserIdsForSlug(
  admin: SupabaseClient,
  slugNormalized: string,
): Promise<string[]> {
  const slug = slugNormalized.trim().toLowerCase()
  if (!slug) return []
  const { data, error } = await admin
    .from("fundraising_activation_requests")
    .select("user_id")
    .eq("fundraising_slug", slug)
    .eq("status", "pending")
  if (error) {
    console.warn("[fundraising-activation-status] pending for slug", error.message)
    return []
  }
  const out: string[] = []
  for (const row of data ?? []) {
    const id = typeof row.user_id === "string" ? row.user_id.trim() : ""
    if (id) out.push(id)
  }
  return out
}
