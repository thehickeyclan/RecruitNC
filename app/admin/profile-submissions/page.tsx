"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, Trophy, AlertCircle, Loader2 } from "lucide-react"

interface ProfileSubmission {
  id: number
  user_id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  gender: string
  graduationYear: number
  weightClass: string
  highSchool: string
  location: string
  bio: string | null
  achievements: string | null
  photoUrl: string | null
  status: "pending" | "approved" | "rejected"
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  admin_notes: string | null
}

export default function ProfileSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ProfileSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState<{ [key: number]: string }>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/profile-submissions")

      if (!response.ok) {
        throw new Error("Failed to fetch submissions")
      }

      const data = await response.json()
      setSubmissions(data.submissions || [])
    } catch (err) {
      setError("Failed to load profile submissions")
      console.error("Error fetching submissions:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (submissionId: number, action: "approve" | "reject") => {
    try {
      setProcessingId(submissionId)
      const response = await fetch("/api/admin/profile-submissions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          action,
          adminNotes: reviewNotes[submissionId] || "",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} submission`)
      }

      toast({
        title: "Success",
        description: `Profile ${action === "approve" ? "approved" : "rejected"} successfully`,
      })

      // Refresh submissions
      await fetchSubmissions()

      // Clear notes for this submission
      setReviewNotes((prev) => {
        const newNotes = { ...prev }
        delete newNotes[submissionId]
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

  const pendingSubmissions = submissions.filter((s) => s.status === "pending")
  const reviewedSubmissions = submissions.filter((s) => s.status !== "pending")

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AdminHeader />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading profile submissions...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Submissions</h1>
        <p className="text-gray-600">Review and approve athlete profile submissions</p>
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
                <p className="text-2xl font-bold text-gray-900">{pendingSubmissions.length}</p>
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
                  {submissions.filter((s) => s.status === "approved").length}
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
                  {submissions.filter((s) => s.status === "rejected").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Submissions */}
      {pendingSubmissions.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Submissions ({pendingSubmissions.length})
            </CardTitle>
            <CardDescription>These profiles are waiting for your review and approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingSubmissions.map((submission) => (
              <div key={submission.id} className="border rounded-lg p-6 bg-yellow-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">
                      {submission.firstName} {submission.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(submission.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{submission.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{submission.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{submission.location}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Gender:</span> {submission.gender}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Graduation:</span> {submission.graduationYear}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Weight Class:</span> {submission.weightClass} lbs
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">High School:</span> {submission.highSchool}
                    </div>
                  </div>
                </div>

                {submission.bio && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Biography:</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">{submission.bio}</p>
                  </div>
                )}

                {submission.achievements && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Achievements:
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">{submission.achievements}</p>
                  </div>
                )}

                {submission.photoUrl && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Profile Photo:</h4>
                    <img
                      src={submission.photoUrl || "/placeholder.svg"}
                      alt={`${submission.firstName} ${submission.lastName}`}
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}

                {/* Admin Review Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">Admin Review:</h4>
                  <Textarea
                    placeholder="Add notes about this submission (optional)..."
                    value={reviewNotes[submission.id] || ""}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [submission.id]: e.target.value,
                      }))
                    }
                    className="mb-4"
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApproval(submission.id, "approve")}
                      disabled={processingId === submission.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === submission.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve & Create Profile
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleApproval(submission.id, "reject")}
                      disabled={processingId === submission.id}
                    >
                      {processingId === submission.id ? (
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

      {/* Reviewed Submissions */}
      {reviewedSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reviewed Submissions ({reviewedSubmissions.length})</CardTitle>
            <CardDescription>Previously reviewed profile submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviewedSubmissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">
                        {submission.firstName} {submission.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {submission.email} • {submission.highSchool}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reviewed{" "}
                        {submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    {getStatusBadge(submission.status)}
                  </div>
                  {submission.admin_notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">Admin Notes:</span> {submission.admin_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {submissions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Profile Submissions</h3>
            <p className="text-muted-foreground">
              Profile submissions will appear here when athletes create their profiles
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
