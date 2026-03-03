"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// Free Rivalry tee promotion — ENDED
const isPromotionActive = () => false

// Blue / drop-in orders: no low quantity limit (default 10 for other products)
const DROPIN_BLUE_SKUS = ["DROPIN", "BLUE-SUB"]
export const getMaxQuantityForItem = (item: { sku?: string | null; name?: string }): number => {
  const sku = (item.sku || "").toUpperCase()
  if (DROPIN_BLUE_SKUS.includes(sku)) return 99
  if (item.name && /drop-in|blue\s*program|practice\s*drop/i.test(item.name)) return 99
  return 10
}

// Helper function to update Rivalry Tee prices based on cart contents
const updateRivalryTeePrices = (items: CartItem[]): CartItem[] => {
  const hasOtherItems = items.some((i) => !i.name.toLowerCase().includes("rivalry"))

  return items.map((item) => {
    const isRivalryTee = item.name.toLowerCase().includes("rivalry")

    if (isRivalryTee && isPromotionActive()) {
      if (hasOtherItems) {
        return {
          ...item,
          originalPrice: item.originalPrice || item.price,
          discount: 1.0,
          price: 0,
        }
      } else {
        return {
          ...item,
          originalPrice: item.originalPrice || item.price,
          discount: 0,
          price: item.originalPrice || item.price,
        }
      }
    }

    return item
  })
}

export interface CartItem {
  id: number
  name: string
  price: number
  image: string
  variant: {
    color: string
    size: string
  }
  sku: string
  quantity: number
  stock: "in-stock" | "low-stock"
  discount?: number
  originalPrice?: number
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  address1: string
  address2?: string
  city: string
  state: string
  zipCode: string
  phone: string
}

export interface ShippingMethod {
  id: string
  name: string
  price: number
  days: string
  description: string
}

export interface CartTotalBreakdown {
  subtotal: number
  shipping: number | null
  tax: number
  discount: number
  total: number
  promoCode: string | null
}

interface CartStore {
  items: CartItem[]
  promoCode: string | null
  promoDiscount: number
  promoDiscountType: "percentage" | "fixed" | "free_shipping" | null
  shippingAddress: ShippingAddress | null
  shippingMethod: ShippingMethod | null
  addItem: (item: CartItem) => void
  autoAddRivalryTee: () => Promise<boolean>
  removeItem: (id: number, variant: { color: string; size: string }) => void
  updateQuantity: (id: number, variant: { color: string; size: string }, quantity: number) => void
  applyPromoCode: (code: string) => Promise<boolean>
  removePromoCode: () => void
  setShippingAddress: (address: ShippingAddress) => void
  setShippingMethod: (method: ShippingMethod) => void
  clearCart: () => void
  getSubtotal: () => number
  getShippingCost: () => number | null
  getTax: () => number
  getTotal: () => CartTotalBreakdown
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      promoDiscount: 0,
      promoDiscountType: null,
      shippingAddress: null,
      shippingMethod: null,

      addItem: (item) => {
        set((state) => {
          const isRivalryTeeItem = item.name.toLowerCase().includes("rivalry")
          let itemWithDiscount = item

          const itemsAfterAdd = [...state.items, item]
          const hasOtherItems = itemsAfterAdd.some(
            (i) => !i.name.toLowerCase().includes("rivalry") && i.id !== item.id
          )

          if (isRivalryTeeItem) {
            if (isPromotionActive() && hasOtherItems) {
              itemWithDiscount = {
                ...item,
                originalPrice: item.price,
                discount: 1.0,
                price: 0,
              }
            } else if (isPromotionActive() && !hasOtherItems) {
              itemWithDiscount = {
                ...item,
                originalPrice: item.price,
                discount: 0,
                price: item.price,
              }
            } else {
              itemWithDiscount = {
                ...item,
                originalPrice: item.price,
                discount: 0.5,
                price: item.price * 0.5,
              }
            }
          }

          const existingItem = state.items.find(
            (i) =>
              i.id === itemWithDiscount.id &&
              i.variant.color === itemWithDiscount.variant.color &&
              i.variant.size === itemWithDiscount.variant.size
          )

          if (existingItem) {
            const maxQty = getMaxQuantityForItem(itemWithDiscount)
            const updatedItems = state.items.map((i) =>
              i.id === itemWithDiscount.id &&
              i.variant.color === itemWithDiscount.variant.color &&
              i.variant.size === itemWithDiscount.variant.size
                ? { ...i, quantity: Math.min(i.quantity + itemWithDiscount.quantity, maxQty) }
                : i
            )
            const finalItems = updateRivalryTeePrices(updatedItems)
            return { items: finalItems }
          }

          const newItems = [...state.items, itemWithDiscount]
          const finalItems = updateRivalryTeePrices(newItems)
          return { items: finalItems }
        })
      },

