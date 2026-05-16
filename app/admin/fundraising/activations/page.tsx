"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  User,
  ExternalLink,
  AlertCircle,
  UserPlus,
} from "lucide-react"

interface ActivationRequest {
  id: string
  fundraising_slug: string
  user_id: string
  requester_email: string | null
  athlete_id: string | null
  athlete_name: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
}

export default function AdminActivationsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [requests, setRequests] = useState<ActivationRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedRequest, setSelectedRequest] = useState<ActivationRequest | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/fundraising/activation-requests", {
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setRequests(data.requests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && isAdmin) {
      loadRequests()
    }
  }, [user, isAdmin, loadRequests])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    setIsProcessing(true)
    try {
      const res = await fetch(`/api/admin/fundraising/activation-requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${action}`)
      }

      toast({
        title: action === "approve" ? "Request approved" : "Request rejected",
        description:
          action === "approve"
            ? "The athlete page is now active and the family has been notified."
            : "The request has been rejected.",
      })

      setSelectedRequest(null)
      loadRequests()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Action failed",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length
  const approvedCount = requests.filter((r) => r.status === "approved").length
  const rejectedCount = requests.filter((r) => r.status === "rejected").length

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
                <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">Activation Requests</h1>
              </div>
            </div>
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

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-8 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-yellow-400">{pendingCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Approved</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-8 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-green-400">{approvedCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0F1E32] border-[#1e3a5f]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rejected</p>
                  {isLoading ? (
                    <Skeleton className="h-6 w-8 mt-1 bg-[#1e3a5f]" />
                  ) : (
                    <p className="text-xl font-bold text-red-400">{rejectedCount}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-[#1e3a5f]" />
            ))
          ) : requests.length === 0 ? (
            <Card className="bg-[#0F1E32] border-[#1e3a5f]">
              <CardContent className="p-8 text-center">
                <UserPlus className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No activation requests yet</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <button
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className="w-full text-left"
              >
                <Card className="bg-[#0F1E32] border-[#1e3a5f] hover:border-[#D3B574]/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                        request.status === "pending" ? "bg-yellow-500/20" :
                        request.status === "approved" ? "bg-green-500/20" :
                        "bg-red-500/20"
                      }`}>
                        {request.status === "pending" ? (
                          <Clock className="h-5 w-5 text-yellow-400" />
                        ) : request.status === "approved" ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-white truncate">
                            {request.athlete_name || request.fundraising_slug}
                          </p>
                          <Badge className={`text-xs ${
                            request.status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                            request.status === "approved" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          {request.requester_email || "No email provided"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Requested {formatDate(request.created_at)}
                        </p>
                      </div>

                      <a
                        href={`/fundraising/athletes/${request.fundraising_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-400 hover:text-[#D3B574] transition-colors"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-[#0F1E32] border-[#1e3a5f] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Review Activation Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review and approve or reject this athlete page activation request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0A1628] rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Athlete Page</p>
                    <p className="font-medium text-white">{selectedRequest.fundraising_slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Requester Email</p>
                    <p className="text-white">{selectedRequest.requester_email || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Requested</p>
                    <p className="text-white">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                </div>
              </div>

              <a
                href={`/fundraising/athletes/${selectedRequest.fundraising_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#D3B574] hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Athlete Page
              </a>

              {selectedRequest.status === "pending" && (
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleAction(selectedRequest.id, "reject")}
                    disabled={isProcessing}
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleAction(selectedRequest.id, "approve")}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isProcessing ? "Processing..." : "Approve"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
