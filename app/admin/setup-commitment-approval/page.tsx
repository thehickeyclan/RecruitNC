"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2, Database } from "lucide-react"

export default function SetupCommitmentApproval() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runScript = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch("/api/run-script/add-commitment-approval-columns", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
      } else {
        throw new Error(data.error || "Unknown error occurred")
      }
    } catch (err) {
      console.error("Error running script:", err)
      setError(err instanceof Error ? err.message : "Failed to run script")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Setup Commitment Approval System</h1>
        <p className="text-muted-foreground mt-2">Add database columns for tracking commitment approvals in Phase 1</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Add Commitment Approval Columns
          </CardTitle>
          <CardDescription>
            This will add the necessary database columns to track commitment approvals and migrate existing data.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Commitment approval columns have been added successfully! The claims manager is now ready for Phase 1.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h4 className="font-semibold">This script will:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Add `commitment_approved` boolean column</li>
              <li>Add `commitment_approved_at` timestamp column</li>
              <li>Add `commitment_approved_by` user reference column</li>
              <li>Create database indexes for performance</li>
              <li>Migrate existing claimed profiles to approved status</li>
            </ul>
          </div>

          <Button onClick={runScript} disabled={loading || success} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Script...
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Script Completed
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Setup Script
              </>
            )}
          </Button>

          {success && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Next steps:</p>
              <div className="space-y-2">
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <a href="/admin/athlete-claims-manager">Go to Claims Manager</a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
