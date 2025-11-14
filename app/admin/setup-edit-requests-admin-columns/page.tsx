"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Database } from "lucide-react"

export default function SetupEditRequestsAdminColumnsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const runScript = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/run-script/add-admin-columns-to-edit-requests", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ success: false, message: data.error || "Failed to run script" })
      }
    } catch (error) {
      setResult({ success: false, message: "Network error occurred" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Setup Edit Requests Admin Columns
            </CardTitle>
            <CardDescription>
              This will create the edit_requests table with proper foreign key relationships and admin columns for
              managing profile edit requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">What this script does:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Creates edit_requests table if it doesn't exist</li>
                <li>• Adds proper foreign key relationships to auth.users and athletes tables</li>
                <li>• Creates indexes for efficient querying</li>
                <li>• Sets up Row Level Security (RLS) policies</li>
                <li>• Adds admin review columns (reviewed_by, reviewed_at, admin_notes)</li>
              </ul>
            </div>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            <Button onClick={runScript} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up edit requests table...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Setup Edit Requests Table
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
