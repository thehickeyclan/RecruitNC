"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDateTime, getStatusColor, type Order } from "@/lib/admin-data"
import { MoreVertical, Mail, Phone, Package, CreditCard, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react"
import { updateOrderStatus, addTrackingInfo, addOrderNote } from "@/app/actions/orders"
import { updateOrderAddress } from "@/app/actions/update-order-address"
import { useToast } from "@/hooks/use-toast"
import { AdminOrderReceiptPreview } from "@/components/admin/admin-order-receipt-preview"
import type { OrderReceiptPreview } from "@/lib/store/order-receipt-preview"

interface OrderDetailClientProps {
  order: {
    id: string
    orderNumber: string
    customerName: string
    customerEmail: string
    date: Date
    status: string
    items: number
    total: number
    subtotal: number
    shipping: number
    tax: number
    discount: number
    promoCode: string | null
    shippingMethod: string
    shippingAddress: {
      name: string
      line1: string
      line2: string | null
      city: string
      state: string
      zip: string
      country: string
      phone: string | null
    }
    trackingNumber: string | null
    carrier: string | null
    orderItems: Array<{
      id: string
      name: string
      variant: string
      sku: string
      quantity: number
      price: number
      image: string
    }>
    timeline: Array<{
      event: string
      date: Date | null
      completed: boolean
    }>
    phone: string | null
    categoryLabel?: string
    typeBanner?: {
      kind: string
      title: string
      description?: string
      logoSrc?: string
      accentClass?: string
      links?: { href: string; label: string }[]
    } | null
    contextRows?: Array<{ label: string; value: string }>
    showShipping?: boolean
    showTracking?: boolean
    integritySummary?: string | null
    integrityDetail?: string | null
    fulfillmentUnsafe?: boolean
    showRecoverItems?: boolean
    receiptPreview?: OrderReceiptPreview | null
  }
}

export function AdminOrderDetailClient({ order }: OrderDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "")
  const [carrier, setCarrier] = useState(order.carrier || "usps")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(order.status)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState({
    line1: order.shippingAddress.line1 || "",
    line2: order.shippingAddress.line2 || "",
    city: order.shippingAddress.city || "",
    state: order.shippingAddress.state || "",
    zip: order.shippingAddress.zip || "",
  })
  const [isRecoveringItems, setIsRecoveringItems] = useState(false)

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true)
    const result = await updateOrderStatus(order.id, newStatus)
    setIsUpdating(false)

    if (result.success) {
      setCurrentStatus(newStatus)
      toast({
        title: "Status updated",
        description: `Order status changed to ${newStatus}`,
      })
      router.refresh()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const handleAddTracking = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    const result = await addTrackingInfo(order.id, carrier, trackingNumber)
    setIsUpdating(false)

    if (result.success) {
      toast({
        title: "Tracking added",
        description: "Order marked as shipped with tracking information",
      })
      router.refresh()
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add tracking",
        variant: "destructive",
      })
    }
  }

  const handleAddNote = async () => {
    if (!note.trim()) return

    setIsUpdating(true)
    const result = await addOrderNote(order.id, note)
    setIsUpdating(false)

    if (result.success) {
      toast({
        title: "Note added",
        description: "Order note has been saved",
      })
      setNote("")
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to add note",
        variant: "destructive",
      })
    }
  }

  const handleRecoverItems = async () => {
    setIsRecoveringItems(true)
    try {
      const response = await fetch("/api/recover-order-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, force: true }),
      })

      if (!response.ok) {
        let errorData: Record<string, unknown> = {}
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `Server error: ${response.status}` }
        }
        const errorMessage =
          (errorData.error as string) || (errorData.message as string) || `Server error: ${response.status}`
        toast({
          title: "Recovery failed",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      const data = (await response.json()) as { success: boolean; message?: string; error?: string }

      if (data.success) {
        toast({
          title: "Items recovered!",
          description: data.message || "Order items have been recovered successfully",
        })
        router.refresh()
      } else {
        toast({
          title: "Recovery failed",
          description: data.error || data.message || "Failed to recover order items",
          variant: "destructive",
        })
      }
    } catch (error: unknown) {
      console.error("Recover items error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to recover items.",
        variant: "destructive",
      })
    } finally {
      setIsRecoveringItems(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => { window.location.href = "/admin/orders" }}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order {order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground mt-1" suppressHydrationWarning>
            {formatDateTime(order.date)}
          </p>
          {order.fulfillmentUnsafe ? (
            <p className="mt-2 text-sm font-semibold text-red-700 max-w-2xl">
              {order.integritySummary ?? "Incomplete line items — verify before fulfilling."}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {order.categoryLabel ? (
            <Badge variant="outline" className="capitalize">
              {order.categoryLabel}
            </Badge>
          ) : null}
          <Badge variant={getStatusColor(currentStatus as Order["status"])} className="capitalize">
            {currentStatus}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isUpdating}>
                Actions
                <MoreVertical className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusUpdate("processing")}>Mark as Processing</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate("shipped")}>Mark as Shipped</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate("delivered")}>Mark as Delivered</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate("cancelled")} className="text-destructive">
                Cancel Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fulfillment</CardTitle>
                {order.showRecoverItems ? (
                  <Button size="sm" variant="outline" onClick={handleRecoverItems} disabled={isRecoveringItems}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRecoveringItems ? "animate-spin" : ""}`} />
                    Rebuild from Stripe
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground font-normal mt-1">Product images, SKUs, and sizes for packing.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.typeBanner ? (
                <div
                  className={`rounded-md border px-3 py-3 text-sm ${order.typeBanner.accentClass ?? "border-muted bg-muted/30"}`}
                >
                  <div className="flex items-start gap-3">
                    {order.typeBanner.logoSrc ? (
                      <img
                        src={order.typeBanner.logoSrc}
                        alt=""
                        className="h-12 w-12 rounded object-contain bg-white/80 p-1 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#13294B]">{order.typeBanner.title}</p>
                      {order.typeBanner.description ? (
                        <p className="text-muted-foreground mt-0.5">{order.typeBanner.description}</p>
                      ) : null}
                      {order.typeBanner.links?.length ? (
                        <p className="text-muted-foreground mt-2 text-xs">
                          {order.typeBanner.links.map((link) => (
                            <a
                              key={link.href}
                              href={link.href}
                              className="text-[#03154C] underline font-medium mr-3"
                            >
                              {link.label}
                            </a>
                          ))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              {order.contextRows && order.contextRows.length > 0 ? (
                <div className="grid gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm sm:grid-cols-2">
                  {order.contextRows.map((row) => (
                    <div key={row.label}>
                      <span className="text-muted-foreground">{row.label}: </span>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {!order.orderItems || order.orderItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No items found</p>
                  <p className="text-sm mt-1">
                    This order has 0 items but a total of{" "}
                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                  </p>
                  <Button className="mt-4" onClick={handleRecoverItems} disabled={isRecoveringItems}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRecoveringItems ? "animate-spin" : ""}`} />
                    {isRecoveringItems ? "Recovering..." : "Recover Items from Stripe"}
                  </Button>
                </div>
              ) : (
                <>
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex gap-4 border-b border-muted/60 pb-4 last:border-0 last:pb-0">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="h-20 w-20 rounded-md object-cover bg-muted shrink-0 border"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base">{item.name}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {item.variant}
                          {item.sku && item.sku !== "N/A" ? ` • SKU: ${item.sku}` : ""}
                        </div>
                        <div className="text-sm mt-1">
                          Qty: {item.quantity} × {formatCurrency(item.price)} ={" "}
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Separator />
                </>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.showShipping !== false ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatCurrency(order.shipping)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount {order.promoCode ? `(${order.promoCode})` : ""}
                    </span>
                    <span className="text-green-600">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

            {order.receiptPreview ? (
              <AdminOrderReceiptPreview receipt={order.receiptPreview} />
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          event.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {event.completed && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      {index < order.timeline.length - 1 && (
                        <div className={`w-0.5 h-12 ${event.completed ? "bg-primary" : "bg-muted"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="font-medium">{event.event}</div>
                      {event.date && (
                        <div className="text-sm text-muted-foreground" suppressHydrationWarning>
                          {formatDateTime(event.date)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <Textarea
                  placeholder="Add a note about this order..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={isUpdating}
                />
                <Button size="sm" onClick={handleAddNote} disabled={isUpdating || !note.trim()}>
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-medium">{order.customerName}</div>
                <a
                  href={`mailto:${order.customerEmail}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Mail className="h-3 w-3" />
                  {order.customerEmail}
                </a>
                {order.phone && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" />
                    {order.phone}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {order.showShipping !== false ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditingAddress ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Street Address *</label>
                    <Input
                      value={addressForm.line1}
                      onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                      placeholder="123 Main St"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Apt/Unit (Optional)</label>
                    <Input
                      value={addressForm.line2}
                      onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                      placeholder="Apt 4B"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">City *</label>
                      <Input
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">State *</label>
                      <Input
                        value={addressForm.state}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, state: e.target.value.toUpperCase() })
                        }
                        maxLength={2}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">ZIP Code *</label>
                    <Input
                      value={addressForm.zip}
                      onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                      maxLength={10}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (
                          !addressForm.line1 ||
                          !addressForm.city ||
                          !addressForm.state ||
                          !addressForm.zip
                        ) {
                          toast({
                            title: "Validation Error",
                            description:
                              "Please fill in all required fields (Street Address, City, State, ZIP)",
                            variant: "destructive",
                          })
                          return
                        }
                        setIsUpdating(true)
                        const result = await updateOrderAddress(order.id, addressForm)
                        setIsUpdating(false)
                        if (result.success) {
                          setIsEditingAddress(false)
                          toast({
                            title: "Address Updated",
                            description: "Shipping address has been updated successfully.",
                          })
                          router.refresh()
                        } else {
                          toast({
                            title: "Update Failed",
                            description: result.error || "Failed to update address",
                            variant: "destructive",
                          })
                        }
                      }}
                      disabled={isUpdating}
                    >
                      Save Address
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingAddress(false)
                        setAddressForm({
                          line1: order.shippingAddress.line1 || "",
                          line2: order.shippingAddress.line2 || "",
                          city: order.shippingAddress.city || "",
                          state: order.shippingAddress.state || "",
                          zip: order.shippingAddress.zip || "",
                        })
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  <div className="flex items-start justify-between">
                    <div className="font-medium">{order.shippingAddress.name}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingAddress(true)}
                      className="h-7 text-xs"
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="text-muted-foreground mt-1 whitespace-pre-line">
                    {order.shippingAddress.line1 ? (
                      <>
                        {order.shippingAddress.line1}
                        {order.shippingAddress.line2 && (
                          <>
                            {"\n"}
                            {order.shippingAddress.line2}
                          </>
                        )}
                        {"\n"}
                        {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                        {order.shippingAddress.zip || ""}
                        {"\n"}
                        {order.shippingAddress.country === "US"
                          ? "United States"
                          : order.shippingAddress.country}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-red-600 font-semibold block">⚠️ MISSING STREET ADDRESS</span>
                        <p className="text-xs text-muted-foreground">
                          Contact customer to get full address, then click &quot;Edit&quot; above to add it.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <Separator />
              <div className="text-sm">
                <div className="text-muted-foreground">Shipping Method</div>
                <div className="font-medium">{order.shippingMethod}</div>
              </div>
              {order.trackingNumber && (
                <div className="text-sm">
                  <div className="text-muted-foreground">Tracking Number</div>
                  <div className="font-medium">{order.trackingNumber}</div>
                  {order.carrier && (
                    <div className="text-xs text-muted-foreground mt-1">
                      via {order.carrier.toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fulfillment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="text-muted-foreground">Type</div>
                <div className="font-medium">{order.shippingMethod}</div>
              </div>
            </CardContent>
          </Card>
          )}

          {order.showTracking !== false && !order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Tracking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Carrier</label>
                  <Select value={carrier} onValueChange={setCarrier} disabled={isUpdating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usps">USPS</SelectItem>
                      <SelectItem value="ups">UPS</SelectItem>
                      <SelectItem value="fedex">FedEx</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tracking Number</label>
                  <Input
                    placeholder="Enter tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    disabled={isUpdating}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddTracking}
                  disabled={isUpdating || !trackingNumber.trim()}
                >
                  Mark as Shipped
                </Button>
              </CardContent>
            </Card>
          )}

          {order.showTracking !== false && order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="font-medium">{order.trackingNumber}</div>
                {order.carrier ? (
                  <div className="text-xs text-muted-foreground mt-1">via {order.carrier.toUpperCase()}</div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Payment Status</div>
                <div className="font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid
                </div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Total Amount</div>
                <div className="font-medium">{formatCurrency(order.total)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
