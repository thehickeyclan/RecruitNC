"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Download, Search, MoreVertical, Eye, Printer, RefreshCw, Trash2, RotateCcw, User, CloudDownload, DollarSign } from "lucide-react"
import { formatCurrency, formatDateTime, getStatusColor, type Order } from "@/lib/admin-data"
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
import { useRouter } from "next/navigation"
import Link from "next/link"
import { HardLink } from "@/components/hard-link"

interface AdminOrdersClientProps {
  initialOrders: Order[]
}

export function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [orderToUpdateStatus, setOrderToUpdateStatus] = useState<Order | null>(null)
  const [isFixingAllOrders, setIsFixingAllOrders] = useState(false)
  const [isBackfillingCustomers, setIsBackfillingCustomers] = useState(false)
  const [isSyncingStripe, setIsSyncingStripe] = useState(false)

  const filteredOrders = initialOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerEmail !== "—" && order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.productSummary && order.productSummary.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === "all" || order.status === statusFilter

    const matchesOrderType = orderTypeFilter === "all" || order.orderType === orderTypeFilter

    const matchesCategory = categoryFilter === "all" || order.category === categoryFilter

    return matchesSearch && matchesStatus && matchesOrderType && matchesCategory
  })

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

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteOrder(orderToDelete.id)
      if (result.success) {
        toast.success(`Order ${orderToDelete.orderNumber} deleted successfully. All metrics and analytics have been updated.`)
        setOrderToDelete(null)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete order")
      }
    } catch (error) {
      toast.error("Failed to delete order")
      console.error("Delete order error:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string, order?: Order) => {
    const targetOrder = order || orderToUpdateStatus
    if (!targetOrder) return

    try {
      const result = await updateOrderStatus(targetOrder.id, newStatus)
      if (result.success) {
        toast.success(`Order ${targetOrder.orderNumber} status updated to ${newStatus}`)
        setOrderToUpdateStatus(null)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update order status")
      }
    } catch (error) {
      toast.error("Failed to update order status")
      console.error("Update status error:", error)
    }
  }

  const handleFixAllOrders = async () => {
    if (!confirm("This will recover order items for all orders missing them from Stripe. Continue?")) {
      return
    }

    setIsFixingAllOrders(true)
    try {
      const response = await fetch("/api/fix-all-orders-items", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast.success(
          `Successfully recovered items for ${data.recovered} order(s). ${data.failed > 0 ? `${data.failed} failed.` : ""}`
        )
        router.refresh()
      } else {
        toast.error(data.error || "Failed to fix orders")
      }
    } catch (error) {
      toast.error("Failed to fix orders")
      console.error("Fix all orders error:", error)
    } finally {
      setIsFixingAllOrders(false)
    }
  }

  const handleSyncFromStripe = async () => {
    setIsSyncingStripe(true)
    try {
      const res = await fetch("/api/admin/orders/sync-stripe", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Sync failed")
        return
      }
      if (data.created > 0) {
        toast.success(`Synced ${data.created} new order(s) from Stripe. Refreshing list.`)
        router.refresh()
      } else if (data.errors?.length > 0) {
        toast.warning(`Sync complete. ${data.skipped} already in DB. Some errors: ${data.errors.slice(0, 3).join("; ")}`)
        router.refresh()
      } else {
        toast.success(`No new orders. ${data.skipped} already in sync.`)
        router.refresh()
      }
    } catch (e) {
      toast.error("Sync from Stripe failed")
      console.error("[RecruitNC] sync-stripe:", e)
    } finally {
      setIsSyncingStripe(false)
    }
  }

  const handleBackfillCustomers = async () => {
    if (!confirm("Fetch customer email/name from Stripe for orders that show Guest/No email? This updates the database.")) return
    setIsBackfillingCustomers(true)
    try {
      const res = await fetch("/api/admin/orders/backfill-customers", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        toast.success(`Updated ${data.updated} order(s) with customer info.${data.failed > 0 ? ` ${data.failed} failed.` : ""}`)
        router.refresh()
      } else {
        toast.error(data.error || "Failed to backfill customers")
      }
    } catch (err) {
      toast.error("Failed to backfill customers")
      console.error(err)
    } finally {
      setIsBackfillingCustomers(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">
            {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"} found
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="whitespace-nowrap" asChild>
            <Link href="/admin/recover-order">
              <RotateCcw className="mr-2 h-4 w-4" />
              Recover order
            </Link>
          </Button>
          <Button
            onClick={handleFixAllOrders}
            disabled={isFixingAllOrders}
            variant="default"
            className="whitespace-nowrap"
          >
            {isFixingAllOrders ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fix Missing Items
              </>
            )}
          </Button>
          <Button
            onClick={handleSyncFromStripe}
            disabled={isSyncingStripe}
            variant="outline"
            className="whitespace-nowrap"
          >
            {isSyncingStripe ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <CloudDownload className="mr-2 h-4 w-4" />
                Sync from Stripe
              </>
            )}
          </Button>
          <Button variant="outline" className="whitespace-nowrap" asChild>
            <HardLink href="/admin/orders/payouts" className="inline-flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Payouts
            </HardLink>
          </Button>
          <Button
            onClick={handleBackfillCustomers}
            disabled={isBackfillingCustomers}
            variant="outline"
            className="whitespace-nowrap"
          >
            {isBackfillingCustomers ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Recovering...
              </>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Recover customer info
              </>
            )}
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Orders
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, customers, emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="Apparel">Apparel</SelectItem>
                <SelectItem value="Drop-In">Drop-In</SelectItem>
                <SelectItem value="Blue Sub">Blue Sub</SelectItem>
                <SelectItem value="Tournament Fee">Tournament Fee</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="practice-dropin">Practice Drop-in</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                    onCheckedChange={toggleAllOrders}
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {initialOrders.length === 0
                      ? "No orders yet. They will appear here once customers start purchasing."
                      : "No orders found matching your criteria"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleOrderSelection(order.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                        {order.orderType === "practice-dropin" && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Practice Drop-in
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDateTime(order.date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">
                        {order.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={order.productSummary}>
                      {order.productSummary}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="cursor-pointer">
                            <Badge variant={getStatusColor(order.status)} className="capitalize">
                              {order.status}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handleStatusUpdate("pending", order)}>
                            Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate("processing", order)}>
                            Processing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate("shipped", order)}>
                            Shipped
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate("delivered", order)}>
                            Delivered
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate("cancelled", order)}>
                            Cancelled
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate("refunded", order)}>
                            Refunded
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-center">{order.items}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { window.location.href = `/admin/orders/${order.id}` }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setOrderToUpdateStatus(order)
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Printer className="mr-2 h-4 w-4" />
                            Print Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setOrderToDelete(order)}
                          >
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

      {/* Order Detail Dialog - Navigate to full page instead */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="text-center py-8">
              <p className="mb-4">Loading full order details...</p>
              <Button
                onClick={() => {
                  window.location.href = `/admin/orders/${selectedOrder.id}`
                  setSelectedOrder(null)
                }}
              >
                View Full Order Details
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Update Dialog */}
      <Dialog open={!!orderToUpdateStatus} onOpenChange={(open) => !open && setOrderToUpdateStatus(null)}>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Update Order Status</h3>
              <p className="text-sm text-muted-foreground mt-1">Order {orderToUpdateStatus?.orderNumber}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select
                onValueChange={(value) => {
                  if (orderToUpdateStatus) {
                    handleStatusUpdate(value)
                  }
                }}
                defaultValue={orderToUpdateStatus?.status}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order <strong>{orderToDelete?.orderNumber}</strong> and all associated
              order items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
