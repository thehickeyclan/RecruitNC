"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, XCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Submission = {
  id: string
  user_id: string
  athlete_id?: string
  request_type: "edit" | "new"
  status: "pending" | "approved" | "rejected"
  request_data: any
  created_at: string
  user_email?: string
  admin_notes?: string
  reviewed_by?: string
  reviewed_at?: string
}

export default function SubmissionsPage() {
  const { user, isAdmin, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Redirect non-admin users
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/auth/signin?redirectTo=${encodeURIComponent("/admin/submissions")}`)
      } else if (!isAdmin) {
        router.push("/")
      }
    }
  }, [user, isAdmin, loading, router])

  useEffect(() => {
    if (user && isAdmin) {
      fetchSubmissions()
    }
  }, [user, isAdmin, activeTab])

  async function fetchSubmissions() {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // Fetch submissions with the selected status
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("edit_requests")
        .select("*")
        .eq("status", activeTab)
        .order("created_at", { ascending: false })

      if (submissionsError) throw submissionsError

      // Get user emails for each submission
      const submissionsWithEmails = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("email, full_name")
            .eq("user_id", submission.user_id)
            .single()

          return {
            ...submission,
            user_email: userProfile?.email || "Unknown User",
            user_full_name: userProfile?.full_name || "Unknown User",
          }
        }),
      )

      setSubmissions(submissionsWithEmails)
    } catch (err) {
      console.error("Error fetching submissions:", err)
      setError("Failed to load submissions. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApprove(submission: Submission) {
    try {
      setProcessingId(submission.id)

      const supabase = createClient()
      const { error } = await supabase
        .from("edit_requests")
        .update({
          status: "approved",
          admin_notes: adminNotes[submission.id] || "",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id)

      if (error) throw error

      toast({
        title: "Submission Approved",
        description: "The submission has been approved and the changes have been applied.",
      })

      // Remove from current list
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id))
    } catch (err) {
      console.error("Error approving submission:", err)
      toast({
        title: "Error",
        description: "There was an error approving the submission. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(submission: Submission) {
    try {
      setProcessingId(submission.id)

      const supabase = createClient()
      const { error } = await supabase
        .from("edit_requests")
        .update({
          status: "rejected",
          admin_notes: adminNotes[submission.id] || "",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id)

      if (error) throw error

      toast({
        title: "Submission Rejected",
        description: "The submission has been rejected.",
      })

      // Remove from current list
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id))
    } catch (err) {
      console.error("Error rejecting submission:", err)
      toast({
        title: "Error",
        description: "There was an error rejecting the submission. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  function handleNotesChange(id: string, notes: string) {
    setAdminNotes((prev) => ({ ...prev, [id]: notes }))
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading || !user || !isAdmin) {
    return <div className="container mx-auto py-10">Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6">User Submissions</h1>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-10">Loading submissions...</div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10">No {activeTab} submissions found.</div>
          ) : (
            <div className="space-y-6">
              {submissions.map((submission) => (
                <Card key={submission.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {submission.request_type === "edit" ? "Edit Request" : "New Commitment"}
                          <Badge
                            variant={
                              submission.status === "pending"
                                ? "outline"
                                : submission.status === "approved"
                                  ? "default"
                                  : "destructive"
                            }
                          >
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Submitted by {submission.user_email} on {formatDate(submission.created_at)}
                        </CardDescription>
                      </div>
                      {activeTab === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(submission)}
                            disabled={processingId === submission.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(submission)}
                            disabled={processingId === submission.id}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium">Description:</h3>
                        <p className="bg-gray-100 p-2 rounded">
                          {submission.request_data.description || "No description provided"}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium">Edit Type:</h3>
                        <p>{submission.request_data.editType || "General Edit"}</p>
                      </div>
                    </div>

                    {activeTab === "pending" && (
                      <div className="mt-6">
                        <Label htmlFor={`notes-${submission.id}`}>Admin Notes:</Label>
                        <Textarea
                          id={`notes-${submission.id}`}
                          value={adminNotes[submission.id] || ""}
                          onChange={(e) => handleNotesChange(submission.id, e.target.value)}
                          placeholder="Add notes about this submission (optional)"
                          className="mt-2"
                        />
                      </div>
                    )}

                    {(activeTab === "approved" || activeTab === "rejected") && submission.admin_notes && (
                      <div className="mt-6 p-3 bg-gray-50 rounded-md">
                        <h3 className="font-medium">Admin Notes:</h3>
                        <p className="mt-1">{submission.admin_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
