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
import { Download, Search, MoreVertical, Eye, Printer, RefreshCw, Trash2, RotateCcw, User, CloudDownload, DollarSign, ArrowLeft, Mail, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react"
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
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { HardLink } from "@/components/hard-link"

interface AdminOrdersClientProps {
  initialOrders: Order[]
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  processing: { label: "Processing", icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  shipped: { label: "Shipped", icon: Truck, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  refunded: { label: "Refunded", icon: RotateCcw, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
}

export function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || "all"
  
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFixingAllOrders, setIsFixingAllOrders] = useState(false)
  const [isBackfillingCustomers, setIsBackfillingCustomers] = useState(false)
  const [isSyncingStripe, setIsSyncingStripe] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  // Status counts for tabs
  const statusCounts = {
    all: initialOrders.length,
    pending: initialOrders.filter(o => o.status === "pending").length,
    processing: initialOrders.filter(o => o.status === "processing").length,
    shipped: initialOrders.filter(o => o.status === "shipped").length,
    delivered: initialOrders.filter(o => o.status === "delivered").length,
  }

  const filteredOrders = initialOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerEmail !== "—" && order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.productSummary && order.productSummary.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesCategory = categoryFilter === "all" || order.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
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
        toast.success(`Synced ${data.created} new order(s) from Stripe`)
        router.refresh()
      } else {
        toast.success(`No new orders. ${data.skipped} already in sync.`)
      }
    } catch (e) {
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
    <div className="min-h-screen bg-[#0A1628] p-4 md:p-8">
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
                {selectedOrders.length > 0 && ` • ${selectedOrders.length} selected`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="bg-[#0f1c2e] border border-white/10 p-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70">
              All <Badge variant="secondary" className="ml-2 bg-white/10 text-white/70">{statusCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-white/70">
              <Clock className="h-4 w-4 mr-1.5" />
              Pending <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400">{statusCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="processing" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-white/70">
              <Package className="h-4 w-4 mr-1.5" />
              Processing <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-400">{statusCounts.processing}</Badge>
            </TabsTrigger>
            <TabsTrigger value="shipped" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white/70">
              <Truck className="h-4 w-4 mr-1.5" />
              Shipped <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-400">{statusCounts.shipped}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-white/70">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Delivered <Badge variant="secondary" className="ml-2 bg-emerald-500/20 text-emerald-400">{statusCounts.delivered}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1c2e] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-white/10">All categories</SelectItem>
                  <SelectItem value="Apparel" className="text-white hover:bg-white/10">Apparel</SelectItem>
                  <SelectItem value="Drop-In" className="text-white hover:bg-white/10">Drop-In</SelectItem>
                  <SelectItem value="Blue Sub" className="text-white hover:bg-white/10">Blue Sub</SelectItem>
                  <SelectItem value="Tournament Fee" className="text-white hover:bg-white/10">Tournament Fee</SelectItem>
                  <SelectItem value="Other" className="text-white hover:bg-white/10">Other</SelectItem>
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
                  <TableHead className="text-white/70">Category</TableHead>
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
                        <Badge variant="outline" className="font-normal text-xs text-white/70 border-white/20">
                          {order.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-white/60 max-w-[200px] truncate" title={order.productSummary}>
                        {order.productSummary}
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
