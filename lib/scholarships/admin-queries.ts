import { createAdminClient } from "@/lib/supabase/admin"

import type { ScholarshipApplicationRow } from "@/lib/scholarships/types"

export async function listApplicationsForScholarships(
  scholarshipIds: string[],
): Promise<ScholarshipApplicationRow[]> {
  if (scholarshipIds.length === 0) return []
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("scholarship_applications")
    // Production may not have every optional video-submission column yet.
    // Selecting * keeps legacy rows visible instead of turning a missing
    // optional column into a misleading empty application list.
    .select("*")
    .in("scholarship_id", scholarshipIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[scholarships] listApplicationsForScholarships:", error.message)
    return []
  }
  return (data ?? []) as ScholarshipApplicationRow[]
}

export async function getApplicationById(applicationId: string): Promise<ScholarshipApplicationRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("scholarship_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle()

  if (error) {
    console.warn("[scholarships] getApplicationById:", error.message)
    return null
  }
  return data as ScholarshipApplicationRow | null
}

export type ScholarshipReviewRow = {
  id: string
  created_at: string
  application_id: string
  reviewer_name: string | null
  reviewer_role: string | null
  score: number | null
  comment: string | null
  is_finalist_vote: boolean
}

export async function listReviewsForApplication(applicationId: string): Promise<ScholarshipReviewRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("scholarship_reviews")
    .select("id, created_at, application_id, reviewer_name, reviewer_role, score, comment, is_finalist_vote")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })

  if (error) {
    console.warn("[scholarships] listReviewsForApplication:", error.message)
    return []
  }
  return (data ?? []) as ScholarshipReviewRow[]
}

const ADMIN_SCHOLARSHIP_COLUMNS =
  "id, slug, name, tagline, status, award_amount_cents, total_donated_cents, applications_open_date, applications_close_date, created_at"

export type ScholarshipAdminListRow = {
  id: string
  slug: string
  name: string
  tagline: string | null
  status: string
  award_amount_cents: number | null
  total_donated_cents: number
  applications_open_date: string | null
  applications_close_date: string | null
  created_at: string
}

export type ScholarshipDonationAdminRow = {
  id: string
  created_at: string
  scholarship_id: string
  amount_cents: number
  donor_name: string | null
  donor_email: string | null
  source: string | null
  admin_note: string | null
}

export async function listScholarshipDonationsAdmin(scholarshipId: string): Promise<ScholarshipDonationAdminRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("scholarship_donations")
    .select("id, created_at, scholarship_id, amount_cents, donor_name, donor_email, source, admin_note")
    .eq("scholarship_id", scholarshipId)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[scholarships] listScholarshipDonationsAdmin:", error.message)
    return []
  }
  return (data ?? []) as ScholarshipDonationAdminRow[]
}

export async function getScholarshipAdminById(scholarshipId: string): Promise<ScholarshipAdminListRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("scholarships")
    .select(ADMIN_SCHOLARSHIP_COLUMNS)
    .eq("id", scholarshipId)
    .maybeSingle()

  if (error) {
    console.warn("[scholarships] getScholarshipAdminById:", error.message)
    return null
  }
  return data as ScholarshipAdminListRow | null
}

export async function listScholarshipsAdmin(): Promise<ScholarshipAdminListRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("scholarships")
    .select(ADMIN_SCHOLARSHIP_COLUMNS)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[scholarships] listScholarshipsAdmin:", error.message)
    return []
  }
  return (data ?? []) as ScholarshipAdminListRow[]
}
