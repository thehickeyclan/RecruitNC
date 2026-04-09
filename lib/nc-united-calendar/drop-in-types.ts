export interface DropInRequest {
  id: string
  wrestler_name: string
  wrestler_age: number | null
  wrestler_weight?: string | null
  wrestler_experience?: string | null
  parent_name: string
  parent_email: string
  parent_phone?: string | null
  phone: string
  event_id: string
  event_title: string
  event_date: string
  event_start_time?: string
  event_end_time?: string
  event_location?: string
  event_category?: string
  event_coach?: string
  event_max_drop_ins?: number | null
  notes: string
  status: "pending" | "approved" | "denied"
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded"
  payment_amount_cents: number | null
  payment_currency?: string | null
  payment_paid_at?: string | null
  stripe_session_id?: string | null
  stripe_payment_intent_id?: string | null
  stripe_customer_id?: string | null
  created_at: string
  updated_at: string
}
