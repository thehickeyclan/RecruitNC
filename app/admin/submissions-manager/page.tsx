"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Mail,
  Trophy,
  Edit,
  FileText,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Types
interface CommitmentSubmission {
  id: string
  first_name: string
  last_name: string
  graduation_year: number
  gender: string
  weight_class: string
  high_school: string
  club: string
  college: string
  achievements: string
  notes: string
  athlete_image_url: string
  instagram_handle: string
  status: string
  created_at: string
  submitter_email: string
}

interface ProfileEditRequest {
  id: string
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
}

interface ProfileSubmission {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: string
  graduationYear: number
  weightClass: string
  highSchool: string
  bio: string | null
  achievements: string | null
  status: "pending" | "approved" | "rejected"
  submitted_at: string
}

interface Stats {
  newCommitments: number
  profileEdits: number
  newProfiles: number
  totalPending: number
}

export default function SubmissionsManagerPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Data states
  const [commitments, setCommitments] = useState<CommitmentSubmission[]>([])
  const [editRequests, setEditRequests] = useState<ProfileEditRequest[]>([])
  const [profileSubmissions, setProfileSubmissions] = useState<ProfileSubmission[]>([])
  const [stats, setStats] = useState<Stats>({
    newCommitments: 0,
    profileEdits: 0,
    newProfiles: 0,
    totalPending: 0,
  })

  // Processing states
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all submission types in parallel
      const [commitmentsRes, editsRes, profilesRes] = await Promise.all([
        fetch("/api/admin/commitment-submissions"),
        fetch("/api/admin/edit-requests"),
        fetch("/api/admin/profile-submissions"),
      ])

      const [commitmentsData, editsData, profilesData] = await Promise.all([
        commitmentsRes.json(),
        editsRes.json(),
        profilesRes.json(),
      ])

      setCommitments(commitmentsData.submissions || [])
      setEditRequests(editsData.requests || [])
      setProfileSubmissions(profilesData.submissions || [])

      // Calculate stats
      const pendingCommitments = (commitmentsData.submissions || []).filter(
        (s: CommitmentSubmission) => s.status === "pending"
      ).length
      const pendingEdits = (editsData.requests || []).filter(
        (r: ProfileEditRequest) => r.status === "pending"
      ).length
      const pendingProfiles = (profilesData.submissions || []).filter(
        (p: ProfileSubmission) => p.status === "pending"
      ).length

      setStats({
        newCommitments: pendingCommitments,
        profileEdits: pendingEdits,
        newProfiles: pendingProfiles,
        totalPending: pendingCommitments + pendingEdits + pendingProfiles,
      })
    } catch (err) {
      console.error("Error fetching submissions:", err)
      setError("Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }

  const handleCommitmentAction = async (id: string, status: string) => {
    try {
      setProcessingId(id)
      const response = await fetch(`/api/admin/commitment-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Commitment ${status}`,
        })
        await fetchAllData()
      } else {
        const errorData = await response.json()
        console.error("Failed to update commitment:", errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to update commitment",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error updating commitment:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update commitment",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditAction = async (id: string, status: string) => {
    try {
      setProcessingId(id)
      const response = await fetch("/api/admin/edit-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          status,
          adminNotes: adminNotes[id] || "",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Edit request ${status}`,
        })
        await fetchAllData()
        setAdminNotes((prev) => {
          const updated = { ...prev }
          delete updated[id]
          return updated
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update edit request",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleProfileAction = async (id: number, action: "approve" | "reject") => {
    try {
      setProcessingId(id.toString())
      const response = await fetch("/api/admin/profile-submissions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: id,
          action,
          adminNotes: adminNotes[id.toString()] || "",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Profile submission ${action}d`,
        })
        await fetchAllData()
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update profile submission",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
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

  const getRequestTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      achievements: "Achievements/Awards",
      photo: "Profile Photo",
      personal_info: "Personal Information",
      high_school: "High School",
      wrestling_club: "Wrestling Club",
      college: "College Commitment",
      weight_class: "Weight Class",
      graduation_year: "Graduation Year",
      match_record: "Match Record/Stats",
      ranked_athlete_update: "Ranked Athlete Update",
    }
    return labels[type] || "Other Request"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-2">Submissions Manager</h1>
            <p className="text-blue-200">Review and manage all submissions</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading submissions...</span>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NC United Branded Header */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Submissions Manager</h1>
              <p className="text-blue-200">Review and manage all submissions in one place</p>
            </div>
            <Button
              onClick={fetchAllData}
              variant="outline"
              className="bg-white text-[#002147] hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AdminHeader />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-[#B31B1B] shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Pending</p>
                  <p className="text-3xl font-bold text-[#B31B1B]">{stats.totalPending}</p>
                </div>
                <Clock className="h-8 w-8 text-[#B31B1B]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#002147] shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">New Commitments</p>
                  <p className="text-3xl font-bold text-[#002147]">{stats.newCommitments}</p>
                </div>
                <Trophy className="h-8 w-8 text-[#002147]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#002147] shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Profile Edits</p>
                  <p className="text-3xl font-bold text-[#002147]">{stats.profileEdits}</p>
                </div>
                <Edit className="h-8 w-8 text-[#002147]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#D4AF37] shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">New Profiles</p>
                  <p className="text-3xl font-bold text-[#D4AF37]">{stats.newProfiles}</p>
                </div>
                <User className="h-8 w-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different submission types */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border-2 border-gray-200">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
            >
              📋 Overview
            </TabsTrigger>
            <TabsTrigger
              value="commitments"
              className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
            >
              🏆 New Commitments ({stats.newCommitments})
            </TabsTrigger>
            <TabsTrigger
              value="edits"
              className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
            >
              ✏️ Profile Edits ({stats.profileEdits})
            </TabsTrigger>
            <TabsTrigger
              value="profiles"
              className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
            >
              👤 New Profiles ({stats.newProfiles})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border-t-4 border-t-[#002147]">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-[#002147]">Submission Overview</CardTitle>
                <CardDescription>Quick summary of all pending submissions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {stats.totalPending === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm">No pending submissions to review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.newCommitments > 0 && (
                      <Alert className="border-[#B31B1B] bg-red-50">
                        <Trophy className="h-4 w-4 text-[#B31B1B]" />
                        <AlertDescription>
                          <strong>{stats.newCommitments}</strong> new commitment
                          {stats.newCommitments !== 1 ? "s" : ""} waiting for review
                        </AlertDescription>
                      </Alert>
                    )}
                    {stats.profileEdits > 0 && (
                      <Alert className="border-[#002147] bg-blue-50">
                        <Edit className="h-4 w-4 text-[#002147]" />
                        <AlertDescription>
                          <strong>{stats.profileEdits}</strong> profile edit request
                          {stats.profileEdits !== 1 ? "s" : ""} pending
                        </AlertDescription>
                      </Alert>
                    )}
                    {stats.newProfiles > 0 && (
                      <Alert className="border-[#D4AF37] bg-yellow-50">
                        <User className="h-4 w-4 text-[#D4AF37]" />
                        <AlertDescription>
                          <strong>{stats.newProfiles}</strong> new profile submission
                          {stats.newProfiles !== 1 ? "s" : ""} to review
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Commitments Tab */}
          <TabsContent value="commitments" className="space-y-4">
            {commitments.filter((c) => c.status === "pending").length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending commitment submissions</p>
                </CardContent>
              </Card>
            ) : (
              commitments
                .filter((c) => c.status === "pending")
                .map((submission) => (
                  <Card key={submission.id} className="border-l-4 border-l-[#B31B1B]">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-[#002147]">
                            {submission.first_name} {submission.last_name}
                          </CardTitle>
                          <CardDescription>
                            {submission.high_school} → {submission.college}
                          </CardDescription>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Gender</p>
                          <p className="font-medium">{submission.gender}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Class</p>
                          <p className="font-medium">{submission.graduation_year}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Weight</p>
                          <p className="font-medium">{submission.weight_class}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Submitted</p>
                          <p className="font-medium text-sm">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {submission.club && (
                        <div>
                          <p className="text-sm text-gray-600">Club</p>
                          <p className="font-medium">{submission.club}</p>
                        </div>
                      )}

                      {submission.achievements && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Achievements</p>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {submission.achievements}
                          </p>
                        </div>
                      )}

                      {submission.notes && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Notes</p>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {submission.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleCommitmentAction(submission.id, "approved")}
                          disabled={processingId === submission.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === submission.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleCommitmentAction(submission.id, "rejected")}
                          disabled={processingId === submission.id}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Profile Edits Tab */}
          <TabsContent value="edits" className="space-y-4">
            {editRequests.filter((r) => r.status === "pending").length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <Edit className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending edit requests</p>
                </CardContent>
              </Card>
            ) : (
              editRequests
                .filter((r) => r.status === "pending")
                .map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-[#002147]">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-[#002147]">
                            {getRequestTypeLabel(request.request_type)}
                          </CardTitle>
                          <CardDescription>
                            {request.athlete_name} • {request.athlete_high_school} → {request.athlete_college}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          Requested by: {request.user_name} ({request.user_email})
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">Requested Changes</p>
                        <div className="bg-gray-50 p-4 rounded">
                          <pre className="text-sm whitespace-pre-wrap">
                            {JSON.stringify(request.request_data, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Admin Notes (optional)
                        </label>
                        <Textarea
                          value={adminNotes[request.id] || ""}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                          }
                          placeholder="Add notes about this request..."
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleEditAction(request.id, "approved")}
                          disabled={processingId === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleEditAction(request.id, "rejected")}
                          disabled={processingId === request.id}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Link href={`/unified-profile/${request.athlete_id}`} target="_blank">
                          <Button variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* New Profiles Tab */}
          <TabsContent value="profiles" className="space-y-4">
            {profileSubmissions.filter((p) => p.status === "pending").length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending profile submissions</p>
                </CardContent>
              </Card>
            ) : (
              profileSubmissions
                .filter((p) => p.status === "pending")
                .map((submission) => (
                  <Card key={submission.id} className="border-l-4 border-l-[#D4AF37]">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-[#002147]">
                            {submission.firstName} {submission.lastName}
                          </CardTitle>
                          <CardDescription>{submission.highSchool}</CardDescription>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Gender</p>
                          <p className="font-medium">{submission.gender}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Class</p>
                          <p className="font-medium">{submission.graduationYear}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Weight</p>
                          <p className="font-medium">{submission.weightClass}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Contact</p>
                          <p className="font-medium text-sm">{submission.email}</p>
                        </div>
                      </div>

                      {submission.bio && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Bio</p>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {submission.bio}
                          </p>
                        </div>
                      )}

                      {submission.achievements && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Achievements</p>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {submission.achievements}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Admin Notes (optional)
                        </label>
                        <Textarea
                          value={adminNotes[submission.id.toString()] || ""}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({
                              ...prev,
                              [submission.id.toString()]: e.target.value,
                            }))
                          }
                          placeholder="Add notes about this submission..."
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleProfileAction(submission.id, "approve")}
                          disabled={processingId === submission.id.toString()}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === submission.id.toString() ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleProfileAction(submission.id, "reject")}
                          disabled={processingId === submission.id.toString()}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

