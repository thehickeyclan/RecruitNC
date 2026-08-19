import { beforeEach, describe, expect, it } from "vitest"
import { useCartStore } from "./cart-store"

describe("store cart pricing", () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      promoCode: null,
      promoDiscount: 0,
      promoDiscountType: null,
      shippingAddress: null,
      shippingMethod: null,
    })
  })

  it("does not apply the ended Rivalry discount", () => {
    useCartStore.getState().addItem({
      id: "11111111-1111-4111-8111-111111111111",
      variantId: "22222222-2222-4222-8222-222222222222",
      name: "The Rivalry Tee",
      price: 25,
      image: "/rivalry.png",
      variant: { color: "Navy", size: "M" },
      sku: "RIVALRY-NAVY-M",
      quantity: 1,
      stock: "in-stock",
      stockQuantity: 10,
    })

    const [item] = useCartStore.getState().items
    expect(item.price).toBe(25)
    expect(item.discount).toBe(0)
  })
})
