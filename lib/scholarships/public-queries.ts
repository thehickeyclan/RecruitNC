import { createClient } from "@/lib/supabase/server"

import type { ScholarshipAwardPublicRow, ScholarshipRow } from "@/lib/scholarships/types"

const SCHOLARSHIP_COLUMNS =
  "id, slug, name, tagline, description, criteria, established_year, status, award_amount_cents, hero_image_url, total_donated_cents, total_awarded_cents, applications_open_date, applications_close_date, award_announcement_date"

export async function listScholarshipsForHub(): Promise<ScholarshipRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scholarships")
    .select(SCHOLARSHIP_COLUMNS)
    .neq("status", "archived")
    .order("established_year", { ascending: false })
    .order("created_at", { ascending: true })

  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    return []
  }
  if (error) {
    console.warn("[scholarships] listScholarshipsForHub:", error.message)
    return []
  }
  return (data ?? []) as ScholarshipRow[]
}

export async function getScholarshipBySlug(slug: string): Promise<ScholarshipRow | null> {
  const raw = slug.trim().toLowerCase()
  if (!raw) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scholarships")
    .select(SCHOLARSHIP_COLUMNS)
    .eq("slug", raw)
    .maybeSingle()

  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    return null
  }
  if (error) {
    console.warn("[scholarships] getScholarshipBySlug:", error.message)
    return null
  }
  return data as ScholarshipRow | null
}

export async function listPublicAwardsForScholarship(scholarshipId: string): Promise<ScholarshipAwardPublicRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scholarship_awards")
    .select("id, scholarship_id, award_year, recipient_name, recipient_school, recipient_grad_year, public_citation, awarded_at")
    .eq("scholarship_id", scholarshipId)
    .eq("is_public", true)
    .order("award_year", { ascending: false })

  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    return []
  }
  if (error) {
    console.warn("[scholarships] listPublicAwardsForScholarship:", error.message)
    return []
  }
  return (data ?? []) as ScholarshipAwardPublicRow[]
}

export type PublicAwardWithScholarship = ScholarshipAwardPublicRow & {
  scholarship_slug: string | null
  scholarship_name: string | null
}

export async function listPublicAwardsAll(): Promise<PublicAwardWithScholarship[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scholarship_awards")
    .select(
      "id, scholarship_id, award_year, recipient_name, recipient_school, recipient_grad_year, public_citation, awarded_at, scholarships ( slug, name )",
    )
    .eq("is_public", true)
    .order("awarded_at", { ascending: false })
    .limit(80)

  if (error?.code === "42P01" || error?.message?.includes("does not exist")) {
    return []
  }
  if (error) {
    console.warn("[scholarships] listPublicAwardsAll:", error.message)
    return []
  }

  type JoinRow = ScholarshipAwardPublicRow & {
    scholarships?: { slug: string; name: string } | { slug: string; name: string }[] | null
  }

  const rows = (data ?? []) as JoinRow[]
  return rows.map((r) => {
    const s = r.scholarships
    const one = Array.isArray(s) ? s[0] : s
    return {
      id: r.id,
      scholarship_id: r.scholarship_id,
      award_year: r.award_year,
      recipient_name: r.recipient_name,
      recipient_school: r.recipient_school,
      recipient_grad_year: r.recipient_grad_year,
      public_citation: r.public_citation,
      awarded_at: r.awarded_at,
      scholarship_slug: one?.slug ?? null,
      scholarship_name: one?.name ?? null,
    }
  })
}
