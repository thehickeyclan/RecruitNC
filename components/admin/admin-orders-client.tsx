"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Search, MoreVertical, Eye, Printer, RefreshCw, Trash2, RotateCcw, User, CloudDownload, DollarSign, ArrowLeft, Mail, Package, Truck, CheckCircle, Clock, XCircle, CreditCard, AlertTriangle } from "lucide-react"
import { formatCurrency, formatDateTime, getStatusColor, type Order } from "@/lib/admin-data"
import { ORDER_TYPES, ORDER_TYPE_LABELS, ORDER_TYPE_NEEDS_FULFILLMENT } from "@/lib/orders/order-type"
import { deleteOrder, updateOrderStatus } from "@/app/actions/orders"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { HardLink } from "@/components/hard-link"

interface AdminOrdersClientProps {
  initialOrders: Order[]
}

/**
 * Every status a row can actually hold. "paid" was missing here, which is why the
 * dominant status in the table rendered as an unstyled fallback badge and matched no tab.
 */
const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { label: "Paid", icon: CreditCard, color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
  processing: { label: "Processing", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { label: "Shipped", icon: Truck, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  refunded: { label: "Refunded", icon: RotateCcw, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
}

/** Tab order follows the real lifecycle: money in, then fulfillment, then exceptions. */
const STATUS_TABS = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"] as const

/**
 * Where each non-merchandise order type is actually worked. These rows land in `orders`
 * because that's where the payment is recorded, but the roster/roll is the real tool —
 * send admins there instead of letting them treat a registration like a package.
 */
const TYPE_HOME: Partial<Record<string, { href: string; label: string }>> = {
  toc_registration: { href: "/admin/toc/invitations", label: "TOC invitations & registration roster" },
  toc_ticket: { href: "/admin/toc/invitations", label: "TOC invitations & registration roster" },
  blue_subscription: { href: "/admin/blue", label: "Blue membership dashboard" },
  drop_in: { href: "/admin/blue", label: "Blue dashboard" },
  national_team_fee: { href: "/admin/blue/national-team-orders-report", label: "National team orders report" },
  donation: { href: "/admin/fundraising", label: "Fundraising dashboard" },
}

export function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || "all"
  // This screen is the fulfillment queue, so it opens on the only orders that need
  // fulfilling. Registrations, memberships, drop-ins, and donations are complete the
  // moment they're paid — they have their own views and are one filter change away here.
  const initialType = searchParams.get("type") || "merchandise"

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [typeFilter, setTypeFilter] = useState<string>(initialType)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFixingAllOrders, setIsFixingAllOrders] = useState(false)
  const [isBackfillingCustomers, setIsBackfillingCustomers] = useState(false)
  const [isSyncingStripe, setIsSyncingStripe] = useState(false)
  const [isReclassifying, setIsReclassifying] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  // Type filter is applied before the tab counts so the counts describe what you can see.
  const ordersInScope = initialOrders.filter(
    (order) => typeFilter === "all" || order.orderType === typeFilter,
  )

  const statusCounts: Record<string, number> = { all: ordersInScope.length }
  for (const status of STATUS_TABS) {
    statusCounts[status] = ordersInScope.filter((o) => o.status === status).length
  }

  const typeCounts = initialOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.orderType] = (acc[order.orderType] ?? 0) + 1
    return acc
  }, {})

  const filteredOrders = ordersInScope.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerEmail !== "—" && order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.productSummary && order.productSummary.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const unshippableCount = filteredOrders.filter((o) => o.missingShippingAddress).length

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const toggleAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map((order) => order.id))
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.length === 0) return
    setIsBulkUpdating(true)
    try {
      let successCount = 0
      for (const orderId of selectedOrders) {
        const result = await updateOrderStatus(orderId, newStatus)
        if (result.success) successCount++
      }
      toast.success(`Updated ${successCount} order(s) to ${newStatus}`)
      setSelectedOrders([])
      router.refresh()
    } catch (error) {
      toast.error("Failed to update some orders")
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteOrder(orderToDelete.id)
      if (result.success) {
        toast.success(`Order ${orderToDelete.orderNumber} deleted`)
        setOrderToDelete(null)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete order")
      }
    } catch (error) {
      toast.error("Failed to delete order")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const result = await updateOrderStatus(orderId, newStatus)
      if (result.success) {
        toast.success(`Status updated to ${newStatus}`)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update status")
      }
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  const handleReclassifyFromStripe = async () => {
    if (
      !confirm(
        "Re-read Stripe for recent orders and fix misclassified payments (Guild $30, Spartan, national team, drop-ins)? This runs in bulk — no per-order SQL.",
      )
    ) {
      return
    }
    setIsReclassifying(true)
    try {
      const res = await fetch("/api/admin/orders/reclassify-from-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 500 }),
      })
      const data = await res.json()
      if (!res.ok) {
        const hint = typeof data.hint === "string" ? data.hint : null
        toast.error(data.error || "Reclassify failed", hint ? { description: hint } : undefined)
        return
      }
      const parts = [`Fixed ${data.changed} of ${data.processed} orders`]
      if (data.orphanRegsLinked > 0) parts.push(`${data.orphanRegsLinked} orphan national-team reg(s) linked`)
      toast.success(parts.join(" · "))
      router.refresh()
    } catch {
      toast.error("Reclassify from Stripe failed")
    } finally {
      setIsReclassifying(false)
    }
  }

  const handleSyncFromStripe = async () => {
    setIsSyncingStripe(true)
    try {
      const res = await fetch("/api/admin/orders/sync-stripe", { method: "POST" })
      let data: {
        success?: boolean
        error?: string
        created?: number
        skipped?: number
        createdFromInvoices?: number
        partial?: boolean
        errors?: string[]
        hint?: string
      } = {}
      try {
        data = await res.json()
      } catch {
        toast.error(`Sync failed (HTTP ${res.status}). Check Vercel function logs.`)
        return
      }
      if (!res.ok || data.success === false) {
        const hint = typeof data.hint === "string" ? data.hint : null
        toast.error(data.error || `Sync failed (HTTP ${res.status})`, hint ? { description: hint } : undefined)
        return
      }
      const created = data.created ?? 0
      const skipped = data.skipped ?? 0
      const fromInvoices = data.createdFromInvoices ?? 0
      if (created > 0) {
        const detail =
          fromInvoices > 0 ? ` (${fromInvoices} from subscription invoices)` : ""
        toast.success(`Synced ${created} new order(s) from Stripe${detail}`)
        router.refresh()
      } else {
        toast.success(`No new orders. ${skipped} already in sync.`)
      }
      if (data.partial) {
        toast.message("Checkout sync partially completed — run again if needed. Blue renewals use last 14 days only.")
      }
      if (data.errors?.length) {
        toast.message(`Sync warnings: ${data.errors.slice(0, 2).join("; ")}`)
      }
    } catch {
      toast.error("Sync from Stripe failed")
    } finally {
      setIsSyncingStripe(false)
    }
  }

  const handleBackfillCustomers = async () => {
    if (!confirm("Fetch customer info from Stripe for orders showing Guest?")) return
    setIsBackfillingCustomers(true)
    try {
      const res = await fetch("/api/admin/orders/backfill-customers", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast.success(`Updated ${data.updated} order(s) with customer info`)
        router.refresh()
      } else {
        toast.error(data.error || "Failed to backfill customers")
      }
    } catch (err) {
      toast.error("Failed to backfill customers")
    } finally {
      setIsBackfillingCustomers(false)
    }
  }

  const handleFixAllOrders = async () => {
    if (!confirm("Recover order items from Stripe for orders missing them?")) return
    setIsFixingAllOrders(true)
    try {
      const response = await fetch("/api/fix-all-orders-items", { method: "POST" })
      const data = await response.json()
      if (data.success) {
        toast.success(`Recovered items for ${data.recovered} order(s)`)
        router.refresh()
      } else {
        toast.error(data.error || "Failed to fix orders")
      }
    } catch (error) {
      toast.error("Failed to fix orders")
    } finally {
      setIsFixingAllOrders(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    if (!config) return <Badge variant="outline">{status}</Badge>
    return (
      <Badge className={`${config.color} border font-medium`}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen admin-dark-page bg-[#0A1628] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <HardLink href="/admin/store"><ArrowLeft className="h-4 w-4" /></HardLink>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Order Fulfillment</h1>
              <p className="text-white/60 mt-1">
                {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
                {" · "}
                {typeFilter === "all"
                  ? "all order types"
                  : ORDER_TYPE_LABELS[typeFilter as keyof typeof ORDER_TYPE_LABELS] ?? typeFilter}
                {selectedOrders.length > 0 && ` • ${selectedOrders.length} selected`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleReclassifyFromStripe}
              disabled={isReclassifying}
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              {isReclassifying ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Fix from Stripe
            </Button>
            <Button
              onClick={handleSyncFromStripe}
              disabled={isSyncingStripe}
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              {isSyncingStripe ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-2 h-4 w-4" />}
              Sync Stripe
            </Button>
            <Button variant="outline" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <HardLink href="/admin/orders/validate-stripe">
                <CheckCircle className="mr-2 h-4 w-4" />
                Validate Stripe
              </HardLink>
            </Button>
            <Button variant="outline" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <HardLink href="/admin/orders/payouts">
                <DollarSign className="mr-2 h-4 w-4" />
                Payouts
              </HardLink>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <MoreVertical className="mr-2 h-4 w-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0f1c2e] border-white/10">
                <DropdownMenuItem onClick={handleFixAllOrders} disabled={isFixingAllOrders} className="text-white hover:bg-white/10">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Fix Missing Items
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBackfillCustomers} disabled={isBackfillingCustomers} className="text-white hover:bg-white/10">
                  <User className="mr-2 h-4 w-4" />
                  Recover Customer Info
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-white hover:bg-white/10">
                  <Link href="/admin/recover-order">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Recover Order
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-white hover:bg-white/10">
                  <Download className="mr-2 h-4 w-4" />
                  Export Orders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Tabs — every status a row can hold, so nothing hides in a gap */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="bg-[#0f1c2e] border border-white/10 p-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70">
              All <Badge variant="secondary" className="ml-2 bg-white/10 text-white/70">{statusCounts.all}</Badge>
            </TabsTrigger>
            {STATUS_TABS.map((status) => {
              const config = STATUS_CONFIG[status]
              const Icon = config.icon
              return (
                <TabsTrigger
                  key={status}
                  value={status}
                  className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70"
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  {config.label}
                  <Badge variant="secondary" className={`ml-2 ${config.color}`}>{statusCounts[status]}</Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        {TYPE_HOME[typeFilter] && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-white/70">
                <span className="font-medium text-white">
                  {ORDER_TYPE_LABELS[typeFilter as keyof typeof ORDER_TYPE_LABELS]}
                </span>{" "}
                orders are complete once paid — nothing here ships. This list is the payment record.
              </div>
              <Button variant="outline" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                <HardLink href={TYPE_HOME[typeFilter]!.href}>{TYPE_HOME[typeFilter]!.label}</HardLink>
              </Button>
            </CardContent>
          </Card>
        )}

        {unshippableCount > 0 && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200/90">
                <span className="font-medium text-amber-300">
                  {unshippableCount} {unshippableCount === 1 ? "order needs" : "orders need"} shipping but has no address on file.
                </span>{" "}
                These were recovered from Stripe without one. Open the order and use Edit Shipping Address before marking it shipped.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions Bar */}
        {selectedOrders.length > 0 && (
          <Card className="bg-[#D3B574]/10 border-[#D3B574]/30">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-[#D3B574] font-medium">{selectedOrders.length} order(s) selected</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate("processing")} disabled={isBulkUpdating}
                  className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30">
                  <Package className="h-4 w-4 mr-1.5" />
                  Mark Processing
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate("shipped")} disabled={isBulkUpdating}
                  className="bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30">
                  <Truck className="h-4 w-4 mr-1.5" />
                  Mark Shipped
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate("delivered")} disabled={isBulkUpdating}
                  className="bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Mark Delivered
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrders([])} className="text-white/60 hover:text-white">
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="bg-[#0f1c2e] border-white/10">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search orders, customers, products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[240px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Order type" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1c2e] border-white/10 text-white">
                  <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">
                    All order types ({initialOrders.length})
                  </SelectItem>
                  {ORDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-white focus:bg-white/10 focus:text-white">
                      {ORDER_TYPE_LABELS[type]} ({typeCounts[type] ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="bg-[#0f1c2e] border-white/10">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-12 text-white/70">
                    <Checkbox
                      checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                      onCheckedChange={toggleAllOrders}
                    />
                  </TableHead>
                  <TableHead className="text-white/70">Order</TableHead>
                  <TableHead className="text-white/70">Customer</TableHead>
                  <TableHead className="text-white/70">Date</TableHead>
                  <TableHead className="text-white/70">Type</TableHead>
                  <TableHead className="text-white/70">Product</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-right text-white/70">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={9} className="text-center py-12 text-white/50">
                      {initialOrders.length === 0
                        ? "No orders yet. They will appear here once customers start purchasing."
                        : "No orders found matching your criteria"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/orders/${order.id}`} className="font-medium text-[#D3B574] hover:underline">
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link
                            href={`/admin/crm?search=${encodeURIComponent(order.customerEmail !== "—" ? order.customerEmail : order.customerName)}`}
                            className="font-medium text-white hover:text-[#D3B574] hover:underline flex items-center gap-1"
                          >
                            {order.customerName}
                            <User className="h-3 w-3 opacity-50" />
                          </Link>
                          <div className="text-xs text-white/50">{order.customerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/60 whitespace-nowrap text-sm">{formatDateTime(order.date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-normal text-xs border-white/20 ${
                            ORDER_TYPE_NEEDS_FULFILLMENT[order.orderType] ? "text-white/70" : "text-white/40"
                          }`}
                        >
                          {ORDER_TYPE_LABELS[order.orderType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white/60 max-w-[200px] truncate" title={order.productSummary}>
                        <div className="flex items-center gap-1.5">
                          {order.missingShippingAddress && (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-label="No shipping address on file" />
                          )}
                          <span className="truncate">{order.productSummary}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="cursor-pointer">
                              {getStatusBadge(order.status)}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-[#0f1c2e] border-white/10">
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <DropdownMenuItem key={key} onClick={() => handleStatusUpdate(order.id, key)} className="text-white hover:bg-white/10">
                                <config.icon className="mr-2 h-4 w-4" />
                                {config.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right font-medium text-white">{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0f1c2e] border-white/10">
                            <DropdownMenuItem onClick={() => { window.location.href = `/admin/orders/${order.id}` }} className="text-white hover:bg-white/10">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-white/10">
                              <Mail className="mr-2 h-4 w-4" />
                              Email Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-white/10">
                              <Printer className="mr-2 h-4 w-4" />
                              Print Packing Slip
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem className="text-red-400 hover:bg-red-500/10" onClick={() => setOrderToDelete(order)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
          <AlertDialogContent className="bg-[#0f1c2e] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Order?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                This will permanently delete order {orderToDelete?.orderNumber}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOrder} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
