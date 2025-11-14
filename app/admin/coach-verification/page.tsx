"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, XCircle, Clock, User, Mail, Building, AlertCircle, Loader2 } from "lucide-react"

interface CoachVerificationRequest {
  id: number
  user_id: string
  full_name: string
  email: string
  institution: string
  coaching_position: string
  years_experience: number | null
  coaching_credentials: string
  references_contact: string
  additional_info: string
  status: "pending" | "approved" | "rejected"
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  admin_notes: string | null
}

export default function CoachVerificationPage() {
  const [requests, setRequests] = useState<CoachVerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState<{ [key: number]: string }>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/coach-verification")

      if (!response.ok) {
        throw new Error("Failed to fetch verification requests")
      }

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (err) {
      setError("Failed to load coach verification requests")
      console.error("Error fetching requests:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (requestId: number, action: "approve" | "reject") => {
    try {
      setProcessingId(requestId)
      const response = await fetch("/api/admin/coach-verification/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          adminNotes: reviewNotes[requestId] || "",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} verification`)
      }

      toast({
        title: "Success",
        description: `Coach verification ${action === "approve" ? "approved" : "rejected"} successfully`,
      })

      // Refresh requests
      await fetchRequests()

      // Clear notes for this request
      setReviewNotes((prev) => {
        const newNotes = { ...prev }
        delete newNotes[requestId]
        return newNotes
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending")
  const reviewedRequests = requests.filter((r) => r.status !== "pending")

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AdminHeader />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading coach verification requests...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Coach Verification</h1>
        <p className="text-gray-600">Review and approve coach verification requests</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === "approved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter((r) => r.status === "rejected").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Verification Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription>These coach verification requests are waiting for your review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-6 bg-yellow-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">{request.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted {new Date(request.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{request.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{request.institution}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Position:</span>{" "}
                      {request.coaching_position.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {request.years_experience && (
                      <div className="text-sm">
                        <span className="font-medium">Experience:</span> {request.years_experience} years
                      </div>
                    )}
                  </div>
                </div>

                {request.coaching_credentials && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Coaching Credentials:</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">{request.coaching_credentials}</p>
                  </div>
                )}

                {request.references_contact && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Professional References:</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">{request.references_contact}</p>
                  </div>
                )}

                {request.additional_info && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Additional Information:</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">{request.additional_info}</p>
                  </div>
                )}

                {/* Admin Review Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">Admin Review:</h4>
                  <Textarea
                    placeholder="Add notes about this verification request (optional)..."
                    value={reviewNotes[request.id] || ""}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [request.id]: e.target.value,
                      }))
                    }
                    className="mb-4"
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleVerification(request.id, "approve")}
                      disabled={processingId === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve & Verify Coach
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleVerification(request.id, "reject")}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reviewed Requests ({reviewedRequests.length})</CardTitle>
            <CardDescription>Previously reviewed coach verification requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviewedRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{request.full_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {request.email} • {request.institution}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reviewed {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  {request.admin_notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Admin Notes:</span> {request.admin_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Verification Requests</h3>
            <p className="text-muted-foreground">
              Coach verification requests will appear here when coaches apply for verification
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
