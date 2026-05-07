export type ScholarshipStatus = "active" | "applications_open" | "applications_closed" | "archived"

export type ScholarshipApplicationStatus =
  | "submitted"
  | "under_review"
  | "finalist"
  | "awarded"
  | "not_selected"

export type ScholarshipReviewerRole = "family" | "committee" | "admin"

export type ScholarshipRow = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  criteria: string | null
  established_year: number | null
  status: ScholarshipStatus
  award_amount_cents: number | null
  hero_image_url: string | null
  total_donated_cents: number
  total_awarded_cents: number
  applications_open_date: string | null
  applications_close_date: string | null
  award_announcement_date: string | null
}

export type ScholarshipAwardPublicRow = {
  id: string
  scholarship_id: string
  award_year: number | null
  recipient_name: string | null
  recipient_school: string | null
  recipient_grad_year: number | null
  public_citation: string | null
  awarded_at: string
}

export type ScholarshipApplicationRow = {
  id: string
  scholarship_id: string
  created_at: string
  athlete_name: string
  athlete_school: string
  athlete_grad_year: number | null
  athlete_weight_class: string | null
  athlete_email: string | null
  athlete_phone: string | null
  nominator_name: string
  nominator_relationship: string
  nominator_email: string
  nominator_phone: string | null
  written_statement: string
  wrestling_moment: string | null
  reference_name: string | null
  reference_relationship: string | null
  reference_email: string | null
  reference_phone: string | null
  status: ScholarshipApplicationStatus
}
