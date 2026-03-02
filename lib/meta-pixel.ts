/**
 * Meta Pixel (Facebook Pixel) event helpers.
 * Call these after the Meta Pixel script has loaded (e.g. from MetaPixel component).
 */

declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void
  }
}

export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !window.fbq) return
  window.fbq("track", eventName, params)
}

export function trackViewContent(
  contentIds?: string[],
  contentName?: string,
  value?: number,
  currency = "USD"
): void {
  trackMetaEvent("ViewContent", {
    content_ids: contentIds,
    content_name: contentName,
    value,
    currency,
  })
}

export function trackAddToCart(
  contentIds: string[],
  contentName: string,
  value: number,
  currency = "USD",
  contentType = "product",
  numItems = 1
): void {
  trackMetaEvent("AddToCart", {
    content_ids: contentIds,
    content_name: contentName,
    value,
    currency,
    content_type: contentType,
    num_items: numItems,
  })
}

export function trackInitiateCheckout(
  value?: number,
  currency = "USD",
  numItems?: number
): void {
  trackMetaEvent("InitiateCheckout", {
    value,
    currency,
    num_items: numItems,
  })
}

/**
 * Purchase conversion event.
 * Fire once on the order confirmation / thank-you page after payment succeeds.
 * Required for conversion optimization and catalog ads: value, currency.
 * Optional: order_id (dedupe), content_ids, contents, content_type, num_items.
 */
export function trackPurchase(
  value: number,
  currency = "USD",
  orderId?: string,
  contentIds?: string[],
  numItems?: number,
  contents?: Array<{ id: string; quantity: number }>
): void {
  const params: Record<string, unknown> = {
    value,
    currency,
    content_type: "product",
  }
  if (orderId != null) params.order_id = orderId
  if (contentIds != null && contentIds.length > 0) params.content_ids = contentIds
  if (numItems != null) params.num_items = numItems
  if (contents != null && contents.length > 0) params.contents = contents

  trackMetaEvent("Purchase", params)
}
