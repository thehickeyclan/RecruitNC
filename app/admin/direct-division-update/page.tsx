"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AuthGuard } from "@/components/auth-guard"
import { CheckCircle, AlertCircle, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DirectDivisionUpdatePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [college, setCollege] = useState("")
  const [division, setDivision] = useState("")

  const handleUpdate = async () => {
    if (!college || !division) {
      setError("College and division are required")
      return
    }

    if (
      !confirm(
        `This will update all athletes with college names containing "${college}" to division "${division}". Continue?`,
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/direct-division-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ college, division }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update divisions")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error("Error updating divisions:", err)
      setError(err instanceof Error ? err.message : "Failed to update divisions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Direct Division Update</h1>
        <p className="text-gray-600 mb-8">
          This page allows you to directly update the division for all athletes matching a specific college name.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Update Division</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="college">College Name (partial match)</Label>
                  <Input
                    id="college"
                    placeholder="e.g. mount olive"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Enter a partial college name. All athletes with colleges containing this text will be updated.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="division">Division</Label>
                  <Select value={division} onValueChange={setDivision}>
                    <SelectTrigger id="division">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Division I">Division I</SelectItem>
                      <SelectItem value="Division II">Division II</SelectItem>
                      <SelectItem value="Division III">Division III</SelectItem>
                      <SelectItem value="NAIA">NAIA</SelectItem>
                      <SelectItem value="NJCAA">NJCAA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleUpdate} disabled={loading || !college || !division}>
                  {loading ? <span className="mr-2 h-4 w-4 animate-spin">...</span> : <Save className="mr-2 h-4 w-4" />}
                  Update Division
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Update Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6" variant={result.count > 0 ? "default" : "warning"}>
                  {result.count > 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.count > 0 ? "Success" : "No Records Found"}</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>

                <p className="text-sm text-gray-600">
                  The update operation has completed. You may need to refresh your browser to see the changes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