      autoAddRivalryTee: async () => {
        const state = get()
        if (!isPromotionActive()) return false

        const hasRivalryTee = state.items.some((i) => i.name.toLowerCase().includes("rivalry"))
        const hasOtherItems = state.items.some((i) => !i.name.toLowerCase().includes("rivalry"))

        if (hasRivalryTee || !hasOtherItems) return false

        const otherItem = state.items.find((i) => !i.name.toLowerCase().includes("rivalry"))
        const preferredSize = otherItem?.variant?.size || "L"

        try {
          const response = await fetch("/api/products/rivalry-tee")
          if (response.ok) {
            const data = await response.json()
            const rivalryProduct = data.product
            const defaultVariant = data.defaultVariant
            const defaultImage = data.defaultImage

            const variants = (rivalryProduct.product_variants || []) as Array<{
              size?: string
              color?: string
              sku?: string
              stock_quantity?: number
            }>
            const matchingVariant =
              variants.find((v) => v.size === preferredSize && (v.stock_quantity || 0) > 0) ||
              variants.find((v) => v.size === preferredSize) ||
              defaultVariant

            const rivalryTeeItem: CartItem = {
              id:
                typeof rivalryProduct.id === "string"
                  ? parseInt(rivalryProduct.id, 10)
                  : rivalryProduct.id,
              name: rivalryProduct.name,
              price: 0,
              originalPrice: parseFloat(rivalryProduct.price) || 0,
              discount: 1.0,
              image: defaultImage,
              variant: {
                color: matchingVariant?.color || defaultVariant?.color || "Navy",
                size: matchingVariant?.size || preferredSize || "L",
              },
              sku:
                matchingVariant?.sku ||
                defaultVariant?.sku ||
                `RIVALRY-${rivalryProduct.id}`,
              quantity: 1,
              stock:
                (matchingVariant?.stock_quantity ?? defaultVariant?.stock_quantity ?? 0) > 0
                  ? "in-stock"
                  : "low-stock",
            }

            set((currentState) => ({
              items: [...currentState.items, rivalryTeeItem],
            }))
            return true
          }
        } catch (error) {
          console.error("[cart] Error fetching Rivalry Tee:", error)
        }
        return false
      },

      removeItem: (id, variant) => {
        set((state) => {
          const itemsAfterRemove = state.items.filter(
            (item) =>
              !(
                item.id === id &&
                item.variant.color === variant.color &&
                item.variant.size === variant.size
              )
          )

          const hasOtherItems = itemsAfterRemove.some(
            (i) => !i.name.toLowerCase().includes("rivalry")
          )

          const updatedItems = itemsAfterRemove.map((item) => {
            const isRivalryTee = item.name.toLowerCase().includes("rivalry")

            if (isRivalryTee && isPromotionActive()) {
              if (hasOtherItems) {
                return {
                  ...item,
                  originalPrice: item.originalPrice || item.price,
                  discount: 1.0,
                  price: 0,
                }
              } else {
                return {
                  ...item,
                  originalPrice: item.originalPrice || item.price,
                  discount: 0,
                  price: item.originalPrice || item.price,
                }
              }
            }
            return item
          })

          return { items: updatedItems }
        })
      },

      updateQuantity: (id, variant, quantity) => {
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (
              item.id !== id ||
              item.variant.color !== variant.color ||
              item.variant.size !== variant.size
            )
              return item
            const maxQty = getMaxQuantityForItem(item)
            return { ...item, quantity: Math.max(1, Math.min(quantity, maxQty)) }
          })
          const finalItems = updateRivalryTeePrices(updatedItems)
          return { items: finalItems }
        })
      },

      applyPromoCode: async (code) => {
        try {
          const subtotal = get().getSubtotal()
          const normalizedCode = code.toUpperCase().trim()

          const isRivalryPromo =
            normalizedCode === "THERIVALRY" || normalizedCode === "THERIVALRY%"
          const items = get().items
          const hasRivalryTee = items.some((item) =>
            item.name.toLowerCase().includes("rivalry")
          )

          if (isRivalryPromo && !hasRivalryTee) {
            return false
          }

          const response = await fetch("/api/promo/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: normalizedCode, subtotal }),
          })

          const data = await response.json()

          if (data.valid) {
            let discount = 0

            if (isRivalryPromo && hasRivalryTee) {
              discount = 0
            } else {
              if (data.promoCode.discount_type === "percentage") {
                discount = (subtotal * data.promoCode.discount_value) / 100
              } else if (data.promoCode.discount_type === "fixed") {
                discount = Math.min(data.promoCode.discount_value, subtotal)
              } else if (data.promoCode.discount_type === "free_shipping") {
                discount = 0
              }
            }

            set({
              promoCode: data.promoCode.code,
              promoDiscount: discount,
              promoDiscountType: data.promoCode.discount_type,
            })
            return true
          }
          return false
        } catch (error) {
          console.error("[cart] Error validating promo code:", error)
          return false
        }
      },

      removePromoCode: () => {
        set({ promoCode: null, promoDiscount: 0, promoDiscountType: null })
      },

      setShippingAddress: (address) => {
        set({ shippingAddress: address })
      },

      setShippingMethod: (method) => {
        set({ shippingMethod: method })
      },

      clearCart: () => {
        set({ items: [], promoCode: null, promoDiscount: 0, promoDiscountType: null })
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      getShippingCost: () => {
        const method = get().shippingMethod
        const promoDiscountType = get().promoDiscountType
        if (method) {
          return promoDiscountType === "free_shipping" ? 0 : method.price
        }
        return null
      },

      getTax: () => {
        const items = get().items
        const subtotal = get().getSubtotal()
        const discount = get().promoDiscount || 0
        const subtotalAfterDiscount = Math.max(0, subtotal - discount)

        if (subtotalAfterDiscount <= 0) return 0

        const TAX_EXEMPT_SKUS = ["DROPIN", "BLUE-SUB"]
        const allPracticeFee =
          items.length > 0 &&
          items.every((item) =>
            TAX_EXEMPT_SKUS.includes((item.sku || "").toUpperCase())
          )
        if (allPracticeFee) return 0

        return subtotalAfterDiscount * 0.08
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        const shipping = get().getShippingCost()
        const tax = get().getTax()
        const discount = get().promoDiscount
        const shippingAmount = shipping ?? 0
        const total = Math.max(0, subtotal + shippingAmount + tax - discount)

        return {
          subtotal,
          shipping,
          tax,
          discount,
          total,
          promoCode: get().promoCode,
        }
      },
    }),
    {
      name: "nc-united-cart",
    }
  )
)
