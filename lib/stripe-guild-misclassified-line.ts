import { isGenericPlaceholderOrderItemName } from "@/lib/nhsca-hub-checkout-pricing"

/** Line names from RecruitNC webhook fallbacks — not real Guild catalog copy. */
export function isMisclassifiedGuildGhostLineName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase()
  if (!n) return true
  if (isGenericPlaceholderOrderItemName(name)) return true
  if (n.includes("practice drop-in") || n.includes("practice drop in")) return true
  if (n === "practice drop-in" || n === "drop-in") return true
  return false
}

export function isPracticeDropInShippingMethod(shippingMethod: unknown): boolean {
  const method =
    typeof shippingMethod === "string"
      ? shippingMethod
      : (shippingMethod as { name?: string } | null)?.name ?? ""
  const lower = String(method).toLowerCase()
  return lower.includes("practice drop-in") || lower.includes("practice drop in")
}
