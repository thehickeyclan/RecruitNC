import { parseStoreItemsFromMetadata } from "@/lib/store/reconcile-order-items-from-stripe"

export type StoreOrderIntegrity = {
  /** Declared in Stripe metadata (`itemCount`). */
  declaredItemCount: number
  /** Line entries parsed from Stripe `items` JSON. */
  stripeLineCount: number
  /** Sum of quantities in Stripe JSON. */
  stripeQuantitySum: number
  /** Rows currently in Supabase `order_items`. */
  dbLineCount: number
  /** Paid subtotal from order row. */
  subtotal: number
  /** Typical unit price from Stripe lines (e.g. 50). */
  unitPrice: number
  /** subtotal / unitPrice when unit price known. */
  paidUnitsFromSubtotal: number
  /** Stripe JSON is shorter than declared count — data was truncated at checkout. */
  stripeMetadataTruncated: boolean
  /** DB has fewer lines than Stripe JSON (should not happen after reconcile). */
  dbIncompleteVsStripe: boolean
  /** Do not treat admin line items as fulfillment-ready. */
  fulfillmentUnsafe: boolean
  summary: string
  detail: string
}

export function analyzeStoreOrderIntegrity(input: {
  meta: Record<string, string>
  dbItemCount: number
  dbQuantitySum: number
  subtotal: number
  productsList: { id: string; name: string | null; image_url: string | null }[]
}): StoreOrderIntegrity {
  const stripeItems = parseStoreItemsFromMetadata(input.meta, input.productsList)
  const declaredItemCount = parseInt(input.meta.item_count || "0", 10) || 0
  const stripeLineCount = stripeItems.length
  const stripeQuantitySum = stripeItems.reduce((s, i) => s + Math.max(1, i.quantity), 0)
  const unitPrice =
    stripeItems.length > 0
      ? stripeItems.reduce((s, i) => s + Number(i.price || 0), 0) / stripeItems.length
      : 0
  const paidUnitsFromSubtotal =
    unitPrice > 0 && input.subtotal > 0 ? Math.round(input.subtotal / unitPrice) : 0

  const stripeMetadataTruncated =
    (declaredItemCount > 0 && stripeLineCount < declaredItemCount) ||
    (paidUnitsFromSubtotal > 0 && stripeQuantitySum < paidUnitsFromSubtotal)

  const dbIncompleteVsStripe = input.dbLineCount < stripeLineCount || input.dbQuantitySum < stripeQuantitySum

  const fulfillmentUnsafe =
    stripeMetadataTruncated || dbIncompleteVsStripe || (declaredItemCount > 0 && input.dbQuantitySum < declaredItemCount)

  let summary = "Line items match checkout."
  let detail = ""

  if (stripeMetadataTruncated) {
    const missing = Math.max(declaredItemCount - stripeLineCount, paidUnitsFromSubtotal - stripeQuantitySum, 0)
    summary = `Incomplete — only ${stripeLineCount} of ${declaredItemCount || paidUnitsFromSubtotal} items exist in Stripe`
    detail =
      `The legacy store checkout (${"store.ncwrestlingunited.com"}) squeezed the cart into Stripe metadata (500-character limit). ` +
      `${missing} item(s) were never saved to Stripe or Supabase. ` +
      `Do not fulfill from this screen alone — verify with the customer or their confirmation email. ` +
      (paidUnitsFromSubtotal > 0 && paidUnitsFromSubtotal !== declaredItemCount
        ? `Subtotal $${input.subtotal.toFixed(2)} ≈ ${paidUnitsFromSubtotal} units at $${unitPrice.toFixed(2)} each. `
        : "")
  } else if (dbIncompleteVsStripe) {
    summary = `Database has ${input.dbLineCount} lines; Stripe has ${stripeLineCount}.`
    detail = "Rebuild from Stripe or contact support — DB is missing lines that exist in Stripe metadata."
  }

  return {
    declaredItemCount,
    stripeLineCount,
    stripeQuantitySum,
    dbLineCount: input.dbLineCount,
    subtotal: input.subtotal,
    unitPrice,
    paidUnitsFromSubtotal,
    stripeMetadataTruncated,
    dbIncompleteVsStripe,
    fulfillmentUnsafe,
    summary,
    detail,
  }
}
