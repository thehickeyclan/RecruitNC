"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Download,
  ExternalLink,
  RefreshCw,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Search,
  Filter,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react"

type RequestStatus = "pending" | "under_review" | "approved" | "rejected" | "paid"

interface ReimbursementRequest {
  id: string
  user_id: string
  user_email: string | null
  user_display_name: string
  athlete_id: string
  athlete_name: string
  expense_type: string
  amount_cents: number
  amount_approved_cents: number | null
  payment_method: string
  zelle_info: string | null
  venmo_info: string | null
  parent_notes: string | null
  document_url: string | null
  status: RequestStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  paid_at: string | null
}

interface Summary {
  pending: number
  underReview: number
  approved: number
  paid: number
  rejected: number
  totalPaidCents: number
  totalPendingCents: number
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  under_review: { label: "Under Review", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  paid: { label: "Paid", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: DollarSign },
}

export default function AdminReimbursementsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<ReimbursementRequest[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all")

  const [selectedRequest, setSelectedRequest] = useState<ReimbursementRequest | null>(null)
  const [editStatus, setEditStatus] = useState<RequestStatus | "">("")
  const [editApprovedAmount, setEditApprovedAmount] = useState("")
  const [editAdminNotes, setEditAdminNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/expense-requests", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      
      setRequests(data.requests || [])
      
      // Calculate summary
      const reqs = data.requests || []
      const sum: Summary = {
        pending: reqs.filter((r: ReimbursementRequest) => r.status === "pending").length,
        underReview: reqs.filter((r: ReimbursementRequest) => r.status === "under_review").length,
        approved: reqs.filter((r: ReimbursementRequest) => r.status === "approved").length,
        paid: reqs.filter((r: ReimbursementRequest) => r.status === "paid").length,
        rejected: reqs.filter((r: ReimbursementRequest) => r.status === "rejected").length,
        totalPaidCents: reqs
          .filter((r: ReimbursementRequest) => r.status === "paid")
          .reduce((sum: number, r: ReimbursementRequest) => sum + (r.amount_approved_cents || r.amount_cents), 0),
        totalPendingCents: reqs
          .filter((r: ReimbursementRequest) => r.status === "pending" || r.status === "under_review" || r.status === "approved")
          .reduce((sum: number, r: ReimbursementRequest) => sum + r.amount_cents, 0),
      }
      setSummary(sum)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && isAdmin) {
      loadRequests()
    }
  }, [user, isAdmin, loadRequests])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      searchQuery === "" ||
      r.athlete_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user_display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.expense_type.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || r.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const openRequest = (req: ReimbursementRequest) => {
    setSelectedRequest(req)
    setEditStatus(req.status)
    setEditAdminNotes(req.admin_notes || "")
    setEditApprovedAmount(
      req.amount_approved_cents ? (req.amount_approved_cents / 100).toFixed(2) : ""
    )
  }

  const saveRequest = async () => {
    if (!selectedRequest || !editStatus) return
    setIsSaving(true)

    try {
      const approvedCents = editApprovedAmount.trim()
        ? Math.round(parseFloat(editApprovedAmount.replace(/[$,]/g, "")) * 100)
        : null

      const res = await fetch(`/api/admin/expense-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: editStatus,
          admin_notes: editAdminNotes,
          amount_approved_cents: approvedCents,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Update failed")
      }

      toast({ title: "Request updated" })
      setSelectedRequest(null)
      loadRequests()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const exportAudit = async () => {
    setIsExporting(true)
    try {
      const res = await fetch("/api/admin/expense-requests/audit-export", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reimbursements-audit-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast({ title: "Audit export downloaded" })
    } catch {
      toast({ title: "Export failed", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#D3B574]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#13294B] to-[#0A1628] border-b border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/fundraising")}
                className="text-gray-400 hover:text-white hover:bg-[#1e3a5f]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Admin</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Reimbursements</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadRequests}
                disabled={isLoading}
                className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={exportAudit}
                disabled={isExporting}
                className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Export for Audit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-3 text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Pending</p>
              {isLoading ? (
                <Skeleton className="h-7 w-12 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-yellow-400">{summary?.pending || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Under Review</p>
              {isLoading ? (
                <Skeleton className="h-7 w-12 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-blue-400">{summary?.underReview || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Approved</p>
              {isLoading ? (
                <Skeleton className="h-7 w-12 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-green-400">{summary?.approved || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Paid</p>
              {isLoading ? (
                <Skeleton className="h-7 w-12 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-emerald-400">{summary?.paid || 0}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Total Paid</p>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-[#D3B574]">{formatCurrency(summary?.totalPaidCents || 0)}</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <p className="text-xs text-gray-400">Pending Amount</p>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-1 bg-[#1e3a5f]" />
              ) : (
                <p className="text-xl font-bold text-white">{formatCurrency(summary?.totalPendingCents || 0)}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search athlete, parent, or expense type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0F1E32] border-[#1e3a5f] text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | "all")}>
            <SelectTrigger className="w-full sm:w-48 bg-[#0F1E32] border-[#1e3a5f] text-white">
              <Filter className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F1E32] border-[#1e3a5f]">
              <SelectItem value="all" className="text-white">All Statuses</SelectItem>
              <SelectItem value="pending" className="text-white">Pending</SelectItem>
              <SelectItem value="under_review" className="text-white">Under Review</SelectItem>
              <SelectItem value="approved" className="text-white">Approved</SelectItem>
              <SelectItem value="paid" className="text-white">Paid</SelectItem>
              <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Request List */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-[#1e3a5f]" />
            ))
          ) : filteredRequests.length === 0 ? (
            <Card className="bg-[#0F1E32] border-[#1e3a5f]">
              <CardContent className="p-8 text-center">
                <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No reimbursement requests found</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((req) => {
              const config = STATUS_CONFIG[req.status]
              const StatusIcon = config.icon
              return (
                <button
                  key={req.id}
                  onClick={() => openRequest(req)}
                  className="w-full text-left"
                >
                  <Card className="bg-[#0F1E32] border-[#1e3a5f] hover:border-[#D3B574]/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-white truncate">{req.athlete_name}</p>
                            <Badge className={`${config.color} border text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {req.expense_type} &middot; {req.user_display_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted {formatDate(req.created_at)}
                            {!req.document_url && (
                              <span className="text-orange-400 ml-2">No receipt</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-white">
                              {formatCurrency(req.amount_cents)}
                            </p>
                            {req.amount_approved_cents && req.amount_approved_cents !== req.amount_cents && (
                              <p className="text-xs text-green-400">
                                Approved: {formatCurrency(req.amount_approved_cents)}
                              </p>
                            )}
                          </div>
                          {req.document_url && (
                            <div className="h-12 w-12 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-[#0F1E32] border-[#1e3a5f] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Review Request</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Info */}
              <div className="p-4 bg-[#0A1628] rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Athlete</span>
                  <span className="text-white font-medium">{selectedRequest.athlete_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Submitted by</span>
                  <span className="text-white">{selectedRequest.user_display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="text-white">{selectedRequest.expense_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Requested</span>
                  <span className="text-white font-bold">{formatCurrency(selectedRequest.amount_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method</span>
                  <span className="text-white capitalize">{selectedRequest.payment_method}</span>
                </div>
                {selectedRequest.zelle_info && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Zelle</span>
                    <span className="text-white">{selectedRequest.zelle_info}</span>
                  </div>
                )}
                {selectedRequest.venmo_info && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Venmo</span>
                    <span className="text-white">{selectedRequest.venmo_info}</span>
                  </div>
                )}
              </div>

              {/* Parent Notes */}
              {selectedRequest.parent_notes && (
                <div>
                  <Label className="text-gray-400 text-sm">Parent Notes</Label>
                  <p className="text-white text-sm mt-1 p-3 bg-[#0A1628] rounded-lg">
                    {selectedRequest.parent_notes}
                  </p>
                </div>
              )}

              {/* Receipt */}
              {selectedRequest.document_url ? (
                <div>
                  <Label className="text-gray-400 text-sm">Receipt</Label>
                  <a
                    href={selectedRequest.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-2 text-[#D3B574] hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Receipt
                  </a>
                </div>
              ) : (
                <div className="p-3 bg-orange-900/20 border border-orange-800/50 rounded-lg text-orange-300 text-sm">
                  No receipt uploaded
                </div>
              )}

              {/* Edit Fields */}
              <div className="space-y-4 pt-4 border-t border-[#1e3a5f]">
                <div>
                  <Label className="text-gray-400 text-sm">Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as RequestStatus)}>
                    <SelectTrigger className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F1E32] border-[#1e3a5f]">
                      <SelectItem value="pending" className="text-white">Pending</SelectItem>
                      <SelectItem value="under_review" className="text-white">Under Review</SelectItem>
                      <SelectItem value="approved" className="text-white">Approved</SelectItem>
                      <SelectItem value="paid" className="text-white">Paid</SelectItem>
                      <SelectItem value="rejected" className="text-white">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-400 text-sm">Approved Amount (optional)</Label>
                  <Input
                    type="text"
                    placeholder="Leave blank to use requested amount"
                    value={editApprovedAmount}
                    onChange={(e) => setEditApprovedAmount(e.target.value)}
                    className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label className="text-gray-400 text-sm">Admin Notes</Label>
                  <Textarea
                    placeholder="Internal notes..."
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    className="mt-1 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500 min-h-[80px]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveRequest}
                  disabled={isSaving}
                  className="flex-1 bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
