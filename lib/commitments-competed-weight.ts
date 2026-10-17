import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadLastCompeted } from "@/lib/prospect-last-competed"

/**
 * The commitments list shows the weight each wrestler last competed at, never the profile's listed
 * weight on its own (a standing rule: a listed weight is whatever was typed once, often seasons
 * ago). No competed weight on file reads as no weight, not as the listed one.
 */
export async function withCompetedWeights<T extends { id: string; weightclass?: unknown; graduationyear?: unknown }>(athletes: T[]): Promise<T[]> {
  if (!athletes.length) return athletes
  const last = await loadLastCompeted(
    createAdminClient(),
    athletes.map((a) => String(a.id)),
    new Map(athletes.map((a) => [String(a.id), Number(a.graduationyear) || null])),
  ).catch(() => null)
  if (!last) return athletes
  return athletes.map((a) => ({ ...a, weightclass: last.get(String(a.id))?.weight ?? null }))
}
