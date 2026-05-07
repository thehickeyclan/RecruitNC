import type { SupabaseClient } from "@supabase/supabase-js"

function anonymousPrefixForSlug(slug: string): string {
  const s = slug.trim().toLowerCase()
  if (s === "caden-perry") return "CP"
  const parts = s.split("-").filter(Boolean)
  const a = (parts[0]?.[0] ?? "S").toUpperCase()
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "X").toUpperCase()
  return `${a}${b}`
}

/**
 * Generates a human-readable blind-review id (e.g. CP-2026-8421). Unique among existing rows.
 */
export async function allocateScholarshipAnonymousId(
  admin: SupabaseClient,
  params: { slug: string; year: number },
): Promise<string> {
  const prefix = `${anonymousPrefixForSlug(params.slug)}-${params.year}-`

  for (let attempt = 0; attempt < 24; attempt++) {
    const seq = Math.floor(1000 + Math.random() * 9000)
    const candidate = `${prefix}${seq}`
    const { data } = await admin.from("scholarship_applications").select("id").eq("anonymous_id", candidate).maybeSingle()
    if (!data) return candidate
  }

  return `${prefix}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}
