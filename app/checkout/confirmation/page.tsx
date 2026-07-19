"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Printer, Package, Truck, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StoreNavLink } from "@/components/store-nav-link"
import { useCartStore } from "@/lib/store/cart-store"
import { createOrderFromPaymentIntent, createOrderFromSession, getOrder } from "@/app/actions/stripe"
import { trackPurchase } from "@/lib/meta-pixel"

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const orderId = searchParams.get("order_id")
  const paymentIntentId = searchParams.get("payment_intent") || searchParams.get("payment_intent_client_secret")?.split("_secret")[0]
  const { items, shippingAddress, shippingMethod, clearCart, getTotal } = useCartStore()

  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<{
    orderNumber?: string
    totals?: Record<string, number>
    items?: unknown[]
    shippingAddress?: Record<string, unknown>
    shippingMethod?: { name?: string; days?: string; estimatedDays?: number }
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [orderLoadError, setOrderLoadError] = useState<string | null>(null)
  const purchaseFiredForOrder = useRef<string | null>(null)
  const processOrderStarted = useRef(false)

  useEffect(() => {
    if (!orderData?.orderNumber || !orderData?.totals) return
    if (purchaseFiredForOrder.current === orderData.orderNumber) return

    const value = Number(orderData.totals.total ?? 0)
    const displayItems = (orderData.items || items) as { id?: number; product_id?: string; quantity?: number }[]
    const contentIds = displayItems
      .map((i) => String(i.product_id ?? i.id ?? ""))
      .filter(Boolean)
    const numItems = displayItems.reduce((sum, i) => sum + (i.quantity ?? 1), 0)
    const contents = displayItems
      .map((i) => ({ id: String(i.product_id ?? i.id ?? ""), quantity: i.quantity ?? 1 }))
      .filter((c) => c.id)

    trackPurchase(value, "USD", orderData.orderNumber, contentIds.length ? contentIds : undefined, numItems, contents.length ? contents : undefined)
    purchaseFiredForOrder.current = orderData.orderNumber
  }, [orderData?.orderNumber, orderData?.totals, orderData?.items, items])

  useEffect(() => {
    const processOrder = async () => {
      if (processOrderStarted.current) return
      processOrderStarted.current = true

      if (orderId) {
        try {
          const result = await getOrder(orderId)
          if (result.success && result.orderNumber) {
            setOrderNumber(result.orderNumber)
            setOrderData(result)
            clearCart()
            setIsProcessing(false)
            return
          }
          setOrderLoadError("Your order has been placed! Order details are being processed.")
        } catch {
          setOrderLoadError("Your order has been placed! Please check your email for confirmation.")
        }
        setIsProcessing(false)
        return
      }

      if (paymentIntentId?.startsWith("pi_")) {
        const pendingFromStorage =
          typeof window !== "undefined" ? sessionStorage.getItem("store_pending_order_id") : null
        if (pendingFromStorage) {
          try {
            sessionStorage.removeItem("store_pending_order_id")
          } catch {
            // ignore
          }
          try {
            const result = await getOrder(pendingFromStorage)
            if (result.success && result.orderNumber) {
              setOrderNumber(result.orderNumber)
              setOrderData(result)
              clearCart()
              setIsProcessing(false)
              return
            }
          } catch {
            // fall through to PI finalize
          }
        }
        try {
          const result = await createOrderFromPaymentIntent(paymentIntentId)
          if (result.success && result.orderNumber) {
            setOrderNumber(result.orderNumber)
            setOrderData(result)
            clearCart()
            setIsProcessing(false)
            return
          }
        } catch {
          // continue to fallback
        }
      }

      if (sessionId) {
        try {
          const result = await createOrderFromSession(sessionId)
          if (result.success && result.orderNumber) {
            setOrderNumber(result.orderNumber)
            setOrderData(result)
            clearCart()
            setIsProcessing(false)
            return
          }
        } catch {
          // continue to fallback
        }
      }

      setOrderLoadError("Your payment was successful! Order details are being processed and will be sent to your email. If you have questions, contact support.")
      setIsProcessing(false)
    }

    processOrder()
  }, [sessionId, orderId, paymentIntentId, clearCart])

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#003366] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Processing your order...</p>
          <p className="text-xs text-muted-foreground mt-2">This may take a few moments</p>
        </div>
      </div>
    )
  }

  const totalBreakdown = getTotal()
  const totals = orderData?.totals ?? {
    subtotal: totalBreakdown.subtotal ?? 0,
    shipping: totalBreakdown.shipping ?? 0,
    tax: totalBreakdown.tax ?? 0,
    discount: totalBreakdown.discount ?? 0,
    total: totalBreakdown.total ?? 0,
  }
  const displayItems = orderData?.items ?? items
  const displayShippingAddress = orderData?.shippingAddress ?? shippingAddress
  const displayShippingMethod = orderData?.shippingMethod ?? shippingMethod

  const orderDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const methodName = displayShippingMethod?.name ?? shippingMethod?.name ?? ""
  const isPickupAtPractice = methodName === "Pickup at Practice" || methodName === "Pickup at blue practice" || methodName.includes("blue practice")
  const isPickupAtStates = methodName.includes("Suite 109") || methodName.includes("States")
  const isPickupMethod = isPickupAtPractice || isPickupAtStates

  const getDeliveryDate = () => {
    const method = displayShippingMethod ?? shippingMethod
    const name = (method as { name?: string })?.name ?? ""
    if (name.includes("blue practice") || name === "Pickup at Practice") return "Available at next practice"
    if (name.includes("Suite 109") || name.includes("States")) return "During States (Suite 109)"
    const rawDays = (method as { days?: string; estimatedDays?: number })?.estimatedDays ?? (method as { days?: string })?.days
    const days = typeof rawDays === "string" ? parseInt(rawDays, 10) : rawDays
    const numDays = Number.isFinite(days) ? (days as number) : 5
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + numDays)
    return deliveryDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  const addressRecord = displayShippingAddress ?? shippingAddress
  const address1 = addressRecord && "address1" in addressRecord ? addressRecord.address1 : (addressRecord as Record<string, string>)?.address
  const address2 = addressRecord && "address2" in addressRecord ? addressRecord.address2 : (addressRecord as Record<string, string>)?.apartment

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Thank you for your order!</h1>
          {orderLoadError ? (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">{orderLoadError}</p>
            </div>
          ) : (
            <>
              {orderNumber && <p className="text-muted-foreground mb-2">Order #{orderNumber}</p>}
              <p className="text-muted-foreground">
                Order confirmation sent to: {(addressRecord as { email?: string })?.email ?? shippingAddress?.email ?? "your email"}
              </p>
            </>
          )}
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {orderNumber && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                    <p className="break-all text-2xl font-bold">{orderNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print Receipt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Order Date</p>
                <p className="font-semibold">{orderDate}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">{isPickupMethod ? "Pickup" : "Estimated Delivery"}</p>
                <p className="font-semibold">{getDeliveryDate()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="font-semibold text-lg">${Number(totals.total).toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {displayItems && Array.isArray(displayItems) && displayItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items Ordered</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayItems.map((item: Record<string, unknown>, idx: number) => (
                  <div
                    key={`${item.id ?? idx}-${(item.variant as { color?: string })?.color ?? item.color}-${(item.variant as { size?: string })?.size ?? item.size}`}
                    className="flex min-w-0 flex-col gap-4 border-b pb-4 last:border-0 last:pb-0 sm:flex-row"
                  >
                    <img
                      src={(item.image as string) ?? (item.product_image_url as string) ?? "/placeholder.svg"}
                      alt={(item.name as string) ?? (item.product_name as string) ?? ""}
                      className="h-20 w-20 shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold">{(item.name as string) ?? (item.product_name as string)}</p>
                      <p className="text-sm text-muted-foreground">
                        {(item.variant as { color?: string })?.color ?? (item.color as string)} / {(item.variant as { size?: string })?.size ?? (item.size as string)}
                      </p>
                      <p className="text-sm text-muted-foreground">Quantity: {Number(item.quantity) || 1}</p>
                    </div>
                    <p className="shrink-0 font-semibold sm:text-right">${(((item.price as number) ?? 0) * (Number(item.quantity) || 1)).toFixed(2)}</p>
                  </div>
                ))}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${Number(totals.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0">Shipping ({displayShippingMethod?.name ?? shippingMethod?.name ?? "Standard Shipping"})</span>
                    <span className={Number(totals.shipping) === 0 ? "text-green-600 font-semibold" : ""}>
                      {Number(totals.shipping) === 0 ? "FREE" : `$${Number(totals.shipping).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${Number(totals.tax).toFixed(2)}</span>
                  </div>
                  {Number(totals.discount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${Number(totals.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className={Number(totals.discount) > 0 ? "text-green-600" : ""}>${Number(totals.total).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {addressRecord && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {methodName.includes("Pickup at") ? "Pickup Information" : "Shipping Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">
                      {(addressRecord as { firstName?: string }).firstName} {(addressRecord as { lastName?: string }).lastName}
                    </p>
                    {methodName.includes("Suite 109") ? (
                      <>
                        <p className="text-muted-foreground pt-2">
                          Your order will be available for pickup at Suite 109, Greensboro Coliseum during the NCHSAA State tournament.
                        </p>
                        <p className="text-muted-foreground">You will receive an email when your order is ready.</p>
                      </>
                    ) : isPickupAtPractice ? (
                      <>
                        <p className="text-muted-foreground pt-2">Your order will be available for pickup at the next team practice.</p>
                        <p className="text-muted-foreground">You will receive an email when your order is ready.</p>
                      </>
                    ) : (
                      <>
                        <p>{address1 ?? (addressRecord as Record<string, string>).address1}</p>
                        {address2 && <p>{address2}</p>}
                        <p>
                          {(addressRecord as { city?: string }).city}, {(addressRecord as { state?: string }).state} {(addressRecord as { zipCode?: string }).zipCode}
                        </p>
                        <p>{(addressRecord as { phone?: string }).phone}</p>
                        <p className="pt-2 text-muted-foreground">
                          Shipping Method: {displayShippingMethod?.name ?? shippingMethod?.name ?? "Standard Shipping"}
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>Payment Method</span>
                    <span className="font-semibold">Card Payment</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Amount Charged</span>
                    <span className="font-semibold">${Number(totals.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Status</span>
                    <span className="font-semibold text-green-600">Paid</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>What&apos;s Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Order Confirmed</p>
                    <p className="text-sm text-muted-foreground">Today</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">Processing</p>
                    <p className="text-sm text-muted-foreground">1-2 days</p>
                  </div>
                </div>
                {!isPickupMethod && (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">Shipped</p>
                        <p className="text-sm text-muted-foreground">2-3 days</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">Delivered</p>
                        <p className="text-sm text-muted-foreground">{getDeliveryDate()}</p>
                      </div>
                    </div>
                  </>
                )}
                {isPickupMethod && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Ready for Pickup</p>
                      <p className="text-sm text-muted-foreground">
                        {isPickupAtStates ? "At Suite 109, Greensboro Coliseum" : "At next practice"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Need help? Questions about your order?</p>
              <p className="text-sm">
                Contact us at{" "}
                <a href="mailto:support@ncunited.org" className="text-[#003366] hover:underline">
                  support@ncunited.org
                </a>
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-[#003366] hover:bg-[#003366]/90 text-white">
              <StoreNavLink className="cursor-pointer">Continue Shopping</StoreNavLink>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
