import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Sum of admin-recorded moves from the NC United Training Fund pool into named scholarships.
 * Same rows as `scholarship_donations` with `source = 'training_fund_allocation'`.
 */
export async function sumTrainingFundScholarshipAllocationsCents(): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("scholarship_donations")
    .select("amount_cents")
    .eq("source", "training_fund_allocation")

  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "42703" ||
      error.message?.includes("does not exist") ||
      error.message?.includes("column")
    ) {
      return 0
    }
    console.warn("[scholarships] sumTrainingFundScholarshipAllocationsCents:", error.message)
    return 0
  }

  let total = 0
  for (const row of data ?? []) {
    const n = (row as { amount_cents?: number }).amount_cents
    if (typeof n === "number" && Number.isFinite(n)) total += n
  }
  return total
}
