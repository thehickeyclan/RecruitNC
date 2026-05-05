import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { getFundraisingAthletesIndexRows } from "@/lib/fundraising/athlete-fundraising-profiles"

export type HubAthleteSearchHit = {
  slug: string
  name: string
  school: string
  photoUrl: string | null
  totalRaisedCents: number | null
}

export async function searchHubAthletes(raw: string): Promise<HubAthleteSearchHit[]> {
  const q = raw.trim().toLowerCase()
  if (q.length < 2) return []
  const admin = createAdminClient()
  const entries = await getFundraisingAthleteEntries(admin)
  const rows = await getFundraisingAthletesIndexRows(admin, entries)
  return rows
    .filter((r) => {
      const hay = `${r.displayName} ${r.code} ${r.sublabel ?? ""} ${r.hrefSlug}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, 8)
    .map((r) => ({
      slug: r.hrefSlug,
      name: r.displayName,
      school: (r.sublabel ?? "").trim() || "—",
      photoUrl: r.photoUrl,
      totalRaisedCents: r.totalRaisedCents,
    }))
}
