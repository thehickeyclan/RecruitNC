"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  School,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"

const WEIGHT_CLASSES = ["106", "113", "120", "126", "132", "138", "145", "152", "160", "170", "182", "195", "220", "285"]
const TOURNAMENTS = {
  nhsca: "NHSCA National Duals (May 23-25)",
  aau: "AAU Scholastic Duals - All-Star Boys (June 24-26)",
  "deep-south": "Deep South Duals (Date TBA)",
}

type InterestFormSubmission = {
  id: string
  first_name: string
  last_name: string
  email: string
  cell_phone: string
  high_school: string
  club_team: string
  graduation_year: string
  primary_weight: string
  secondary_weight: string | null
  previous_teams: string[] | null
  tournament_interest: string[]
  achievements: string | null
  comments: string | null
  status: string
  admin_notes: string | null
  rank_score: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export default function NationalTeamSubmissionsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<InterestFormSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<InterestFormSubmission | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [rankScore, setRankScore] = useState<string>("")
  const [selectedTournament, setSelectedTournament] = useState<string>("all")
  const [selectedWeight, setSelectedWeight] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"rank" | "name" | "weight" | "created">("rank")

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/national-team-submissions")
      const result = await response.json()

      if (!result.ok) {
        throw new Error(result.error || "Failed to load submissions")
      }

      setSubmissions(result.submissions || [])
    } catch (err: any) {
      console.error("Error loading submissions:", err)
      setError(err?.message || "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSubmission = useCallback(
    async (submissionId: string, updates: Partial<InterestFormSubmission>) => {
      try {
        const response = await fetch("/api/admin/national-team-submissions", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: submissionId,
            ...updates,
          }),
        })

        const result = await response.json()

        if (!result.ok) {
          throw new Error(result.error || "Failed to update submission")
        }

        await loadSubmissions()
        setSelectedSubmission(null)
        setAdminNotes("")
        setNewStatus("")
        setRankScore("")
      } catch (err: any) {
        console.error("Error updating submission:", err)
        alert(`Failed to update submission: ${err?.message || "Unknown error"}`)
      }
    },
    [loadSubmissions]
  )

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  const filteredSubmissions = submissions
    .filter((sub) => {
      if (selectedTournament !== "all" && !sub.tournament_interest.includes(selectedTournament)) {
        return false
      }
      if (selectedWeight !== "all" && sub.primary_weight !== selectedWeight) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rank":
          if (a.rank_score === null && b.rank_score === null) return 0
          if (a.rank_score === null) return 1
          if (b.rank_score === null) return -1
          return a.rank_score - b.rank_score
        case "name":
          return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
        case "weight":
          return parseInt(a.primary_weight) - parseInt(b.primary_weight)
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

  const getCoverageByTournament = (tournamentId: string) => {
    const tournamentSubs = submissions.filter((sub) => sub.tournament_interest.includes(tournamentId))
    const coverage: Record<string, number> = {}
    WEIGHT_CLASSES.forEach((weight) => {
      coverage[weight] = tournamentSubs.filter((sub) => sub.primary_weight === weight).length
    })
    return coverage
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected":
        return "bg-green-500"
      case "reviewed":
        return "bg-blue-500"
      case "declined":
        return "bg-red-500"
      case "waitlist":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "selected":
        return <CheckCircle2 className="w-4 h-4" />
      case "reviewed":
        return <Clock className="w-4 h-4" />
      case "declined":
        return <XCircle className="w-4 h-4" />
      case "waitlist":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6 border-2 border-[#002147]">
          <CardHeader className="bg-gradient-to-r from-[#002147] to-[#003366] text-white">
            <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
              <Users className="w-6 h-6 md:w-8 md:h-8" />
              NC United National Team - Interest Form Submissions
            </CardTitle>
            <CardDescription className="text-blue-100">
              Manage Spring/Summer 2026 team submissions organized by tournament and weight class
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <Button onClick={loadSubmissions} disabled={loading} className="bg-[#002147] hover:bg-[#003366]">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <div className="flex-1 flex flex-col md:flex-row gap-4">
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Filter by tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tournaments</SelectItem>
                    {Object.entries(TOURNAMENTS).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedWeight} onValueChange={setSelectedWeight}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by weight" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Weights</SelectItem>
                    {WEIGHT_CLASSES.map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {weight} lbs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rank">Rank Score</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="created">Date Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
            )}

            {!loading && !error && submissions.length === 0 && (
              <Card className="mb-6 border-2 border-amber-200 bg-amber-50">
                <CardContent className="p-6">
                  <p className="text-amber-900 font-medium mb-2">No submissions yet</p>
                  <p className="text-amber-800 text-sm mb-3">
                    Submissions from the{" "}
                    <a href="/national-team/interest-form" className="underline font-medium">
                      Interest Form
                    </a>{" "}
                    will appear here. Share that link to collect responses.
                  </p>
                  <p className="text-amber-800 text-sm">
                    If you expect data but see none, ensure the database migration has been run:{" "}
                    <code className="bg-amber-100 px-1 rounded text-xs">
                      scripts/206-create-national-team-interest-form-table.sql
                    </code>
                  </p>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="nhsca">NHSCA Duals</TabsTrigger>
                <TabsTrigger value="aau">AAU Duals</TabsTrigger>
                <TabsTrigger value="deep-south">Deep South</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-[#002147]">{submissions.length}</div>
                      <div className="text-sm text-gray-600">Total Submissions</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {submissions.filter((s) => s.status === "selected").length}
                      </div>
                      <div className="text-sm text-gray-600">Selected</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {submissions.filter((s) => s.status === "pending").length}
                      </div>
                      <div className="text-sm text-gray-600">Pending Review</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {submissions.filter((s) => s.status === "waitlist").length}
                      </div>
                      <div className="text-sm text-gray-600">Waitlist</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>All Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>School</TableHead>
                            <TableHead>Grad Year</TableHead>
                            <TableHead>Tournaments</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSubmissions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                {submissions.length === 0
                                  ? "No submissions yet. Use the Interest Form to collect responses."
                                  : "No submissions match the current filters."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredSubmissions.map((sub) => (
                              <TableRow key={sub.id}>
                                <TableCell>
                                  {sub.rank_score !== null ? (
                                    <Badge variant="outline" className="font-mono">
                                      #{sub.rank_score}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {sub.last_name}, {sub.first_name}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {sub.primary_weight} lbs
                                    {sub.secondary_weight && ` / ${sub.secondary_weight} lbs`}
                                  </Badge>
                                </TableCell>
                                <TableCell>{sub.high_school}</TableCell>
                                <TableCell>{sub.graduation_year}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {sub.tournament_interest.map((tid) => (
                                      <Badge key={tid} variant="secondary" className="text-xs">
                                        {tid === "nhsca" ? "NHSCA" : tid === "aau" ? "AAU" : "Deep South"}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(sub.status)}>
                                    <span className="flex items-center gap-1">
                                      {getStatusIcon(sub.status)}
                                      {sub.status}
                                    </span>
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedSubmission(sub)}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {Object.entries(TOURNAMENTS).map(([tournamentId, tournamentName]) => {
                const coverage = getCoverageByTournament(tournamentId)
                const tournamentSubs = filteredSubmissions.filter((sub) =>
                  sub.tournament_interest.includes(tournamentId)
                )

                return (
                  <TabsContent key={tournamentId} value={tournamentId} className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Weight Class Coverage - {tournamentName}</CardTitle>
                        <CardDescription>Red indicates missing or low coverage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                          {WEIGHT_CLASSES.map((weight) => {
                            const count = coverage[weight] || 0
                            const hasCoverage = count > 0
                            return (
                              <div
                                key={weight}
                                className={`p-3 rounded-lg text-center border-2 ${
                                  hasCoverage ? "bg-green-50 border-green-200" : "bg-red-50 border-red-300"
                                }`}
                              >
                                <div
                                  className={`text-lg font-bold ${hasCoverage ? "text-green-700" : "text-red-700"}`}
                                >
                                  {weight}
                                </div>
                                <div className={`text-sm ${hasCoverage ? "text-green-600" : "text-red-600"}`}>
                                  {count} {count === 1 ? "athlete" : "athletes"}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      {WEIGHT_CLASSES.map((weight) => {
                        const weightSubs = tournamentSubs
                          .filter((sub) => sub.primary_weight === weight)
                          .sort((a, b) => {
                            if (a.rank_score === null && b.rank_score === null) return 0
                            if (a.rank_score === null) return 1
                            if (b.rank_score === null) return -1
                            return a.rank_score - b.rank_score
                          })

                        if (weightSubs.length === 0) {
                          return (
                            <Card key={weight} className="border-2 border-red-300 bg-red-50">
                              <CardHeader>
                                <CardTitle className="text-red-700">{weight} lbs - No Submissions</CardTitle>
                              </CardHeader>
                            </Card>
                          )
                        }

                        return (
                          <Card key={weight}>
                            <CardHeader>
                              <CardTitle>
                                {weight} lbs - {weightSubs.length}{" "}
                                {weightSubs.length === 1 ? "Submission" : "Submissions"}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>School</TableHead>
                                    <TableHead>Grad Year</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {weightSubs.map((sub) => (
                                    <TableRow key={sub.id}>
                                      <TableCell>
                                        {sub.rank_score !== null ? (
                                          <Badge variant="outline" className="font-mono">
                                            #{sub.rank_score}
                                          </Badge>
                                        ) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {sub.last_name}, {sub.first_name}
                                      </TableCell>
                                      <TableCell>{sub.high_school}</TableCell>
                                      <TableCell>{sub.graduation_year}</TableCell>
                                      <TableCell>
                                        <Badge className={getStatusColor(sub.status)}>{sub.status}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setSelectedSubmission(sub)}
                                        >
                                          View
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedSubmission?.last_name}, {selectedSubmission?.first_name}
              </DialogTitle>
              <DialogDescription>Submission Details</DialogDescription>
            </DialogHeader>

            {selectedSubmission && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <a
                        href={`mailto:${selectedSubmission.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedSubmission.email}
                      </a>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Cell Phone</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a
                        href={`tel:${selectedSubmission.cell_phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {selectedSubmission.cell_phone}
                      </a>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">High School</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <School className="w-4 h-4 text-gray-500" />
                      {selectedSubmission.high_school}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Club Team</Label>
                    <div className="mt-1">{selectedSubmission.club_team}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Graduation Year</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      {selectedSubmission.graduation_year}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Weight Classes</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="mr-2">
                        Primary: {selectedSubmission.primary_weight} lbs
                      </Badge>
                      {selectedSubmission.secondary_weight && (
                        <Badge variant="outline">
                          Secondary: {selectedSubmission.secondary_weight} lbs
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700">Tournament Interest</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSubmission.tournament_interest.map((tid) => (
                      <Badge key={tid} variant="secondary">
                        {TOURNAMENTS[tid as keyof typeof TOURNAMENTS]}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedSubmission.previous_teams && selectedSubmission.previous_teams.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Previous NC United Teams</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSubmission.previous_teams.map((team) => (
                        <Badge key={team} variant="outline">
                          {team}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSubmission.achievements && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Notable Achievements</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">{selectedSubmission.achievements}</div>
                  </div>
                )}

                {selectedSubmission.comments && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Additional Comments</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">{selectedSubmission.comments}</div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <div>
                    <Label htmlFor="rankScore" className="text-sm font-semibold text-gray-700">
                      Rank Score (lower is better, 1 = top choice)
                    </Label>
                    <Input
                      id="rankScore"
                      type="number"
                      value={rankScore || (selectedSubmission.rank_score ?? "")}
                      onChange={(e) => setRankScore(e.target.value)}
                      placeholder="Enter rank score"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="status" className="text-sm font-semibold text-gray-700">
                      Status
                    </Label>
                    <Select value={newStatus || selectedSubmission.status} onValueChange={setNewStatus}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="selected">Selected</SelectItem>
                        <SelectItem value="waitlist">Waitlist</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="adminNotes" className="text-sm font-semibold text-gray-700">
                      Admin Notes
                    </Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes || (selectedSubmission.admin_notes ?? "")}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this submission..."
                      className="mt-1 min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedSubmission) {
                    updateSubmission(selectedSubmission.id, {
                      status: newStatus || selectedSubmission.status,
                      admin_notes: adminNotes || selectedSubmission.admin_notes || null,
                      rank_score: rankScore ? parseInt(rankScore) : selectedSubmission.rank_score,
                    })
                  }
                }}
                className="bg-[#002147] hover:bg-[#003366]"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
