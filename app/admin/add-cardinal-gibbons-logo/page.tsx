"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, RefreshCw, Info } from "lucide-react"

export default function AddCardinalGibbonsLogo() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    action?: string
  } | null>(null)

  const addLogo = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/add-cardinal-gibbons-logo", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Cardinal Gibbons logo processed successfully!",
          action: data.action,
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to process logo",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      setResult({
        success: false,
        message: "Network error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Fix Cardinal Gibbons Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will update the Cardinal Gibbons High School logo mapping with the correct URL. If no mapping exists,
              it will create a new one.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Entity:</strong> Cardinal Gibbons High School
            </p>
            <p>
              <strong>Type:</strong> highschool
            </p>
            <p className="break-all">
              <strong>New URL:</strong>{" "}
              https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/highschool-logos/cardinal-gibbons-high-school.png
            </p>
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertDescription className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <div>
                  {result.message}
                  {result.action && <div className="text-xs mt-1 opacity-75">Action: {result.action}</div>}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={addLogo} disabled={loading} className="w-full">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Fix Cardinal Gibbons Logo"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
