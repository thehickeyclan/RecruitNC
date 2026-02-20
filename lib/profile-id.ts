/** True if id looks like a Supabase/UUID athlete id (so /unified-profile/[id] will resolve). */
export function isValidProfileId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())
}
