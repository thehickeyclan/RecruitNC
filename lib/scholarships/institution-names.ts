import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Every school and club name held, for stripping out of blind-review essays.
 *
 * Read at request time rather than baked in: a club added next week should be redacted next week.
 * Failure is not fatal — an essay with a school name left in is worse than one that renders, but
 * far better than a review page that will not load at all.
 */
export async function listRedactableInstitutionNames(): Promise<string[]> {
  try {
    const admin = createAdminClient()
    const [{ data: schools }, { data: clubs }] = await Promise.all([
      admin.from("schools").select("name, canonical_name"),
      admin.from("wrestling_clubs").select("name"),
    ])
    return [
      ...(schools ?? []).flatMap((s) => [s.name, s.canonical_name]),
      ...(clubs ?? []).map((c) => c.name),
    ].flatMap((n) => (typeof n === "string" && n.trim() ? [n.trim()] : []))
  } catch (e) {
    console.warn("[scholarships] institution names for redaction:", e)
    return []
  }
}
