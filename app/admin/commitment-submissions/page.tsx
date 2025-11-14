"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
  commitment_announcement_url: string
  commit_picture_url: string
  entities: string
  submitted_at: string
  status: string
  created_at: string
  updated_at: string
}

export default function CommitmentSubmissions() {
  const [submissions, setSubmissions] = useState<CommitmentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/commitment-submissions")
      const data = await response.json()

      if (response.ok) {
        console.log("Fetched submissions:", data)
        setSubmissions(data.submissions || [])
      } else {
        setError(data.error || "Failed to fetch submissions")
      }
    } catch (error) {
      console.error("Error fetching submissions:", error)
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/commitment-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchSubmissions() // Refresh the list
      }
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div>Loading submissions...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-red-600">
            <div>Error: {error}</div>
            <Button onClick={fetchSubmissions} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Commitment Submissions</h1>
        <div className="flex gap-2 items-center">
          <Badge variant="secondary">{submissions.length} total</Badge>
          <Button onClick={fetchSubmissions} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <div>No submissions found.</div>
            <div className="text-sm mt-2">Try refreshing or check if the form is working properly.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => {
            let parsedEntities = []
            try {
              parsedEntities = submission.entities ? JSON.parse(submission.entities) : []
            } catch (e) {
              parsedEntities = []
            }

            return (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {submission.first_name} {submission.last_name}
                    </CardTitle>
                    <Badge
                      variant={
                        submission.status === "approved"
                          ? "default"
                          : submission.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {submission.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Graduation:</strong> {submission.graduation_year}
                    </div>
                    <div>
                      <strong>Gender:</strong> {submission.gender}
                    </div>
                    <div>
                      <strong>Weight:</strong> {submission.weight_class || "N/A"}
                    </div>
                    <div>
                      <strong>Submitted:</strong> {new Date(submission.submitted_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>High School:</strong> {submission.high_school}
                    </div>
                    <div>
                      <strong>Club:</strong> {submission.club || "N/A"}
                    </div>
                    <div>
                      <strong>College:</strong> {submission.college}
                    </div>
                  </div>

                  {(submission.instagram_handle || submission.commitment_announcement_url) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {submission.instagram_handle && (
                        <div>
                          <strong>Instagram:</strong>{" "}
                          <a
                            href={
                              submission.instagram_handle.startsWith("@")
                                ? `https://instagram.com/${submission.instagram_handle.slice(1)}`
                                : submission.instagram_handle.includes("instagram.com")
                                  ? submission.instagram_handle
                                  : `https://instagram.com/${submission.instagram_handle}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {submission.instagram_handle}
                          </a>
                        </div>
                      )}
                      {submission.commitment_announcement_url && (
                        <div>
                          <strong>Announcement:</strong>{" "}
                          <a
                            href={submission.commitment_announcement_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Post
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {submission.achievements && (
                    <div>
                      <strong>Achievements:</strong>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{submission.achievements}</p>
                    </div>
                  )}

                  {submission.notes && (
                    <div>
                      <strong>Notes:</strong>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{submission.notes}</p>
                    </div>
                  )}

                  {parsedEntities.length > 0 && (
                    <div>
                      <strong>Entities:</strong>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {parsedEntities.map((entity: any, index: number) => (
                          <Badge key={index} variant="outline">
                            {entity.name} ({entity.type})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {submission.athlete_image_url && (
                      <div>
                        <strong>Athlete Photo:</strong>
                        <div className="mt-1">
                          <img
                            src={submission.athlete_image_url || "/placeholder.svg"}
                            alt="Athlete"
                            className="w-20 h-20 object-cover rounded"
                          />
                        </div>
                      </div>
                    )}
                    {submission.commit_picture_url && (
                      <div>
                        <strong>Commit Picture:</strong>
                        <div className="mt-1">
                          <img
                            src={submission.commit_picture_url || "/placeholder.svg"}
                            alt="Commitment announcement"
                            className="w-20 h-20 object-cover rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 border-t pt-2">
                    <div>ID: {submission.id}</div>
                    <div>Created: {new Date(submission.created_at).toLocaleString()}</div>
                    {submission.updated_at !== submission.created_at && (
                      <div>Updated: {new Date(submission.updated_at).toLocaleString()}</div>
                    )}
                  </div>

                  {submission.status === "pending" && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" onClick={() => updateStatus(submission.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(submission.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
