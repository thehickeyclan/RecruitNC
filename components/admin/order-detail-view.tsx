"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDateTime, getStatusColor, type Order } from "@/lib/admin-data"
import { MoreVertical, Mail, Phone, Package, CreditCard, CheckCircle2 } from "lucide-react"
import { updateOrderStatus, addTrackingInfo, addOrderNote } from "@/app/actions/orders"
import { useToast } from "@/hooks/use-toast"

interface OrderDetailViewProps {
  order: Order
  onClose: () => void
}

const orderItems = [
  {
    id: "1",
    name: "NC United Classic T-Shirt",
    variant: "Navy / L",
    sku: "NCU-TEE-001",
    quantity: 2,
    price: 24.99,
    image: "/navy-blue-athletic-t-shirt.jpg",
  },
  {
    id: "2",
    name: "Snapback Hat",
    variant: "One Size",
    sku: "NCU-HAT-003",
    quantity: 1,
    price: 24.99,
    image: "/navy-blue-snapback-hat.jpg",
  },
]

const timeline = [
  { event: "Order placed", date: new Date("2025-10-28T14:34:00"), completed: true },
  { event: "Payment confirmed", date: new Date("2025-10-28T14:34:00"), completed: true },
  { event: "Processing started", date: new Date("2025-10-28T15:15:00"), completed: true },
  { event: "Shipped", date: null, completed: false },
  { event: "Delivered", date: null, completed: false },
]

export function OrderDetailView({ order, onClose }: OrderDetailViewProps) {
  const { toast } = useToast()
  const [trackingNumber, setTrackingNumber] = useState("")
  const [carrier, setCarrier] = useState("usps")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 5.99
  const tax = (subtotal + shipping) * 0.08
  const discount = 7.5
  const total = subtotal + shipping + tax - discount

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true)
    const result = await updateOrderStatus(order.id, newStatus)
    setIsUpdating(false)

    if (result.success) {
      toast({
        title: "Status updated",
        description: `Order status changed to ${newStatus}`,
      })
      onClose()
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
      setTrackingNumber("")
      onClose()
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order {order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground mt-1">{formatDateTime(order.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(order.status)} className="capitalize">
            {order.status}
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
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="h-16 w-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.variant} • SKU: {item.sku}
                    </div>
                    <div className="text-sm mt-1">
                      Qty: {item.quantity} × {formatCurrency(item.price)} ={" "}
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount (WRESTLING10)</span>
                  <span className="text-green-600">-{formatCurrency(discount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          event.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {event.completed && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className={`w-0.5 h-12 ${event.completed ? "bg-primary" : "bg-muted"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="font-medium">{event.event}</div>
                      {event.date && (
                        <div className="text-sm text-muted-foreground">{formatDateTime(event.date)}</div>
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
              <Separator />
              <div>
                <Button variant="link" className="h-auto p-0 text-sm">
                  View Customer Profile
                </Button>
                <div className="text-xs text-muted-foreground mt-1">5 total orders • $487 lifetime value</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipping Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{order.customerName}</div>
                <div className="text-muted-foreground mt-1">
                  {order.shippingAddress?.line1?.trim() ? (
                    <>
                      {order.shippingAddress.line1}
                      {order.shippingAddress.line2?.trim() && (
                        <>
                          <br />
                          {order.shippingAddress.line2}
                        </>
                      )}
                      <br />
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                      <br />
                      {order.shippingAddress.country === "US" ? "United States" : order.shippingAddress.country}
                    </>
                  ) : (
                    <>
                      {order.shippingAddress?.city?.trim() ? (
                        <>
                          <span className="text-orange-600">Street address missing from database</span>
                          <br />
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                          <br />
                          {order.shippingAddress.country === "US" ? "United States" : order.shippingAddress.country}
                        </>
                      ) : (
                        <span className="text-orange-600">Address data not available</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <Separator />
              <div className="text-sm">
                <div className="text-muted-foreground">Shipping Method</div>
                <div className="font-medium">{order.shippingMethod || "Standard Shipping"}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Expected Delivery</div>
                <div className="font-medium">Nov 4-6, 2025</div>
              </div>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Payment Method</div>
                <div className="font-medium">•••• •••• •••• 4242 (Visa)</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Transaction ID</div>
                <div className="font-mono text-xs">ch_3Nq8KL2eZv...</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Payment Status</div>
                <div className="font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid
                </div>
              </div>
              <Separator />
              <Button variant="outline" className="w-full text-destructive bg-transparent" disabled={isUpdating}>
                Process Refund
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
