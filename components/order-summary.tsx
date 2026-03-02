"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCartStore } from "@/lib/store/cart-store"

export function OrderSummary() {
  const {
    items,
    promoCode,
    promoDiscount,
    shippingMethod,
    getSubtotal,
    getShippingCost,
    getTax,
    getTotal,
  } = useCartStore()

  const totalBreakdown = getTotal()
  const subtotal =
    typeof totalBreakdown === "object" && "subtotal" in totalBreakdown
      ? totalBreakdown.subtotal
      : getSubtotal()
  const rawShipping =
    typeof totalBreakdown === "object" && "shipping" in totalBreakdown
      ? totalBreakdown.shipping
      : getShippingCost()
  const shipping = shippingMethod ? rawShipping : null
  const tax =
    typeof totalBreakdown === "object" && "tax" in totalBreakdown
      ? totalBreakdown.tax
      : getTax()
  const discount =
    typeof totalBreakdown === "object" && "discount" in totalBreakdown
      ? totalBreakdown.discount
      : promoDiscount || 0

  const totalAmount = subtotal + (shipping ?? 0) + tax - discount
  const shouldShowDiscount = !!promoCode && discount > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal ({items.length} items)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>
              {shipping === null ? (
                <span className="text-muted-foreground text-xs">
                  Calculated at checkout
                </span>
              ) : shipping === 0 ? (
                <span className="text-green-600 font-semibold">FREE</span>
              ) : (
                `$${shipping.toFixed(2)}`
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Estimated Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {shouldShowDiscount && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Discount ({promoCode})</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className={shouldShowDiscount ? "text-green-600" : ""}>
              {shipping === null ? (
                <span className="text-muted-foreground text-xs">
                  Calculated at checkout
                </span>
              ) : (
                `$${Math.max(0, totalAmount).toFixed(2)}`
              )}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          {items.slice(0, 3).map((item) => (
            <div
              key={`${item.id}-${item.variant.color}-${item.variant.size}`}
              className="flex gap-2 text-sm"
            >
              <img
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-muted-foreground text-xs">
                  {item.variant.size} × {item.quantity}
                </p>
              </div>
              <p className="font-semibold">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{items.length - 3} more items
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
