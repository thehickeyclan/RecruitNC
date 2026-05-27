/** Matches `public.drop_in_requests` (Supabase). Join `events` for current event fields when needed. */
export interface DropInRequest {
  id: string
  event_id?: string | null
  participant_name?: string | null
  wrestler_name?: string | null
  wrestler_age?: number | null
  wrestler_dob?: string | null
  wrestler_cell?: string | null
  wrestler_weight?: string | null
  participant_email?: string | null
  wrestler_email?: string | null
  participant_phone?: string | null
  parent_name?: string | null
  parent_email?: string | null
  parent_phone?: string | null
  experience_level?: string | null
  weight_class?: string | null
  message?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  medical_conditions?: string | null
  additional_notes?: string | null
  status?: string | null
  payment_status?: string | null
  payment_amount_cents?: number | null
  stripe_session_id?: string | null
  stripe_payment_intent_id?: string | null
  waiver_signed_at?: string | null
  waiver_signer_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}
