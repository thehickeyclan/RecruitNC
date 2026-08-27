import type { SupabaseClient } from "@supabase/supabase-js"
import { applyKnownIdentities, phoneKeyFor, type KnownPerson } from "@/lib/toc/coach-designation"

/**
 * Loads coach designations and resolves them onto the people we already hold.
 *
 * Every caller needs the same two things and they must agree: the resolved list, and a way back
 * from a resolved coach to the rows that fed them. Approving used the resolved key against the
 * table directly, matched nothing, and reported success — the button did nothing at all.
 */

const COLUMNS =
  "coach_key,coach_name,coach_email,coach_phone,status,athlete_name,weight_class,relationship,submitted_club,submitted_dob,notified_at,notified_channel"

export type ResolvedCoachRows = {
  rows: Record<string, unknown>[]
  resolved: Record<string, unknown>[]
  /** Resolved key → the keys actually stored against those rows. */
  originalKeys: Map<string, string[]>
}

export async function loadResolvedCoachRows(
  admin: SupabaseClient,
): Promise<{ ok: true; value: ResolvedCoachRows } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("toc_coach_designations")
    .select(COLUMNS)
    .order("created_at", { ascending: true })

  if (error) return { ok: false, error: error.message }

  const rows = (data ?? []) as Record<string, unknown>[]

  const emails = [...new Set(rows.map((r) => String(r.coach_email ?? "").trim().toLowerCase()).filter(Boolean))]
  const phones = [...new Set(rows.map((r) => phoneKeyFor(String(r.coach_phone ?? ""))).filter(Boolean))] as string[]

  const identities = new Map<string, KnownPerson>()
  if (emails.length > 0 || phones.length > 0) {
    const [byEmail, byPhone] = await Promise.all([
      emails.length
        ? admin.from("user_profiles").select("user_id,full_name,email,cell_phone").in("email", emails)
        : Promise.resolve({ data: [] as Record<string, string | null>[] }),
      phones.length
        ? admin.from("user_profiles").select("user_id,full_name,email,cell_phone").in("cell_phone", phones)
        : Promise.resolve({ data: [] as Record<string, string | null>[] }),
    ])

    for (const person of [...(byEmail.data ?? []), ...(byPhone.data ?? [])]) {
      const known: KnownPerson = {
        key: `user:${person.user_id}`,
        name: person.full_name ?? null,
        email: person.email ?? null,
        phone: person.cell_phone ?? null,
      }
      const personEmail = String(person.email ?? "").trim().toLowerCase()
      if (personEmail) identities.set(personEmail, known)
      const personPhone = phoneKeyFor(String(person.cell_phone ?? ""))
      if (personPhone) identities.set(`tel:${personPhone}`, known)
    }
  }

  const resolved = applyKnownIdentities(rows as never, identities) as unknown as Record<string, unknown>[]

  const originalKeys = new Map<string, string[]>()
  rows.forEach((row, i) => {
    const canonical = String(resolved[i].coach_key)
    const list = originalKeys.get(canonical) ?? []
    const original = String(row.coach_key)
    if (!list.includes(original)) list.push(original)
    originalKeys.set(canonical, list)
  })

  return { ok: true, value: { rows, resolved, originalKeys } }
}
