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
  Trash2,
} from "lucide-react"
import {
  NHSCA_INTEREST_WEIGHT_CLASSES,
  AAU_SCHOLASTIC_WEIGHT_CLASSES,
  interestFormWeightClassUnion,
  weightOptionsForSubmissionInterest,
  formatNationalTeamWeightLabel,
  isAauScholasticWeightClass,
  nearestAauScholasticWeightClass,
  nearestNhscaInterestWeightClass,
} from "@/lib/national-team-weight-classes"

const NHSCA_WEIGHT_CLASSES = [...NHSCA_INTEREST_WEIGHT_CLASSES]
const AAU_WEIGHT_CLASSES = [...AAU_SCHOLASTIC_WEIGHT_CLASSES]
const ALL_INTEREST_WEIGHT_CLASSES = interestFormWeightClassUnion()

function weightClassesForTournamentTab(tournamentId: string): string[] {
  if (tournamentId === "aau") return AAU_WEIGHT_CLASSES
  if (tournamentId === "nhsca") return NHSCA_WEIGHT_CLASSES
  return ALL_INTEREST_WEIGHT_CLASSES
}

/** Weight filter + NHSCA buckets: AAU-snapped weights (e.g. 144) still match NHSCA class (145). */
function submissionMatchesSelectedWeight(sub: InterestFormSubmission, selectedWeight: string): boolean {
  if (selectedWeight === "all") return true
  if (sub.primary_weight === selectedWeight) return true
  if (nearestNhscaInterestWeightClass(sub.primary_weight) === selectedWeight) return true
  if (nearestAauScholasticWeightClass(sub.primary_weight) === selectedWeight) return true
  return false
}

const TOURNAMENTS = {
  nhsca: "NHSCA National Duals (May 23-25)",
  aau: "AAU Scholastic Duals - All-Star Boys (June 24-26)",
}

