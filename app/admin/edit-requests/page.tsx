"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Calendar,
  FileText,
  Trophy,
  Camera,
  Edit,
  MessageSquare,
  ArrowLeft,
  ThumbsUp,
  Mail,
  Building2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

interface EditRequest {
  id: string
  user_id: string
  athlete_id: string
  athlete_name: string
  athlete_high_school: string
  athlete_college: string
  user_email: string
  user_name: string
  request_type: string
  status: string
  request_data: any
  created_at: string
  updated_at: string
}

interface EditRequestStats {
  pending: number
  approved: number
  rejected: number
}

interface ProfileConfirmation {
  id: string
  athlete_id: string
  athlete_name: string
  athlete_high_school: string
  athlete_college: string
  user_id: string
  user_email: string
  user_name: string
  confirmation_method: string
  is_confirmed: boolean
  confirmed_at: string
  created_at: string
}

interface ConfirmationStats {
  total: number
  last7: number
}

type ViewMode = "edits" | "confirmations"

export default function EditRequestsPage() {
  // Existing edits state
  const [requests, setRequests] = useState<EditRequest[]>([])
  const [stats, setStats] = useState<EditRequestStats | null>(null)
  const [activeStatusTab, setActiveStatusTab] = useState("pending")

  // New confirmations state
  const [confirmations, setConfirmations] = useState<ProfileConfirmation[]>([])
  const [confStats, setConfStats] = useState<ConfirmationStats | null>(null)

  // Shared UI state
  const [view, setView] = useState<ViewMode>("edits")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({})
  const [unauthorized, setUnauthorized] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  const searchParams = useSearchParams()
  const athleteFilter = searchParams.get("athlete")

  // Keep a client instance if you need it for future enhancements
  const supabase = createClient()

  // Fetchers
  const fetchEditRequests = async (signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (athleteFilter) params.append("athlete", athleteFilter)
    if (activeStatusTab !== "all") params.append("status", activeStatusTab)

    const resp = await fetch(`/api/admin/edit-requests?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      signal,
    })

    if (resp.status === 401) {
      setUnauthorized(true)
      throw new Error("401")
    }
    if (resp.status === 403) {
      setForbidden(true)
      throw new Error("403")
    }
    if (!resp.ok) {
      throw new Error(`HTTP error ${resp.status}`)
    }
    const data = await resp.json()
    setRequests(data.requests || [])
    setStats(data.stats || null)
  }

  const fetchConfirmations = async (signal?: AbortSignal) => {
    const params = new URLSearchParams()
    if (athleteFilter) params.append("athlete", athleteFilter)

    const resp = await fetch(`/api/admin/profile-confirmations?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      signal,
    })

    if (resp.status === 401) {
      setUnauthorized(true)
      throw new Error("401")
    }
    if (resp.status === 403) {
      setForbidden(true)
      throw new Error("403")
    }
    if (!resp.ok) {
      throw new Error(`HTTP error ${resp.status}`)
    }
    const data = await resp.json()
    setConfirmations(data.confirmations || [])
    setConfStats(data.stats || null)
  }

  // Orchestrate data fetching based on current view
  useEffect(() => {
    const ctrl = new AbortController()
    async function run() {
      try {
        setLoading(true)
        setError(null)
        setUnauthorized(false)
        setForbidden(false)

        if (view === "edits") {
          await fetchEditRequests(ctrl.signal)
        } else {
          await fetchConfirmations(ctrl.signal)
        }
      } catch (e: any) {
        if (e?.message !== "401" && e?.message !== "403") {
          setError("Failed to load data")
        }
      } finally {
        setLoading(false)
      }
    }
    run()
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeStatusTab, athleteFilter])

  const handleUpdateRequest = async (requestId: string, status: string) => {
    try {
      setProcessingId(requestId)
      const response = await fetch("/api/admin/edit-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          requestId,
          status,
          adminNotes: adminNotes[requestId] || "",
        }),
      })
      if (!response.ok) throw new Error("Failed to update request")
      await fetchEditRequests()
      setAdminNotes((prev) => {
        const updated = { ...prev }
        delete updated[requestId]
        return updated
      })
    } catch (err) {
      console.error("Error updating request:", err)
      setError("Failed to update request")
    } finally {
      setProcessingId(null)
    }
  }

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case "achievements":
        return <Trophy className="h-4 w-4" />
      case "photo":
        return <Camera className="h-4 w-4" />
      case "personal_info":
        return <User className="h-4 w-4" />
      default:
        return <Edit className="h-4 w-4" />
    }
  }

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "achievements":
        return "Achievements/Awards"
      case "photo":
        return "Profile Photo"
      case "personal_info":
        return "Personal Information"
      case "high_school":
        return "High School"
      case "wrestling_club":
        return "Wrestling Club"
      case "college":
        return "College Commitment"
      case "weight_class":
        return "Weight Class"
      case "graduation_year":
        return "Graduation Year"
      case "match_record":
        return "Match Record/Stats"
      case "ranked_athlete_update":
        return "Ranked Athlete Profile Update"
      default:
        return "Other"
    }
  }

  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString()
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  const getFilteredRequests = () => {
    switch (activeStatusTab) {
      case "pending":
        return requests.filter((r) => r.status === "pending")
      case "approved":
        return requests.filter((r) => r.status === "approved")
      case "rejected":
        return requests.filter((r) => r.status === "rejected")
      default:
        return requests
    }
  }

  if (unauthorized) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You must be signed in to view this admin page.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href={`/auth/signin?returnTo=${encodeURIComponent("/admin/edit-requests")}`}>
              <Button className="bg-blue-600 hover:bg-blue-700">Sign in</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="bg-transparent">
                Go home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Admin access required</CardTitle>
            <CardDescription className="text-red-700">
              Your account is signed in, but does not have admin permissions to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/">
              <Button variant="outline" className="bg-transparent">
                Go home
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="ghost" className="bg-transparent">
                Switch account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/athlete-claims-manager">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Claims
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Profile Review Center</h1>
            <p className="text-muted-foreground mt-2">
              Review and approve edit requests, and track “Looks Good” confirmations
              {athleteFilter && " (filtered by athlete)"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={() => (view === "edits" ? fetchEditRequests() : fetchConfirmations())}
              className="mt-2 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Outer Tabs: Edits vs Confirmations */}
      <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edits">Edit Requests</TabsTrigger>
          <TabsTrigger value="confirmations">Confirmations</TabsTrigger>
        </TabsList>

        {/* Edits View */}
        <TabsContent value="edits" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading edit requests...</span>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                          <p className="text-2xl font-bold">{requests.length}</p>
                        </div>
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Pending</p>
                          <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                        </div>
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Approved</p>
                          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                        </div>
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                        </div>
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Inner status tabs for edits */}
              <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">Pending ({stats?.pending || 0})</TabsTrigger>
                  <TabsTrigger value="approved">Approved ({stats?.approved || 0})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({stats?.rejected || 0})</TabsTrigger>
                  <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
                </TabsList>

                {["pending", "approved", "rejected", "all"].map((tabValue) => (
                  <TabsContent key={tabValue} value={tabValue} className="mt-6">
                    <div className="grid gap-6">
                      {getFilteredRequests().length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">No edit requests found for this filter.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        getFilteredRequests().map((request) => (
                          <Card
                            key={request.id}
                            className={`${
                              request.status === "approved"
                                ? "border-green-200 bg-green-50"
                                : request.status === "rejected"
                                  ? "border-red-200 bg-red-50"
                                  : "border-orange-200 bg-orange-50"
                            }`}
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="flex items-center gap-2">
                                    {getRequestTypeIcon(request.request_data?.editType || "other")}
                                    {getRequestTypeLabel(request.request_data?.editType || "other")} Request
                                    <Badge
                                      variant={
                                        request.status === "approved"
                                          ? "default"
                                          : request.status === "rejected"
                                            ? "destructive"
                                            : "secondary"
                                      }
                                      className={
                                        request.status === "approved"
                                          ? "bg-green-100 text-green-800"
                                          : request.status === "rejected"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-orange-100 text-orange-800"
                                      }
                                    >
                                      {request.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                                      {request.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                                      {request.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription className="mt-2">
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="flex items-center gap-1">
                                        <User className="h-4 w-4" />
                                        {request.user_name} ({request.user_email})
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {formatDateTime(request.created_at)}
                                      </span>
                                    </div>
                                  </CardDescription>
                                </div>

                                <Link href={`/athletes/${request.athlete_id}`}>
                                  <Button variant="outline" size="sm" className="bg-transparent">
                                    View Profile
                                  </Button>
                                </Link>
                              </div>
                            </CardHeader>

                            <CardContent>
                              {/* Athlete Info */}
                              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-blue-900 mb-1">Athlete Profile</h4>
                                <p className="text-blue-800">
                                  <strong>{request.athlete_name}</strong>
                                  {request.athlete_high_school && ` • ${request.athlete_high_school}`}
                                  {request.athlete_college && ` → ${request.athlete_college}`}
                                </p>
                              </div>

                              {/* Request Details */}
                              <div className="mb-4">
                                <h4 className="font-semibold mb-2">Requested Changes</h4>
                                {request.request_data?.editType === "ranked_athlete_update" ? (
                                  <div className="space-y-3">
                                    {request.request_data?.bio_updates && (
                                      <div className="bg-gray-50 p-3 rounded border">
                                        <p className="font-medium text-sm mb-1">Bio Updates:</p>
                                        <p className="text-sm whitespace-pre-wrap">
                                          {request.request_data.bio_updates}
                                        </p>
                                      </div>
                                    )}
                                    {request.request_data?.academics_updates && (
                                      <div className="bg-gray-50 p-3 rounded border">
                                        <p className="font-medium text-sm mb-1">Academic Updates:</p>
                                        <p className="text-sm whitespace-pre-wrap">
                                          {request.request_data.academics_updates}
                                        </p>
                                      </div>
                                    )}
                                    {request.request_data?.achievements_updates && (
                                      <div className="bg-gray-50 p-3 rounded border">
                                        <p className="font-medium text-sm mb-1">Achievement Updates:</p>
                                        <p className="text-sm whitespace-pre-wrap">
                                          {request.request_data.achievements_updates}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 p-3 rounded border">
                                    <p className="text-sm whitespace-pre-wrap">
                                      {request.request_data?.description || "No description provided"}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Current Data Reference */}
                              {request.request_data?.currentData && (
                                <div className="mb-4">
                                  <h4 className="font-semibold mb-2">Current Profile Data (for reference)</h4>
                                  <div className="bg-gray-50 p-3 rounded border text-xs">
                                    <pre className="whitespace-pre-wrap">
                                      {JSON.stringify(request.request_data.currentData, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Photo Preview */}
                              {request.request_data?.photoFile && (
                                <div className="mb-4">
                                  <h4 className="font-semibold mb-2">Submitted Photo</h4>
                                  <div className="border rounded p-2 bg-gray-50">
                                    <Image
                                      src={
                                        request.request_data.photoFile ||
                                        "/placeholder.svg?height=200&width=200&query=submitted%20photo"
                                      }
                                      alt="Submitted photo"
                                      width={200}
                                      height={200}
                                      className="rounded object-cover"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Admin Actions (only for pending requests) */}
                              {request.status === "pending" && (
                                <div className="border-t pt-4">
                                  <div className="mb-4">
                                    <Label htmlFor={`notes-${request.id}`}>Admin Notes (optional)</Label>
                                    <Textarea
                                      id={`notes-${request.id}`}
                                      placeholder="Add any notes about this decision..."
                                      value={adminNotes[request.id] || ""}
                                      onChange={(e) =>
                                        setAdminNotes((prev) => ({
                                          ...prev,
                                          [request.id]: e.target.value,
                                        }))
                                      }
                                      className="mt-1"
                                    />
                                  </div>

                                  <div className="flex gap-3">
                                    <Button
                                      onClick={() => handleUpdateRequest(request.id, "approved")}
                                      disabled={processingId === request.id}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      {processingId === request.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                      )}
                                      Approve Request
                                    </Button>

                                    <Button
                                      onClick={() => handleUpdateRequest(request.id, "rejected")}
                                      disabled={processingId === request.id}
                                      variant="destructive"
                                    >
                                      {processingId === request.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <XCircle className="h-4 w-4 mr-2" />
                                      )}
                                      Reject Request
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Show admin notes for processed requests (if any were stored in request_data) */}
                              {request.status !== "pending" && request.request_data?.adminNotes && (
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Admin Notes
                                  </h4>
                                  <div className="bg-gray-50 p-3 rounded border text-sm">
                                    {request.request_data.adminNotes}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </TabsContent>

        {/* Confirmations View */}
        <TabsContent value="confirmations" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading confirmations...</span>
            </div>
          ) : (
            <>
              {confStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Confirmations</p>
                          <p className="text-2xl font-bold">{confStats.total}</p>
                        </div>
                        <ThumbsUp className="h-6 w-6 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Last 7 Days</p>
                          <p className="text-2xl font-bold text-blue-700">{confStats.last7}</p>
                        </div>
                        <Calendar className="h-6 w-6 text-blue-700" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {confirmations.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No confirmations found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {confirmations.map((c) => (
                    <Card key={c.id} className="border-green-200 bg-green-50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <ThumbsUp className="h-5 w-5 text-green-700" />
                              Looks Good Confirmation
                              <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                            </CardTitle>
                            <CardDescription className="mt-2">
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {c.user_name} ({c.user_email})
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDateTime(c.confirmed_at || c.created_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  Method: {c.confirmation_method || "self_confirmation"}
                                </span>
                              </div>
                            </CardDescription>
                          </div>
                          <Link href={`/athletes/${c.athlete_id}`}>
                            <Button variant="outline" size="sm" className="bg-transparent">
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3 p-3 bg-white rounded-lg border">
                          <h4 className="font-semibold mb-1 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-700" />
                            Athlete
                          </h4>
                          <p className="text-sm">
                            <strong>{c.athlete_name}</strong>
                            {c.athlete_high_school && ` • ${c.athlete_high_school}`}
                            {c.athlete_college && ` → ${c.athlete_college}`}
                          </p>
                        </div>
                        <p className="text-sm text-green-800">
                          This indicates the user reviewed the profile and confirmed the information is accurate.
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
