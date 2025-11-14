"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface PendingUpload {
  id: string
  file_name: string
  file_size: number
  upload_date: string
  status: string
}

export default function PendingUploadsPage() {
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingUploads()
  }, [])

  const fetchPendingUploads = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from("pending_uploads")
        .select("*")
        .order("upload_date", { ascending: false })

      if (error) throw error
      setUploads(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("pending_uploads").update({ status: "approved" }).eq("id", id)

      if (error) throw error
      fetchPendingUploads()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve upload")
    }
  }

  const handleReject = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("pending_uploads").update({ status: "rejected" }).eq("id", id)

      if (error) throw error
      fetchPendingUploads()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject upload")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading pending uploads...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">Error: {error}</div>
            <Button onClick={fetchPendingUploads} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending uploads found.</div>
          ) : (
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div key={upload.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{upload.file_name}</h3>
                      <p className="text-sm text-gray-500">Size: {Math.round(upload.file_size / 1024)} KB</p>
                      <p className="text-sm text-gray-500">
                        Uploaded: {new Date(upload.upload_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm">
                        Status: <span className="capitalize">{upload.status}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleApprove(upload.id)} variant="default" size="sm">
                        Approve
                      </Button>
                      <Button onClick={() => handleReject(upload.id)} variant="destructive" size="sm">
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
