import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  ensureNationalTeamOrderLineItems,
  isGenericPlaceholderOrderItemName,
  isNationalTeamCatalogSku,
} from "@/lib/national-team-order-items"
import { resolveNationalTeamOrderTotalCents } from "@/lib/nhsca-hub-checkout-pricing"
import { fetchMergedStoreMetadata } from "@/lib/store/stripe-legacy-metadata"
import { reconcileStoreOrderItemsFromStripe } from "@/lib/store/reconcile-order-items-from-stripe"
import { isGuildCheckoutSession, isGuildOrderRow } from "@/lib/stripe-guild-detection"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : ""
    const force = body.force === true

    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const stripe = getStripe()

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, stripe_payment_intent_id, total, channel, business, shipping_method")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 })
    }

    if (isGuildOrderRow(order)) {
      return NextResponse.json(
        { success: false, error: "Guild bookings are not store orders — rebuild is disabled." },
        { status: 400 },
      )
    }

    const piId = order.stripe_payment_intent_id as string | null

    if (piId) {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 })
      const session = sessions.data?.[0]
      if (session && isGuildCheckoutSession(session)) {
        return NextResponse.json(
          { success: false, error: "Guild checkout — not a RecruitNC store order." },
          { status: 400 },
        )
      }
      if (session?.metadata?.source === "national_team") {
        const orderTotalCents = Math.round(Number((order as { total?: number }).total ?? 0) * 100)
        const { data: reg } = await admin
          .from("national_team_event_registrations")
          .select("reg_fee_cents, apparel_fee_cents, event_slug, singlet_size, shorts_size, shirt_size, checkout_lines")
          .eq("order_id", orderId)
          .maybeSingle()
        const regCheckoutLines =
          (session.metadata?.checkout_lines as string | undefined) ??
          String((reg as { checkout_lines?: string | null } | null)?.checkout_lines ?? "")
        const regTotal = resolveNationalTeamOrderTotalCents({
          checkout_lines: regCheckoutLines,
          reg_fee_cents: (reg as { reg_fee_cents?: number } | null)?.reg_fee_cents,
          apparel_fee_cents: (reg as { apparel_fee_cents?: number } | null)?.apparel_fee_cents,
          stripeAmountCents: (session as { amount_total?: number | null }).amount_total ?? 0,
        })
        const { data: products } = await admin.from("products").select("id, name, slug").eq("category", "national_team")
        const regEventSlug = String((reg as { event_slug?: string } | null)?.event_slug ?? "")
        const bundleSlug = regEventSlug === "aau-2026" ? "aau-2026-bundle" : "nhsca-2026-bundle"
        const bundleProduct =
          (products ?? []).find((p: { slug?: string }) => p.slug === bundleSlug) ??
          (products ?? []).find((p: { slug?: string }) => p.slug === "nhsca-2026-bundle") ??
          (products ?? [])[0]
        const replaced = await ensureNationalTeamOrderLineItems(admin, {
          orderId,
          paymentIntentId: piId,
          linesEncoded: regCheckoutLines,
          totalCents: regTotal > 0 ? regTotal : orderTotalCents,
          eventSlug: regEventSlug || "nhsca-duals-2026",
          apparelSizes: {
            singlet_size: (reg as { singlet_size?: string | null } | null)?.singlet_size,
            shorts_size: (reg as { shorts_size?: string | null } | null)?.shorts_size,
            shirt_size: (reg as { shirt_size?: string | null } | null)?.shirt_size,
          },
          bundleProduct: bundleProduct as { id?: string; name?: string } | null,
          forceReplace: true,
        })
        if (replaced) {
          if (regCheckoutLines) {
            await admin
              .from("national_team_event_registrations")
              .update({ checkout_lines: regCheckoutLines.slice(0, 500), updated_at: new Date().toISOString() })
              .eq("order_id", orderId)
          }
          await admin
            .from("orders")
            .update({
              shipping_method: { name: "National team event", price: 0 },
              subtotal: regTotal / 100,
              total: regTotal / 100,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
          return NextResponse.json({
            success: true,
            message: "Recovered national team line items from Stripe checkout.",
          })
        }
        return NextResponse.json(
          { success: false, error: "Could not rebuild national team line items (missing checkout_lines)." },
          { status: 400 },
        )
      }
    }

    const { data: existingItems } = await admin.from("order_items").select("id, product_name, sku").eq("order_id", orderId)
    const hasOnlyGeneric =
      existingItems &&
      existingItems.length > 0 &&
      existingItems.every((i) => isGenericPlaceholderOrderItemName((i as { product_name?: string }).product_name))
    const allNationalTeamCatalog =
      existingItems &&
      existingItems.length > 0 &&
      existingItems.every((i) => isNationalTeamCatalogSku((i as { sku?: string }).sku))

    if (allNationalTeamCatalog && piId) {
      return NextResponse.json({
        success: false,
        error: "National team order — use Rebuild from Stripe on the order page (not store recovery).",
      }, { status: 400 })
    }

    if (!force && existingItems && existingItems.length > 0 && !hasOnlyGeneric && piId) {
      const { meta } = await fetchMergedStoreMetadata(stripe, piId)
      const expected = parseInt(meta.item_count || "0", 10)
      const subtotal = Number((order as { subtotal?: number }).subtotal ?? order.total ?? 0)
      const likelyIncomplete =
        (expected > 0 && existingItems.length < expected) ||
        (subtotal >= 100 && existingItems.length * 50 < subtotal * 0.9)
      if (!likelyIncomplete) {
        return NextResponse.json({
          success: true,
          message: "Order already has items. Pass force=true to rebuild from Stripe.",
        })
      }
    }

    const result = await reconcileStoreOrderItemsFromStripe(admin, orderId, stripe, { force: force || hasOnlyGeneric })

    if (result.reconciled) {
      return NextResponse.json({
        success: true,
        message: `Recovered ${result.itemCount} item(s) from Stripe.`,
      })
    }

    if (result.reason === "already complete") {
      return NextResponse.json({
        success: true,
        message: "Order line items already match Stripe.",
      })
    }

    return NextResponse.json(
      { success: false, error: result.reason ?? "No store items found in Stripe metadata." },
      { status: 400 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to recover order items"
    console.error("[recover-order-items]", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
