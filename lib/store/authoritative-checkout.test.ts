import type { SupabaseClient } from "@supabase/supabase-js"
import { afterEach, describe, expect, it } from "vitest"
import { buildAuthoritativeStoreCheckout } from "./authoritative-checkout"
import { buildStoreOrderItems } from "./checkout-order"

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111"
const VARIANT_ID = "22222222-2222-4222-8222-222222222222"

function checkoutClient(options?: {
  stock?: number
  promo?: Record<string, unknown> | null
}): SupabaseClient {
  const product = {
    id: PRODUCT_ID,
    name: "Tournament Tee",
    price: 25,
    image_url: "https://example.com/tee.png",
    in_stock: true,
    show_in_public_store: true,
    product_variants: [
      {
        id: VARIANT_ID,
        product_id: PRODUCT_ID,
        sku: "TOC-TEE-NAVY-M",
        color: "Navy",
        size: "M",
        stock_quantity: options?.stock ?? 10,
      },
    ],
  }

  return {
    from(table: string) {
      if (table === "products") {
        const builder = {
          select() {
            return builder
          },
          async in() {
            return { data: [product], error: null }
          },
        }
        return builder
      }
      if (table === "promo_codes") {
        let requestedCode = ""
        const builder = {
          select() {
            return builder
          },
          eq(column: string, value: string) {
            if (column === "code") requestedCode = value
            return builder
          },
          async maybeSingle() {
            const promo = options?.promo
            return {
              data: promo && String(promo.code) === requestedCode ? promo : null,
              error: null,
            }
          },
        }
        return builder
      }
      throw new Error(`Unexpected table ${table}`)
    },
  } as unknown as SupabaseClient
}

afterEach(() => {
  delete process.env.STORE_TAX_RATE
})

describe("authoritative store checkout", () => {
  it("builds prices, shipping, tax, identity, and totals from server-owned data", async () => {
    const result = await buildAuthoritativeStoreCheckout(checkoutClient(), {
      items: [{ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 2 }],
      shippingMethod: { id: "standard" },
    })

    expect(result).toEqual({
      ok: true,
      checkout: {
        items: [
          {
            id: PRODUCT_ID,
            variantId: VARIANT_ID,
            name: "Tournament Tee",
            price: 25,
            quantity: 2,
            variant: { color: "Navy", size: "M" },
            sku: "TOC-TEE-NAVY-M",
            image: "https://example.com/tee.png",
          },
        ],
        shippingMethod: {
          id: "standard",
          name: "Ship anywhere",
          price: 5,
          estimatedDays: "5-7 business days",
        },
        subtotal: 50,
        shipping: 5,
        tax: 4,
        discount: 0,
        total: 59,
        promoCode: undefined,
      },
    })
  })

  it("rejects a quantity that live variant inventory cannot fulfill", async () => {
    const result = await buildAuthoritativeStoreCheckout(checkoutClient({ stock: 1 }), {
      items: [{ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 2 }],
      shippingMethod: { id: "pickup" },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("only has 1 available")
  })

  it("revalidates and recalculates a percentage promo on the server", async () => {
    const result = await buildAuthoritativeStoreCheckout(
      checkoutClient({
        promo: {
          code: "CHAMPS10",
          is_active: true,
          discount_type: "percentage",
          discount_value: 10,
          current_uses: 0,
        },
      }),
      {
        items: [{ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 2 }],
        shippingMethod: { id: "pickup" },
        promoCode: "champs10",
      },
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.checkout.subtotal).toBe(50)
      expect(result.checkout.discount).toBe(5)
      expect(result.checkout.tax).toBe(3.6)
      expect(result.checkout.total).toBe(48.6)
    }
  })

  it("stores the real product, variant, and SKU on order items", () => {
    const [line] = buildStoreOrderItems(
      [
        {
          id: PRODUCT_ID,
          variantId: VARIANT_ID,
          name: "Tournament Tee",
          price: 25,
          quantity: 1,
          variant: { color: "Navy", size: "M" },
          sku: "TOC-TEE-NAVY-M",
        },
      ],
      "33333333-3333-4333-8333-333333333333",
      "test",
      [{ id: PRODUCT_ID, name: "Tournament Tee", image_url: null }],
    )

    expect(line.product_id).toBe(PRODUCT_ID)
    expect(line.variant_id).toBe(VARIANT_ID)
    expect(line.sku).toBe("TOC-TEE-NAVY-M")
  })
})
