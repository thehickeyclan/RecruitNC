import { createClient } from "@/lib/supabase/server"
import { AdminPromoCodesClient } from "@/components/admin-promo-codes-client"

export const dynamic = "force-dynamic"

export default async function PromoCodesPage() {
  const supabase = await createClient()

  const { data: dbPromoCodes } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false })

  // Map database fields to component expected fields
  const promoCodes = (dbPromoCodes || []).map((code) => ({
    id: String(code.id),
    code: code.code,
    type: code.discount_type as "percentage" | "fixed" | "free_shipping",
    value: code.discount_value || 0,
    usage: code.current_uses || 0,
    limit: code.max_uses,
    start_date: code.valid_from,
    end_date: code.valid_until,
    active: code.is_active ?? true,
    created_at: code.created_at,
    // Store original fields for editing
    min_order_value: code.min_order_value,
    max_uses_per_customer: code.max_uses_per_customer,
  }))

  return <AdminPromoCodesClient promoCodes={promoCodes} />
}
