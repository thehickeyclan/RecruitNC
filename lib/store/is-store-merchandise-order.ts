/** Apparel store orders — not national team, Blue, or practice drop-ins. */
export function isStoreMerchandiseOrder(row: {
  channel?: string | null
  shipping_method?: unknown
}): boolean {
  const method = row.shipping_method as { name?: string } | null | undefined
  const name = method?.name ?? ""
  if (name === "National team event" || name === "Practice Drop-in" || name === "Blue membership") {
    return false
  }
  const ch = row.channel?.trim() ?? ""
  if (ch === "store" || ch === "") return true
  return false
}
