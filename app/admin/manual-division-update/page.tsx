"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import { CheckCircle, AlertCircle, Search, RefreshCw } from "lucide-react"

export default function ManualDivisionUpdatePage() {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [division, setDivision] = useState("Division II")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const updateDivision = async () => {
    if (!searchTerm) {
      setError("Please enter a college name to search for")
      return
    }

    if (
      !confirm(
        `This will update all athletes with college names containing "${searchTerm}" to division "${division}". Continue?`,
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/manual-division-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm,
          division,
        }),
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
        <h1 className="text-3xl font-bold mb-4">Manual Division Update</h1>
        <p className="text-gray-600 mb-8">
          This page allows you to manually update athlete divisions by searching for college names.
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
              <CardTitle>Update Athlete Divisions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="search">College Name (contains)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      placeholder="e.g. mount olive"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
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

                <Button onClick={updateDivision} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
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
                  <AlertDescription>
                    {result.count > 0
                      ? `Updated ${result.count} athlete records with division "${division}".`
                      : `No athletes found with college name containing "${searchTerm}".`}
                  </AlertDescription>
                </Alert>

                {result.athletes && result.athletes.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold mb-2">Updated Athletes</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>College</TableHead>
                          <TableHead>Previous Division</TableHead>
                          <TableHead>New Division</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.athletes.map((athlete: any) => (
                          <TableRow key={athlete.id}>
                            <TableCell className="font-medium">{athlete.name}</TableCell>
                            <TableCell>{athlete.college}</TableCell>
                            <TableCell>{athlete.previous_division || "None"}</TableCell>
                            <TableCell>{division}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