const NHSCA_TEAM_1_LABEL = "Team 1"
const NHSCA_TEAM_2_LABEL = "Team 2"

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
  nhsca_duals_team?: string | null
  nhsca_duals_starter?: boolean
  aau_duals_team?: string | null
  aau_duals_starter?: boolean
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [nhscaTeam, setNhscaTeam] = useState<string>("")
  const [nhscaStarter, setNhscaStarter] = useState(false)
  const [aauTeam, setAauTeam] = useState<string>("")
  const [aauStarter, setAauStarter] = useState(false)
  const [updatingLineupId, setUpdatingLineupId] = useState<string | null>(null)
  const [migrationSql, setMigrationSql] = useState<string | null>(null)
  const [editPrimaryWeight, setEditPrimaryWeight] = useState<string>("")
  const [editSecondaryWeight, setEditSecondaryWeight] = useState<string>("")

  const loadSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/national-team-submissions", { credentials: "include" })
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: submissionId, ...updates }),
          credentials: "include",
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
        setNhscaTeam("")
        setNhscaStarter(false)
        setAauTeam("")
        setAauStarter(false)
      } catch (err: any) {
        console.error("Error updating submission:", err)
        alert(`Failed to update submission: ${err?.message || "Unknown error"}`)
      }
    },
    [loadSubmissions]
  )

  const assignNhscaDualsStarter = useCallback(
    async (sub: InterestFormSubmission, team: "team_1" | "team_2") => {
      setUpdatingLineupId(sub.id)
      try {
        const slot = nearestNhscaInterestWeightClass(sub.primary_weight)
        const othersSameTeamAndWeight = submissions.filter(
          (s) =>
            s.id !== sub.id &&
            nearestNhscaInterestWeightClass(s.primary_weight) === slot &&
            (s as InterestFormSubmission).nhsca_duals_team === team &&
            (s as InterestFormSubmission).nhsca_duals_starter
        )
        for (const other of othersSameTeamAndWeight) {
          await fetch("/api/admin/national-team-submissions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: other.id, nhsca_duals_starter: false }),
            credentials: "include",
          })
        }
        const res = await fetch("/api/admin/national-team-submissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sub.id,
            nhsca_duals_team: team,
            nhsca_duals_starter: true,
          }),
          credentials: "include",
        })
        const result = await res.json()
        if (!result.ok) {
          if (result.fixMigrationSql) {
            setMigrationSql(result.fixMigrationSql)
            return
          }
          throw new Error(result.error || "Failed to set starter")
        }
        setMigrationSql(null)
        await loadSubmissions()
      } catch (err: any) {
        console.error("Error assigning NHSCA starter:", err)
        alert(`Failed to assign: ${err?.message || "Unknown error"}`)
      } finally {
        setUpdatingLineupId(null)
      }
    },
    [submissions, loadSubmissions]
  )

  const assignAauDualsStarter = useCallback(
    async (sub: InterestFormSubmission, team: "team_1" | "team_2") => {
      setUpdatingLineupId(sub.id)
      try {
        const othersSameTeamAndWeight = submissions.filter(
          (s) =>
            s.id !== sub.id &&
            s.primary_weight === sub.primary_weight &&
            (s as InterestFormSubmission).aau_duals_team === team &&
            (s as InterestFormSubmission).aau_duals_starter
        )
        for (const other of othersSameTeamAndWeight) {
          await fetch("/api/admin/national-team-submissions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: other.id, aau_duals_starter: false }),
            credentials: "include",
          })
        }
        const res = await fetch("/api/admin/national-team-submissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sub.id,
            aau_duals_team: team,
            aau_duals_starter: true,
          }),
          credentials: "include",
        })
        const result = await res.json()
        if (!result.ok) {
          if (result.fixMigrationSql) {
            setMigrationSql(result.fixMigrationSql)
            return
          }
          throw new Error(result.error || "Failed to set AAU starter")
        }
        setMigrationSql(null)
        await loadSubmissions()
      } catch (err: any) {
        console.error("Error assigning AAU starter:", err)
        alert(`Failed to assign: ${err?.message || "Unknown error"}`)
      } finally {
        setUpdatingLineupId(null)
      }
    },
    [submissions, loadSubmissions]
  )

  const clearNhscaDualsAssignment = useCallback(
    async (sub: InterestFormSubmission) => {
      setUpdatingLineupId(sub.id)
      try {
        const res = await fetch("/api/admin/national-team-submissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sub.id,
            nhsca_duals_team: null,
            nhsca_duals_starter: false,
          }),
          credentials: "include",
        })
        const result = await res.json()
        if (!result.ok) {
          if (result.fixMigrationSql) {
            setMigrationSql(result.fixMigrationSql)
            return
          }
          throw new Error(result.error || "Failed to clear assignment")
        }
        setMigrationSql(null)
        await loadSubmissions()
      } catch (err: any) {
        console.error("Error clearing NHSCA assignment:", err)
        alert(`Failed to clear: ${err?.message || "Unknown error"}`)
      } finally {
        setUpdatingLineupId(null)
      }
    },
    [loadSubmissions]
  )

  const clearAauDualsAssignment = useCallback(
    async (sub: InterestFormSubmission) => {
      setUpdatingLineupId(sub.id)
      try {
        const res = await fetch("/api/admin/national-team-submissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sub.id,
            aau_duals_team: null,
            aau_duals_starter: false,
          }),
          credentials: "include",
        })
        const result = await res.json()
        if (!result.ok) {
          if (result.fixMigrationSql) {
            setMigrationSql(result.fixMigrationSql)
            return
          }
          throw new Error(result.error || "Failed to clear AAU assignment")
        }
        setMigrationSql(null)
        await loadSubmissions()
      } catch (err: any) {
        console.error("Error clearing AAU assignment:", err)
        alert(`Failed to clear: ${err?.message || "Unknown error"}`)
      } finally {
        setUpdatingLineupId(null)
      }
    },
    [loadSubmissions]
  )

  const snapSubmissionToNearestAauWeights = useCallback(
    async (sub: InterestFormSubmission) => {
      const nextPrimary = nearestAauScholasticWeightClass(sub.primary_weight)
      let nextSecondary: string | null = sub.secondary_weight?.trim()
        ? nearestAauScholasticWeightClass(sub.secondary_weight)
        : null
      if (nextSecondary === nextPrimary) nextSecondary = null
      if (nextPrimary === sub.primary_weight && nextSecondary === (sub.secondary_weight ?? null)) {
        alert("Primary and secondary weights already match AAU classes.")
        return
      }
      if (
        !confirm(
          `Update ${sub.last_name}, ${sub.first_name}?\nPrimary: ${sub.primary_weight} → ${nextPrimary}` +
            (sub.secondary_weight?.trim()
              ? `\nSecondary: ${sub.secondary_weight} → ${nextSecondary ?? "(clear if same as primary)"}`
              : "")
        )
      ) {
        return
      }
      try {
        const res = await fetch("/api/admin/national-team-submissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sub.id,
            primary_weight: nextPrimary,
            secondary_weight: nextSecondary,
          }),
          credentials: "include",
        })
        const result = await res.json()
        if (!result.ok) throw new Error(result.error || "Failed to update weights")
        await loadSubmissions()
      } catch (err: any) {
        console.error(err)
        alert(err?.message || "Failed to snap weights")
      }
    },
    [loadSubmissions]
  )

  const deleteSubmission = useCallback(
    async (submissionId: string) => {
      if (!confirm("Delete this submission? This cannot be undone.")) return
      setDeletingId(submissionId)
      try {
        const response = await fetch("/api/admin/national-team-submissions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: submissionId }),
          credentials: "include",
        })
        const result = await response.json()
        if (!result.ok) throw new Error(result.error || "Failed to delete submission")
        await loadSubmissions()
        setSelectedSubmission(null)
      } catch (err: any) {
        console.error("Error deleting submission:", err)
        alert(`Failed to delete: ${err?.message || "Unknown error"}`)
      } finally {
        setDeletingId(null)
      }
    },
    [loadSubmissions]
  )

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  useEffect(() => {
    if (selectedSubmission) {
      setNhscaTeam(selectedSubmission.nhsca_duals_team ?? "")
      setNhscaStarter(selectedSubmission.nhsca_duals_starter ?? false)
      setAauTeam(selectedSubmission.aau_duals_team ?? "")
      setAauStarter(selectedSubmission.aau_duals_starter ?? false)
      setEditPrimaryWeight(selectedSubmission.primary_weight ?? "")
      setEditSecondaryWeight(selectedSubmission.secondary_weight ?? "")
    } else {
      setNhscaTeam("")
      setNhscaStarter(false)
      setAauTeam("")
      setAauStarter(false)
      setEditPrimaryWeight("")
      setEditSecondaryWeight("")
    }
  }, [selectedSubmission])

  const filteredSubmissions = submissions
    .filter((sub) => {
      if (selectedTournament !== "all" && !sub.tournament_interest.includes(selectedTournament)) {
        return false
      }
      if (!submissionMatchesSelectedWeight(sub, selectedWeight)) {
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
    weightClassesForTournamentTab(tournamentId).forEach((weight) => {
      if (tournamentId === "nhsca") {
        coverage[weight] = tournamentSubs.filter(
          (sub) => nearestNhscaInterestWeightClass(sub.primary_weight) === weight
        ).length
      } else {
        coverage[weight] = tournamentSubs.filter((sub) => sub.primary_weight === weight).length
      }
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

  const submissionEditWeightOptions = selectedSubmission
    ? weightOptionsForSubmissionInterest(selectedSubmission.tournament_interest)
    : ALL_INTEREST_WEIGHT_CLASSES
  const submissionEditWeightLabelVariant: "nhsca" | "aau" | "neutral" = (() => {
    if (!selectedSubmission) return "neutral"
    const ti = selectedSubmission.tournament_interest
    if (ti.includes("aau") && !ti.includes("nhsca")) return "aau"
    if (ti.includes("nhsca")) return "nhsca"
    return "neutral"
  })()

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
                    {ALL_INTEREST_WEIGHT_CLASSES.map((weight) => (
                      <SelectItem key={weight} value={weight}>
                        {formatNationalTeamWeightLabel(weight, "neutral")}
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

            <Card className="mb-4 border border-amber-200 bg-amber-50/80">
              <CardContent className="p-3">
                <p className="text-amber-900 text-sm font-medium mb-1">NHSCA or AAU — Team 1 / Team 2 / starter not saving?</p>
                <p className="text-amber-800 text-xs mb-2">Run this once in Supabase → SQL Editor, then refresh.</p>
                <pre className="p-2 bg-white border rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono mb-2">{`ALTER TABLE public.national_team_interest_forms
  ADD COLUMN IF NOT EXISTS nhsca_duals_team text,
  ADD COLUMN IF NOT EXISTS nhsca_duals_starter boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS aau_duals_team text,
  ADD COLUMN IF NOT EXISTS aau_duals_starter boolean DEFAULT false;`}</pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    const sql = `ALTER TABLE public.national_team_interest_forms
  ADD COLUMN IF NOT EXISTS nhsca_duals_team text,
  ADD COLUMN IF NOT EXISTS nhsca_duals_starter boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS aau_duals_team text,
  ADD COLUMN IF NOT EXISTS aau_duals_starter boolean DEFAULT false;`
                    navigator.clipboard.writeText(sql)
                    alert("Copied. Paste in Supabase SQL Editor and run.")
                  }}
                >
                  Copy SQL
                </Button>
              </CardContent>
            </Card>

            {migrationSql && (
              <Card className="mb-4 border-2 border-amber-300 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-amber-900 text-base">Missing database columns</CardTitle>
                  <CardDescription className="text-amber-800">
                    Run this in Supabase → SQL Editor, then refresh and try again.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="p-3 bg-white border rounded text-sm overflow-x-auto whitespace-pre-wrap font-mono">{migrationSql}</pre>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(migrationSql)
                        alert("Copied to clipboard")
                      }}
                    >
                      Copy SQL
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMigrationSql(null)}>
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                    . If &quot;Set as starter&quot; does nothing, add columns:{" "}
                    <code className="bg-amber-100 px-1 rounded text-xs">
                      nhsca_duals_* / aau_duals_* team + starter columns
                    </code>{" "}
                    on <code className="bg-amber-100 px-1 rounded text-xs">national_team_interest_forms</code> (see{" "}
                    <code className="bg-amber-100 px-1 rounded text-xs">scripts/209-aau-duals-columns-national-team-interest.sql</code>).
                  </p>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="nhsca">NHSCA Duals</TabsTrigger>
                <TabsTrigger value="aau">AAU Duals</TabsTrigger>
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
                                        {tid === "nhsca" ? "NHSCA" : tid === "aau" ? "AAU" : tid}
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
                const tabWeights = weightClassesForTournamentTab(tournamentId)
                const coverageLabelVariant =
                  tournamentId === "aau" ? "aau" : tournamentId === "nhsca" ? "nhsca" : "neutral"

                return (
                  <TabsContent key={tournamentId} value={tournamentId} className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Weight Class Coverage - {tournamentName}</CardTitle>
                        <CardDescription>Red indicates missing or low coverage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                          {tabWeights.map((weight) => {
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
                                  {formatNationalTeamWeightLabel(weight, coverageLabelVariant)}
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

                    {tournamentId === "aau" && (() => {
                      const orphanSubs = tournamentSubs
                        .filter((s) => !isAauScholasticWeightClass(s.primary_weight))
                        .sort((a, b) => {
                          if (a.rank_score === null && b.rank_score === null) return 0
                          if (a.rank_score === null) return 1
                          if (b.rank_score === null) return -1
                          return a.rank_score - b.rank_score
                        })
                      if (orphanSubs.length === 0) return null
                      return (
                        <Card className="border-2 border-amber-500 bg-amber-50/90">
                          <CardHeader>
                            <CardTitle className="text-amber-950">AAU interest — primary weight not on AAU chart</CardTitle>
                            <CardDescription className="text-amber-900/90">
                              Rows were not deleted. They are hidden from the weight buckets above when primary is still
                              NHSCA-style (e.g. 145 vs 144). Use <strong>Snap to nearest AAU</strong> or run{" "}
                              <code className="rounded bg-white/80 px-1 text-xs">
                                scripts/sql/map-interest-weights-to-nearest-aau.sql
                              </code>{" "}
                              in Supabase for a bulk fix.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Rank</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>School</TableHead>
                                  <TableHead>Weight on file</TableHead>
                                  <TableHead>Nearest AAU</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orphanSubs.map((sub) => {
                                  const row = sub as InterestFormSubmission
                                  const suggested = nearestAauScholasticWeightClass(row.primary_weight)
                                  return (
                                    <TableRow key={sub.id}>
                                      <TableCell>
                                        {sub.rank_score !== null ? (
                                          <Badge variant="outline" className="font-mono">
                                            #{sub.rank_score}
                                          </Badge>
                                        ) : (
                                          "—"
                                        )}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {sub.last_name}, {sub.first_name}
                                      </TableCell>
                                      <TableCell>{sub.high_school}</TableCell>
                                      <TableCell>
                                        {row.primary_weight} lbs
                                        {row.secondary_weight ? ` / ${row.secondary_weight} lbs` : ""}
                                      </TableCell>
                                      <TableCell className="font-medium text-amber-950">
                                        {formatNationalTeamWeightLabel(suggested, "aau")}
                                        {row.secondary_weight?.trim() ? (
                                          <span className="block text-xs font-normal text-muted-foreground">
                                            2nd:{" "}
                                            {(() => {
                                              const s2 = nearestAauScholasticWeightClass(row.secondary_weight!)
                                              return s2 === suggested ? "— (same as primary → cleared)" : `${s2} lbs`
                                            })()}
                                          </span>
                                        ) : null}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                          <Button
                                            size="sm"
                                            className="h-7 text-xs bg-amber-800 hover:bg-amber-900"
                                            onClick={() => snapSubmissionToNearestAauWeights(row)}
                                          >
                                            Snap to nearest AAU
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={() => setSelectedSubmission(sub)}
                                          >
                                            View
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      )
                    })()}

                    {tournamentId === "nhsca" && (() => {
                      const team1Starters = submissions.filter(
                        (s) => (s as InterestFormSubmission).nhsca_duals_team === "team_1" && (s as InterestFormSubmission).nhsca_duals_starter
                      )
                      const team2Starters = submissions.filter(
                        (s) => (s as InterestFormSubmission).nhsca_duals_team === "team_2" && (s as InterestFormSubmission).nhsca_duals_starter
                      )
                      return (
                        <Card className="border-2 border-[#002147]/20">
                          <CardHeader>
                            <CardTitle>NHSCA Duals – Starters for 2 Teams</CardTitle>
                            <CardDescription>
                              One starter per weight per team. Assign from the table below or in the submission detail.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold text-[#002147] mb-2">{NHSCA_TEAM_1_LABEL}</h4>
                                <ul className="space-y-1 text-sm">
                                  {NHSCA_WEIGHT_CLASSES.map((w) => {
                                    const sub = team1Starters.find(
                                      (s) => nearestNhscaInterestWeightClass(s.primary_weight) === w
                                    )
                                    return (
                                      <li key={w} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          {formatNationalTeamWeightLabel(w, "nhsca")}
                                        </span>
                                        <span>{sub ? `${sub.last_name}, ${sub.first_name}` : "—"}</span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold text-[#002147] mb-2">{NHSCA_TEAM_2_LABEL}</h4>
                                <ul className="space-y-1 text-sm">
                                  {NHSCA_WEIGHT_CLASSES.map((w) => {
                                    const sub = team2Starters.find(
                                      (s) => nearestNhscaInterestWeightClass(s.primary_weight) === w
                                    )
                                    return (
                                      <li key={w} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          {formatNationalTeamWeightLabel(w, "nhsca")}
                                        </span>
                                        <span>{sub ? `${sub.last_name}, ${sub.first_name}` : "—"}</span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })()}

                    {tournamentId === "aau" && (() => {
                      const team1Starters = submissions.filter(
                        (s) => (s as InterestFormSubmission).aau_duals_team === "team_1" && (s as InterestFormSubmission).aau_duals_starter
                      )
                      const team2Starters = submissions.filter(
                        (s) => (s as InterestFormSubmission).aau_duals_team === "team_2" && (s as InterestFormSubmission).aau_duals_starter
                      )
                      return (
                        <Card className="border-2 border-[#002147]/20">
                          <CardHeader>
                            <CardTitle>AAU Scholastic Duals – Starters for 2 Teams</CardTitle>
                            <CardDescription>
                              One starter per weight per team. Assign from the table below or in the submission detail.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold text-[#002147] mb-2">{NHSCA_TEAM_1_LABEL}</h4>
                                <ul className="space-y-1 text-sm">
                                  {AAU_WEIGHT_CLASSES.map((w) => {
                                    const sub = team1Starters.find((s) => s.primary_weight === w)
                                    return (
                                      <li key={w} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          {formatNationalTeamWeightLabel(w, "aau")}
                                        </span>
                                        <span>{sub ? `${sub.last_name}, ${sub.first_name}` : "—"}</span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold text-[#002147] mb-2">{NHSCA_TEAM_2_LABEL}</h4>
                                <ul className="space-y-1 text-sm">
                                  {AAU_WEIGHT_CLASSES.map((w) => {
                                    const sub = team2Starters.find((s) => s.primary_weight === w)
                                    return (
                                      <li key={w} className="flex justify-between gap-2">
                                        <span className="text-muted-foreground">
                                          {formatNationalTeamWeightLabel(w, "aau")}
                                        </span>
                                        <span>{sub ? `${sub.last_name}, ${sub.first_name}` : "—"}</span>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })()}

                    <div className="space-y-4">
                      {tabWeights.map((weight) => {
                        const weightSubs = tournamentSubs
                          .filter((sub) =>
                            tournamentId === "nhsca"
                              ? nearestNhscaInterestWeightClass(sub.primary_weight) === weight
                              : sub.primary_weight === weight
                          )
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
                                <CardTitle className="text-red-700">
                                  {formatNationalTeamWeightLabel(
                                    weight,
                                    tournamentId === "aau" ? "aau" : tournamentId === "nhsca" ? "nhsca" : "neutral"
                                  )}{" "}
                                  - No Submissions
                                </CardTitle>
                              </CardHeader>
                            </Card>
                          )
                        }

                        return (
                          <Card key={weight}>
                            <CardHeader>
                              <CardTitle>
                                {formatNationalTeamWeightLabel(
                                  weight,
                                  tournamentId === "aau" ? "aau" : tournamentId === "nhsca" ? "nhsca" : "neutral"
                                )}{" "}
                                - {weightSubs.length}{" "}
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
                                    {tournamentId === "nhsca" && (
                                      <TableHead>NHSCA Duals (2 teams)</TableHead>
                                    )}
                                    {tournamentId === "aau" && (
                                      <TableHead>AAU Duals (2 teams)</TableHead>
                                    )}
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {weightSubs.map((sub) => {
                                    const isUpdating = updatingLineupId === sub.id
                                    const row = sub as InterestFormSubmission
                                    const team =
                                      tournamentId === "aau" ? row.aau_duals_team : row.nhsca_duals_team
                                    const starter =
                                      tournamentId === "aau" ? row.aau_duals_starter : row.nhsca_duals_starter
                                    return (
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
                                        {tournamentId === "nhsca" && (
                                          <TableCell>
                                            <div className="flex flex-wrap items-center gap-1">
                                              {team && starter && (
                                                <Badge variant="secondary" className="text-xs">
                                                  {team === "team_1" ? NHSCA_TEAM_1_LABEL : NHSCA_TEAM_2_LABEL} starter
                                                </Badge>
                                              )}
                                              {team && !starter && (
                                                <Badge variant="outline" className="text-xs">
                                                  {team === "team_1" ? NHSCA_TEAM_1_LABEL : NHSCA_TEAM_2_LABEL}
                                                </Badge>
                                              )}
                                              {isUpdating ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                              ) : (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant={team === "team_1" && starter ? "default" : "outline"}
                                                    className="text-xs h-7"
                                                    onClick={() => assignNhscaDualsStarter(row, "team_1")}
                                                  >
                                                    {NHSCA_TEAM_1_LABEL} starter
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant={team === "team_2" && starter ? "default" : "outline"}
                                                    className="text-xs h-7"
                                                    onClick={() => assignNhscaDualsStarter(row, "team_2")}
                                                  >
                                                    {NHSCA_TEAM_2_LABEL} starter
                                                  </Button>
                                                  {(team || starter) && (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="text-xs h-7 text-muted-foreground"
                                                      onClick={() => clearNhscaDualsAssignment(row)}
                                                    >
                                                      Clear
                                                    </Button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </TableCell>
                                        )}
                                        {tournamentId === "aau" && (
                                          <TableCell>
                                            <div className="flex flex-wrap items-center gap-1">
                                              {team && starter && (
                                                <Badge variant="secondary" className="text-xs">
                                                  {team === "team_1" ? NHSCA_TEAM_1_LABEL : NHSCA_TEAM_2_LABEL} starter
                                                </Badge>
                                              )}
                                              {team && !starter && (
                                                <Badge variant="outline" className="text-xs">
                                                  {team === "team_1" ? NHSCA_TEAM_1_LABEL : NHSCA_TEAM_2_LABEL}
                                                </Badge>
                                              )}
                                              {isUpdating ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                              ) : (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant={team === "team_1" && starter ? "default" : "outline"}
                                                    className="text-xs h-7"
                                                    onClick={() => assignAauDualsStarter(row, "team_1")}
                                                  >
                                                    {NHSCA_TEAM_1_LABEL} starter
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant={team === "team_2" && starter ? "default" : "outline"}
                                                    className="text-xs h-7"
                                                    onClick={() => assignAauDualsStarter(row, "team_2")}
                                                  >
                                                    {NHSCA_TEAM_2_LABEL} starter
                                                  </Button>
                                                  {(team || starter) && (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="text-xs h-7 text-muted-foreground"
                                                      onClick={() => clearAauDualsAssignment(row)}
                                                    >
                                                      Clear
                                                    </Button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </TableCell>
                                        )}
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
                                    )
                                  })}
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
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold text-gray-700">Weight Classes</Label>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <div>
                        <Label htmlFor="editPrimaryWeight" className="text-xs text-muted-foreground block mb-1">Primary (lbs)</Label>
                        <Select value={editPrimaryWeight} onValueChange={setEditPrimaryWeight}>
                          <SelectTrigger id="editPrimaryWeight" className="w-[100px]">
                            <SelectValue placeholder="Weight" />
                          </SelectTrigger>
                          <SelectContent>
                            {submissionEditWeightOptions.map((w) => (
                              <SelectItem key={w} value={w}>
                                {formatNationalTeamWeightLabel(w, submissionEditWeightLabelVariant)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="editSecondaryWeight" className="text-xs text-muted-foreground block mb-1">Secondary (lbs, optional)</Label>
                        <Select value={editSecondaryWeight || "none"} onValueChange={(v) => setEditSecondaryWeight(v === "none" ? "" : v)}>
                          <SelectTrigger id="editSecondaryWeight" className="w-[100px]">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {submissionEditWeightOptions.map((w) => (
                              <SelectItem key={w} value={w}>
                                {formatNationalTeamWeightLabel(w, submissionEditWeightLabelVariant)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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

                  {selectedSubmission.tournament_interest.includes("nhsca") && (
                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">NHSCA Duals (2 teams)</Label>
                      <p className="text-xs text-muted-foreground">
                        Assign to Team 1 or Team 2 and mark as starter. Only one starter per weight per team.
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <Label htmlFor="nhscaTeam" className="text-xs text-muted-foreground">Team</Label>
                          <Select
                            value={nhscaTeam || "none"}
                            onValueChange={(v) => setNhscaTeam(v === "none" ? "" : v)}
                          >
                            <SelectTrigger id="nhscaTeam" className="w-[140px] mt-1">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="team_1">{NHSCA_TEAM_1_LABEL}</SelectItem>
                              <SelectItem value="team_2">{NHSCA_TEAM_2_LABEL}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id="nhscaStarter"
                            checked={nhscaStarter}
                            onChange={(e) => setNhscaStarter(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="nhscaStarter" className="text-sm">Starter for this team</Label>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedSubmission.tournament_interest.includes("aau") && (
                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">AAU Scholastic Duals (2 teams)</Label>
                      <p className="text-xs text-muted-foreground">
                        Same as NHSCA: Team 1 / Team 2 and starter per weight (stored separately so NHSCA and AAU do not overwrite each other).
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                        <div>
                          <Label htmlFor="aauTeam" className="text-xs text-muted-foreground">Team</Label>
                          <Select
                            value={aauTeam || "none"}
                            onValueChange={(v) => setAauTeam(v === "none" ? "" : v)}
                          >
                            <SelectTrigger id="aauTeam" className="w-[140px] mt-1">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="team_1">{NHSCA_TEAM_1_LABEL}</SelectItem>
                              <SelectItem value="team_2">{NHSCA_TEAM_2_LABEL}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            id="aauStarter"
                            checked={aauStarter}
                            onChange={(e) => setAauStarter(e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="aauStarter" className="text-sm">Starter for this team</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="flex-wrap gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={() => selectedSubmission && deleteSubmission(selectedSubmission.id)}
                disabled={!selectedSubmission || deletingId === selectedSubmission?.id}
                className="mr-auto"
              >
                {deletingId === selectedSubmission?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
              <div className="flex gap-2">
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
                        nhsca_duals_team: nhscaTeam && nhscaTeam !== "none" ? nhscaTeam : null,
                        nhsca_duals_starter: !!nhscaTeam && nhscaTeam !== "none" && nhscaStarter,
                        aau_duals_team: aauTeam && aauTeam !== "none" ? aauTeam : null,
                        aau_duals_starter: !!aauTeam && aauTeam !== "none" && aauStarter,
                        primary_weight: editPrimaryWeight || selectedSubmission.primary_weight,
                        secondary_weight: editSecondaryWeight || null,
                      })
                    }
                  }}
                  className="bg-[#002147] hover:bg-[#003366]"
                >
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
