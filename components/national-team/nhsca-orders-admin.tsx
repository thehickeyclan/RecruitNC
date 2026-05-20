"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw } from "lucide-react"

interface Payment {
  id: string
  user_id: string
  athlete_name: string | null
  team: string
  items: any[]
  amount_cents: number
  status: "pending" | "paid" | "failed" | "refunded"
  stripe_session_id: string | null
  paid_at: string | null
  created_at: string
}

export function NhscaOrdersAdmin() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== "all") params.set("status", filterStatus)
      const res = await fetch(`/api/nhsca-duals/payments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data || [])
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [filterStatus])

  const statusColors: Record<string, string> = {
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    refunded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  }

  const totalRevenue = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount_cents, 0)

  const itemsList = (items: any[]) => {
    if (!Array.isArray(items)) return "-"
    return items.map((item) => `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ""}`).join(", ")
  }

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a1628] rounded-lg p-4 border border-[#1a3a5c]">
          <div className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total Orders</div>
          <div className="text-3xl font-bold text-white mt-2">{payments.length}</div>
        </div>
        <div className="bg-[#0a1628] rounded-lg p-4 border border-[#1a3a5c]">
          <div className="text-white/60 text-xs font-semibold uppercase tracking-wider">Paid Orders</div>
          <div className="text-3xl font-bold text-green-400 mt-2">{payments.filter((p) => p.status === "paid").length}</div>
        </div>
        <div className="bg-[#0a1628] rounded-lg p-4 border border-[#1a3a5c]">
          <div className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total Revenue</div>
          <div className="text-3xl font-bold text-[#CBAF5D] mt-2">{formatPrice(totalRevenue)}</div>
        </div>
      </div>

      {/* Filter & Refresh */}
      <div className="flex items-center justify-between gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-[#0a1628] border-[#1a3a5c] text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={fetchPayments}
          disabled={loading}
          className="bg-[#c9a227] text-[#002147] hover:bg-[#d4bc6a] font-semibold"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Orders Table */}
      <div className="bg-[#0a1628] rounded-lg border border-[#1a3a5c] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#0d1f38] border-b border-[#1a3a5c]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-white/80 font-semibold">Athlete Name</TableHead>
              <TableHead className="text-white/80 font-semibold">Team</TableHead>
              <TableHead className="text-white/80 font-semibold">Items</TableHead>
              <TableHead className="text-white/80 font-semibold text-right">Amount</TableHead>
              <TableHead className="text-white/80 font-semibold">Status</TableHead>
              <TableHead className="text-white/80 font-semibold">Order Date</TableHead>
              <TableHead className="text-white/80 font-semibold">Paid Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-white/40">
                  Loading...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-white/40">
                  No orders yet
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id} className="border-b border-[#1a3a5c] hover:bg-[#0d1f38]/50">
                  <TableCell className="text-white font-medium">{payment.athlete_name || "N/A"}</TableCell>
                  <TableCell className="text-white/80">
                    <Badge className="capitalize bg-[#002147] text-[#c9a227] border border-[#c9a227]/30">
                      {payment.team}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/75 text-sm max-w-xs">{itemsList(payment.items)}</TableCell>
                  <TableCell className="text-right font-semibold text-white">{formatPrice(payment.amount_cents)}</TableCell>
                  <TableCell>
                    <Badge className={`capitalize border ${statusColors[payment.status]}`}>{payment.status}</Badge>
                  </TableCell>
                  <TableCell className="text-white/60 text-sm">{formatDate(payment.created_at)}</TableCell>
                  <TableCell className="text-white/60 text-sm">
                    {payment.paid_at ? formatDate(payment.paid_at) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
