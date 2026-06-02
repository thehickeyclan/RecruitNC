import type Stripe from "stripe"

type MetadataLike = Stripe.Metadata | Record<string, string | undefined | null> | null | undefined

type SessionLike = {
  metadata?: MetadataLike
  success_url?: string | null
  cancel_url?: string | null
}

/** Wrestling Guild checkout return URLs (shared Stripe account with RecruitNC). */
export function stripeUrlLooksLikeGuild(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const lower = url.toLowerCase()
  if (lower.includes("wrestlingguild.com")) return true
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase()
    return host === "wrestlingguild.com"
  } catch {
    return false
  }
}

/** Stripe metadata written by Wrestling Guild checkout (or future explicit channel tag). */
export function isGuildStripeMetadata(metadata: MetadataLike): boolean {
  const m = (metadata ?? {}) as Record<string, string>
  const channel = String(m.channel ?? "").trim().toLowerCase()
  if (channel === "guild") return true

  const business = String(m.business ?? "").trim().toLowerCase()
  if (business === "wrestling_guild" || business === "wrestling guild") return true

  const source = String(m.source ?? "").trim().toLowerCase()
  if (source === "guild" || source.startsWith("guild_") || source.includes("wrestling_guild")) {
    return true
  }

  if (m.booking_id?.trim() || m.guild_booking_id?.trim() || m.session_booking_id?.trim()) {
    return true
  }

  return false
}

export function isGuildCheckoutSession(session: SessionLike | Stripe.Checkout.Session): boolean {
  if (isGuildStripeMetadata(session.metadata)) return true
  if (stripeUrlLooksLikeGuild(session.success_url) || stripeUrlLooksLikeGuild(session.cancel_url)) {
    return true
  }
  return false
}

export function isGuildOrderRow(order: {
  channel?: string | null
  business?: string | null
  shipping_method?: unknown
}): boolean {
  const ch = String(order.channel ?? "").trim().toLowerCase()
  if (ch === "guild") return true
  const bus = String(order.business ?? "").trim().toLowerCase()
  if (bus === "wrestling_guild" || bus === "wrestling guild") return true
  const method =
    typeof order.shipping_method === "string"
      ? order.shipping_method
      : (order.shipping_method as { name?: string } | null)?.name ?? ""
  if (String(method).toLowerCase().includes("wrestling guild")) return true
  return false
}
