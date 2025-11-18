"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, CheckCircle2, XCircle, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function FixCommittedPage() {
  const [athleteName, setAthleteName] = useState("Kavan Wilson")
  const [collegeName, setCollegeName] = useState("Reinhardt University")
  const [isFixing, setIsFixing] = useState(false)
  const [fixResult, setFixResult] = useState<any>(null)
  const [committedAthletes, setCommittedAthletes] = useState<any[]>([])
  const [isLoadingCommitted, setIsLoadingCommitted] = useState(false)
  const { toast } = useToast()

  const handleFix = async () => {
    if (!athleteName || !collegeName) {
      toast({
        title: "Error",
        description: "Please provide both athlete name and college name",
        variant: "destructive",
      })
      return
    }

    setIsFixing(true)
    setFixResult(null)

    try {
      const response = await fetch("/api/admin/fix-committed-athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteName: athleteName.trim(),
          collegeName: collegeName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fix athlete")
      }

      setFixResult(data)
      toast({
        title: "Success",
        description: data.message || "Athlete fixed successfully",
      })

      // Refresh committed athletes list
      await fetchCommittedAthletes()
    } catch (error: any) {
      console.error("Error fixing athlete:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fix athlete",
        variant: "destructive",
      })
      setFixResult({ error: error.message })
    } finally {
      setIsFixing(false)
    }
  }

  const fetchCommittedAthletes = async () => {
    setIsLoadingCommitted(true)
    try {
      const response = await fetch("/api/admin/committed-athletes")
      if (!response.ok) {
        throw new Error("Failed to fetch committed athletes")
      }
      const data = await response.json()
      setCommittedAthletes(data.athletes || [])
    } catch (error: any) {
      console.error("Error fetching committed athletes:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch committed athletes",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCommitted(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#03154C]">Fix Committed Athletes</h1>
        <p className="text-muted-foreground mt-2">
          Ensure committed athletes appear in their school's portal funnel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fix Athlete</CardTitle>
          <CardDescription>
            Enter athlete name and college to create/update their star entry in the school portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="athleteName">Athlete Name</Label>
              <Input
                id="athleteName"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                placeholder="Kavan Wilson"
              />
            </div>
            <div>
              <Label htmlFor="collegeName">College Name</Label>
              <Input
                id="collegeName"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="Reinhardt University"
              />
            </div>
          </div>

          <Button onClick={handleFix} disabled={isFixing} className="w-full md:w-auto">
            {isFixing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Fix Athlete
              </>
            )}
          </Button>

          {fixResult && (
            <div className={`p-4 rounded-lg ${fixResult.error ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
              {fixResult.error ? (
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Error</p>
                    <p className="text-sm text-red-700">{fixResult.error}</p>
                    {fixResult.athlete && (
                      <p className="text-xs text-red-600 mt-1">
                        Athlete: {fixResult.athlete.name} | College: {fixResult.athlete.college} | Status: {fixResult.athlete.status}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Success</p>
                    <p className="text-sm text-green-700">{fixResult.message}</p>
                    {fixResult.athlete && (
                      <p className="text-xs text-green-600 mt-1">
                        {fixResult.athlete.name} → {fixResult.school?.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Committed Athletes</CardTitle>
              <CardDescription>
                List of all athletes with Committed, Signed, or College Athlete status
              </CardDescription>
            </div>
            <Button onClick={fetchCommittedAthletes} disabled={isLoadingCommitted} variant="outline">
              {isLoadingCommitted ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Refresh List
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {committedAthletes.length === 0 && !isLoadingCommitted ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No committed athletes found. Click "Refresh List" to load.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Graduation Year</TableHead>
                    <TableHead>In Portal?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {committedAthletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell className="font-medium">{athlete.name}</TableCell>
                      <TableCell>{athlete.college || "N/A"}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {athlete.recruiting_status}
                        </span>
                      </TableCell>
                      <TableCell>{athlete.graduationyear || "N/A"}</TableCell>
                      <TableCell>
                        {athlete.in_portal ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            No
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

