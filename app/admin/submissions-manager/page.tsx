"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Mail,
  Trophy,
  Edit,
  FileText,
  Loader2,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Types
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
  status: string
  created_at: string
  updated_at?: string
  submitter_email: string
}

interface ProfileEditRequest {
  id: string
  athlete_id: string
  athlete_name: string
  athlete_high_school: string
  athlete_college: string
  user_email: string
  user_name: string
  request_type: string
  status: string
  request_data: any
  created_at: string
  reviewed_at?: string | null
  admin_notes?: string | null
}

interface ProfileSubmission {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string | null
  gender: string
  graduationYear: number
  weightClass: string | null
  college_weight_class: string | null
  highSchool: string
  high_school_division: string | null
  wrestling_club: string | null
  location: string | null
  bio: string | null
  bio_headline: string | null
  achievements: string | null
  additional_achievements: string | null
  career_record: string | null
  // Social Media
  instagram: string | null
  twitter: string | null
  facebook: string | null
  // Academics
  gpa: number | null
  sat: number | null
  act: number | null
  academic_summary: string | null
  academic_interest: string | null
  // Media
  highlight_video_url: string | null
  headshot_url: string | null
  // Tournaments
  super_32_2023_record: string | null
  super_32_2023_placement: string | null
  super_32_2024_record: string | null
  super_32_2024_placement: string | null
  super_32_2025_record: string | null
  super_32_2025_placement: string | null
  nhsca_2023_record: string | null
  nhsca_2023_placement: string | null
  nhsca_2024_record: string | null
  nhsca_2024_placement: string | null
  nhsca_2025_record: string | null
  nhsca_2025_placement: string | null
  nationally_ranked_wins: string | null
  college_opens_experience: string | null
  status: "pending" | "approved" | "rejected"
  submitted_at: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  admin_notes?: string | null
}

interface Stats {
  newCommitments: number
  profileEdits: number
  newProfiles: number
  totalPending: number
  approvedCommitments: number
  approvedEdits: number
  approvedProfiles: number
  totalApproved: number
}

export default function SubmissionsManagerPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Data states
  const [commitments, setCommitments] = useState<CommitmentSubmission[]>([])
  const [editRequests, setEditRequests] = useState<ProfileEditRequest[]>([])
  const [profileSubmissions, setProfileSubmissions] = useState<ProfileSubmission[]>([])
  const [athleteSelfEdits, setAthleteSelfEdits] = useState<any[]>([])
  const [stats, setStats] = useState<Stats>({
    newCommitments: 0,
    profileEdits: 0,
    newProfiles: 0,
    totalPending: 0,
    approvedCommitments: 0,
    approvedEdits: 0,
    approvedProfiles: 0,
    totalApproved: 0,
  })

  // Processing states
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({})
  const [athleteData, setAthleteData] = useState<{ [key: string]: any }>({})
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all submission types in parallel
      const [commitmentsRes, editsRes, profilesRes, selfEditsRes] = await Promise.all([
        fetch("/api/admin/commitment-submissions"),
        fetch("/api/admin/edit-requests"),
        fetch("/api/admin/profile-submissions"),
        fetch("/api/admin/athlete-edits"),
      ])

      const [commitmentsData, editsData, profilesData, selfEditsData] = await Promise.all([
        commitmentsRes.json(),
        editsRes.json(),
        profilesRes.json(),
        selfEditsRes.json(),
      ])

      setCommitments(commitmentsData.submissions || [])
      setEditRequests(editsData.requests || [])
      setProfileSubmissions(profilesData.submissions || [])
      setAthleteSelfEdits(selfEditsData.edits || [])

      // Fetch current athlete data for edit requests
      const athleteIds = (editsData.requests || [])
        .filter((r: ProfileEditRequest) => r.status === "pending")
        .map((r: ProfileEditRequest) => r.athlete_id)
      
      if (athleteIds.length > 0) {
        const athleteDataMap: { [key: string]: any } = {}
        await Promise.all(
          athleteIds.map(async (id: string) => {
            try {
              const res = await fetch(`/api/athletes/${id}`)
              if (res.ok) {
                const athlete = await res.json()
                athleteDataMap[id] = athlete
              }
            } catch (err) {
              console.error(`Error fetching athlete ${id}:`, err)
            }
          })
        )
        setAthleteData(athleteDataMap)
      }

      // Calculate stats (excludes self-edits - those are auto-approved, separate tab)
      const pendingCommitments = (commitmentsData.submissions || []).filter(
        (s: CommitmentSubmission) => s.status === "pending"
      ).length
      const pendingEdits = (editsData.requests || []).filter(
        (r: ProfileEditRequest) => r.status === "pending"
      ).length
      const pendingProfiles = (profilesData.submissions || []).filter(
        (p: ProfileSubmission) => p.status === "pending"
      ).length

      const approvedCommitments = (commitmentsData.submissions || []).filter(
        (s: CommitmentSubmission) => s.status === "approved"
      ).length
      const approvedEdits = (editsData.requests || []).filter(
        (r: ProfileEditRequest) => r.status === "approved"
      ).length
      const approvedProfiles = (profilesData.submissions || []).filter(
        (p: ProfileSubmission) => p.status === "approved"
      ).length

      setStats({
        newCommitments: pendingCommitments,
        profileEdits: pendingEdits,
        newProfiles: pendingProfiles,
        totalPending: pendingCommitments + pendingEdits + pendingProfiles,
        approvedCommitments,
        approvedEdits,
        approvedProfiles,
        totalApproved: approvedCommitments + approvedEdits + approvedProfiles,
      })
    } catch (err) {
      console.error("Error fetching submissions:", err)
      setError("Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }

  const handleCommitmentAction = async (id: string, status: string) => {
    try {
      setProcessingId(id)
      const response = await fetch(`/api/admin/commitment-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Commitment ${status}`,
        })
        await fetchAllData()
      } else {
        const errorData = await response.json()
        console.error("Failed to update commitment:", errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to update commitment",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error updating commitment:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update commitment",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditAction = async (id: string, status: string) => {
    try {
      setProcessingId(id)
      const response = await fetch("/api/admin/edit-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          status,
          adminNotes: adminNotes[id] || "",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Edit request ${status}`,
        })
        await fetchAllData()
        setAdminNotes((prev) => {
          const updated = { ...prev }
          delete updated[id]
          return updated
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update edit request",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectSelfEdit = async (edit: any) => {
    try {
      setProcessingId(edit.id)
      const response = await fetch("/api/admin/athlete-edits/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: edit.athlete_id,
          auditLogIds: [edit.id],
          revertChanges: true,
          adminNotes: adminNotes[edit.id] || "Rejected by admin",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Edit rejected and changes reverted",
        })
        await fetchAllData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to reject edit",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error rejecting self-edit:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reject edit",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleProfileAction = async (id: number, action: "approve" | "reject") => {
    try {
      setProcessingId(id.toString())
      const response = await fetch("/api/admin/profile-submissions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: id,
          action,
          adminNotes: adminNotes[id.toString()] || "",
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Profile submission ${action}d`,
        })
        await fetchAllData()
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update profile submission",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const renderEditChanges = (request: ProfileEditRequest) => {
    const current = athleteData[request.athlete_id] || {}
    const requested = request.request_data?.currentData || {}
    const changes: Array<{ field: string; current: string; requested: string }> = []

    // Bio fields
    if (requested.bio) {
      const bio = requested.bio
      if (bio.highSchool) {
        changes.push({
          field: "High School",
          current: current.highschool || current.high_school || "Not set",
          requested: bio.highSchool,
        })
      }
      if (bio.club) {
        changes.push({
          field: "Wrestling Club",
          current: current.wrestlingClub || current.wrestling_club || "Not set",
          requested: bio.club,
        })
      }
      if (bio.weight) {
        changes.push({
          field: "Weight Class",
          current: current.weightclass || current.weight_class || "Not set",
          requested: bio.weight,
        })
      }
      if (bio.cellNumber) {
        changes.push({
          field: "Cell Phone",
          current: current.phone || "Not set",
          requested: bio.cellNumber,
        })
      }
      if (bio.highlightVideo) {
        changes.push({
          field: "Highlight Video",
          current: current.highlight_video_url || "Not set",
          requested: bio.highlightVideo,
        })
      }
      if (bio.other) {
        changes.push({
          field: "Other Bio Info",
          current: "—",
          requested: bio.other,
        })
      }
    }

    // Achievements
    if (requested.achievements) {
      changes.push({
        field: "Achievements",
        current: current.achievements || "Not set",
        requested: requested.achievements,
      })
    }

    // Academics
    if (requested.academics) {
      const academics = requested.academics
      if (academics.gpa) {
        changes.push({
          field: "GPA",
          current: current.academic_gpa ? current.academic_gpa.toString() : "Not set",
          requested: academics.gpa,
        })
      }
      if (academics.sat) {
        changes.push({
          field: "SAT Score",
          current: current.academic_sat ? current.academic_sat.toString() : "Not set",
          requested: academics.sat,
        })
      }
      if (academics.act) {
        changes.push({
          field: "ACT Score",
          current: current.academic_act ? current.academic_act.toString() : "Not set",
          requested: academics.act,
        })
      }
    }

    // Other
    if (requested.other) {
      changes.push({
        field: "Additional Information",
        current: "—",
        requested: requested.other,
      })
    }

    if (changes.length === 0) {
      return (
        <div className="text-sm text-gray-500 italic">No specific changes identified</div>
      )
    }

    return (
      <div className="space-y-3">
        {changes.map((change, idx) => (
          <div key={idx} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
            <div className="font-semibold text-gray-900 mb-2">{change.field}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Current Value</div>
                <div className="text-sm bg-gray-100 p-2 rounded border border-gray-300">
                  {change.current || <span className="text-gray-400 italic">Not set</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Requested Value</div>
                <div className="text-sm bg-blue-50 p-2 rounded border border-blue-300 text-blue-900 font-medium">
                  {change.requested}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRequestTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      achievements: "Achievements/Awards",
      photo: "Profile Photo",
      personal_info: "Personal Information",
      high_school: "High School",
      wrestling_club: "Wrestling Club",
      college: "College Commitment",
      weight_class: "Weight Class",
      graduation_year: "Graduation Year",
      match_record: "Match Record/Stats",
      ranked_athlete_update: "Ranked Athlete Update",
    }
    return labels[type] || "Other Request"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white shadow-lg">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-2">Submissions Manager</h1>
            <p className="text-blue-200">Review and manage all submissions</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading submissions...</span>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NC United Branded Header */}
      <div className="bg-gradient-to-r from-[#13294B] to-[#1a3a5c] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-10 w-10 text-[#C8102E]" />
                <h1 className="text-4xl font-bold">Submissions Manager</h1>
              </div>
              <p className="text-blue-200 text-lg">Review and manage commitments, profile edits, and new athlete submissions</p>
            </div>
            <Button
              onClick={fetchAllData}
              disabled={loading}
              className="bg-[#C8102E] hover:bg-[#a00d25] text-white shadow-md"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh All
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AdminHeader />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-[#C8102E] shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <CardContent className="p-6 bg-gradient-to-br from-white to-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Total Pending</p>
                  <p className="text-4xl font-bold text-[#C8102E]">{stats.totalPending}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <Clock className="h-8 w-8 text-[#C8102E]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <CardContent className="p-6 bg-gradient-to-br from-white to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">New Commitments</p>
                  <p className="text-4xl font-bold text-[#13294B]">{stats.newCommitments}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Trophy className="h-8 w-8 text-[#13294B]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#13294B] shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <CardContent className="p-6 bg-gradient-to-br from-white to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Profile Edits</p>
                  <p className="text-4xl font-bold text-[#13294B]">{stats.profileEdits}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Edit className="h-8 w-8 text-[#13294B]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#FFC72C] shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <CardContent className="p-6 bg-gradient-to-br from-white to-yellow-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">New Profiles</p>
                  <p className="text-4xl font-bold text-[#13294B]">{stats.newProfiles}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <User className="h-8 w-8 text-[#13294B]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different submission types */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-[#13294B] p-1 rounded-lg shadow-md">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#13294B] data-[state=active]:to-[#1a3a5c] data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all"
            >
              📋 Overview
            </TabsTrigger>
            <TabsTrigger
              value="commitments"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#13294B] data-[state=active]:to-[#1a3a5c] data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all"
            >
              🏆 Commitments <Badge className="ml-1 bg-[#C8102E]">{stats.newCommitments}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="edits"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#13294B] data-[state=active]:to-[#1a3a5c] data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all"
            >
              ✏️ Profile Edits <Badge className="ml-1 bg-[#C8102E]">{stats.profileEdits}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="profiles"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#13294B] data-[state=active]:to-[#1a3a5c] data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all"
            >
              👤 New Profiles <Badge className="ml-1 bg-[#FFC72C] text-[#13294B]">{stats.newProfiles}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#13294B] data-[state=active]:to-[#1a3a5c] data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all"
            >
              📜 History <Badge className="ml-1 bg-green-600">{stats.totalApproved}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="self-edits"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#13294B] data-[state=active]:to-[#1a3a5c] data-[state=active]:text-white data-[state=active]:shadow-lg font-semibold transition-all"
            >
              ✏️ Self-Edits <Badge className="ml-1 bg-blue-600">{athleteSelfEdits.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border-t-4 border-t-[#002147]">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-[#002147]">Submission Overview</CardTitle>
                <CardDescription>Quick summary of all pending submissions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {stats.totalPending === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm">No pending submissions to review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.newCommitments > 0 && (
                      <Alert className="border-[#B31B1B] bg-red-50">
                        <Trophy className="h-4 w-4 text-[#B31B1B]" />
                        <AlertDescription>
                          <strong>{stats.newCommitments}</strong> new commitment
                          {stats.newCommitments !== 1 ? "s" : ""} waiting for review
                        </AlertDescription>
                      </Alert>
                    )}
                    {stats.profileEdits > 0 && (
                      <Alert className="border-[#002147] bg-blue-50">
                        <Edit className="h-4 w-4 text-[#002147]" />
                        <AlertDescription>
                          <strong>{stats.profileEdits}</strong> profile edit request
                          {stats.profileEdits !== 1 ? "s" : ""} pending
                        </AlertDescription>
                      </Alert>
                    )}
                    {stats.newProfiles > 0 && (
                      <Alert className="border-[#D4AF37] bg-yellow-50">
                        <User className="h-4 w-4 text-[#D4AF37]" />
                        <AlertDescription>
                          <strong>{stats.newProfiles}</strong> new profile submission
                          {stats.newProfiles !== 1 ? "s" : ""} to review
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* New Commitments Tab */}
          <TabsContent value="commitments" className="space-y-4">
            {commitments.filter((c) => c.status === "pending").length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending commitment submissions</p>
                </CardContent>
              </Card>
            ) : (
              commitments
                .filter((c) => c.status === "pending")
                .map((submission) => (
                  <Card key={submission.id} className="border-l-4 border-l-[#B31B1B]">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-[#002147]">
                            {submission.first_name} {submission.last_name}
                          </CardTitle>
                          <CardDescription>
                            {submission.high_school} → {submission.college}
                          </CardDescription>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Gender</p>
                          <p className="font-medium">{submission.gender}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Class</p>
                          <p className="font-medium">{submission.graduation_year}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Weight</p>
                          <p className="font-medium">{submission.weight_class}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Submitted</p>
                          <p className="font-medium text-sm">
                            {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {submission.club && (
                        <div>
                          <p className="text-sm text-gray-600">Club</p>
                          <p className="font-medium">{submission.club}</p>
                        </div>
                      )}

                      {submission.achievements && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Achievements</p>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {submission.achievements}
                          </p>
                        </div>
                      )}

                      {submission.notes && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Notes</p>
                          <p className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                            {submission.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleCommitmentAction(submission.id, "approved")}
                          disabled={processingId === submission.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === submission.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleCommitmentAction(submission.id, "rejected")}
                          disabled={processingId === submission.id}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Profile Edits Tab */}
          <TabsContent value="edits" className="space-y-4">
            {editRequests.filter((r) => r.status === "pending").length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <Edit className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending edit requests</p>
                </CardContent>
              </Card>
            ) : (
              editRequests
                .filter((r) => r.status === "pending")
                .map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-[#002147]">
                    <CardHeader className="bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-[#002147]">
                            {getRequestTypeLabel(request.request_type)}
                          </CardTitle>
                          <CardDescription>
                            {request.athlete_name} • {request.athlete_high_school} → {request.athlete_college}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          Requested by: {request.user_name} ({request.user_email})
                        </span>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-3">Requested Changes</p>
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          {renderEditChanges(request)}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Admin Notes (optional)
                        </label>
                        <Textarea
                          value={adminNotes[request.id] || ""}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                          }
                          placeholder="Add notes about this request..."
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleEditAction(request.id, "approved")}
                          disabled={processingId === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleEditAction(request.id, "rejected")}
                          disabled={processingId === request.id}
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Link href={`/view-profile?id=${encodeURIComponent(request.athlete_id)}`} target="_blank">
                          <Button variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* New Profiles Tab */}
          <TabsContent value="profiles" className="space-y-4">
            {profileSubmissions.filter((p) => p.status === "pending").length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending profile submissions</p>
                </CardContent>
              </Card>
            ) : (
              profileSubmissions
                .filter((p) => p.status === "pending")
                .map((submission) => (
                  <Card key={submission.id} className="border-l-4 border-l-[#D4AF37]">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-[#002147] text-2xl">
                            {submission.firstName} {submission.lastName}
                          </CardTitle>
                          <CardDescription className="text-base mt-1">
                            {submission.highSchool}
                            {submission.high_school_division && ` (${submission.high_school_division})`}
                            {submission.location && ` • ${submission.location}`}
                          </CardDescription>
                        </div>
                        {getStatusBadge(submission.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase">Gender</p>
                          <p className="font-semibold text-[#002147]">{submission.gender}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase">Class of</p>
                          <p className="font-semibold text-[#002147]">{submission.graduationYear}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase">HS Weight</p>
                          <p className="font-semibold text-[#002147]">{submission.weightClass || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase">College Weight</p>
                          <p className="font-semibold text-[#002147]">{submission.college_weight_class || "Not specified"}</p>
                        </div>
                      </div>

                      {/* Contact & Club Info */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Contact & Training
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-600">Email</p>
                            <p className="font-medium">{submission.email}</p>
                          </div>
                          {submission.phone && (
                            <div>
                              <p className="text-xs text-gray-600">Phone</p>
                              <p className="font-medium">{submission.phone}</p>
                            </div>
                          )}
                          {submission.wrestling_club && (
                            <div>
                              <p className="text-xs text-gray-600">Wrestling Club</p>
                              <p className="font-medium">{submission.wrestling_club}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {(submission.bio_headline || submission.bio) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Bio</h4>
                          {submission.bio_headline && (
                            <p className="font-medium text-[#002147] mb-2">{submission.bio_headline}</p>
                          )}
                          {submission.bio && (
                            <p className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border">
                              {submission.bio}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Achievements */}
                      {(submission.achievements || submission.additional_achievements || submission.career_record) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Wrestling Achievements
                          </h4>
                          <div className="space-y-2">
                            {submission.career_record && (
                              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                                <p className="text-xs text-gray-600">Career Record</p>
                                <p className="font-semibold text-[#002147]">{submission.career_record}</p>
                              </div>
                            )}
                            {submission.achievements && (
                              <div className="bg-gray-50 p-4 rounded-lg border">
                                <p className="text-xs font-medium text-gray-600 mb-1">Main Achievements</p>
                                <p className="text-sm whitespace-pre-wrap">{submission.achievements}</p>
                              </div>
                            )}
                            {submission.additional_achievements && (
                              <div className="bg-gray-50 p-4 rounded-lg border">
                                <p className="text-xs font-medium text-gray-600 mb-1">Additional Achievements</p>
                                <p className="text-sm whitespace-pre-wrap">{submission.additional_achievements}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tournament Results */}
                      {(submission.nhsca_2023_placement || submission.nhsca_2024_placement || submission.nhsca_2025_placement ||
                        submission.super_32_2023_placement || submission.super_32_2024_placement || submission.super_32_2025_placement ||
                        submission.nationally_ranked_wins || submission.college_opens_experience) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Tournament Results</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* NHSCA */}
                            {(submission.nhsca_2023_placement || submission.nhsca_2024_placement || submission.nhsca_2025_placement) && (
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="text-xs font-semibold text-blue-800 mb-2">NHSCA</p>
                                {[
                                  { year: 2025, placement: submission.nhsca_2025_placement, record: submission.nhsca_2025_record },
                                  { year: 2024, placement: submission.nhsca_2024_placement, record: submission.nhsca_2024_record },
                                  { year: 2023, placement: submission.nhsca_2023_placement, record: submission.nhsca_2023_record },
                                ].map(({ year, placement, record }) => (
                                  placement || record ? (
                                    <div key={year} className="text-sm mb-1">
                                      <span className="font-medium">{year}:</span> {placement || "—"} {record && `(${record})`}
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            )}
                            {/* Super 32 */}
                            {(submission.super_32_2023_placement || submission.super_32_2024_placement || submission.super_32_2025_placement) && (
                              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                <p className="text-xs font-semibold text-red-800 mb-2">Super 32</p>
                                {[
                                  { year: 2025, placement: submission.super_32_2025_placement, record: submission.super_32_2025_record },
                                  { year: 2024, placement: submission.super_32_2024_placement, record: submission.super_32_2024_record },
                                  { year: 2023, placement: submission.super_32_2023_placement, record: submission.super_32_2023_record },
                                ].map(({ year, placement, record }) => (
                                  placement || record ? (
                                    <div key={year} className="text-sm mb-1">
                                      <span className="font-medium">{year}:</span> {placement || "—"} {record && `(${record})`}
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            )}
                            {submission.nationally_ranked_wins && (
                              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <p className="text-xs font-semibold text-purple-800 mb-1">Nationally Ranked Wins</p>
                                <p className="text-sm">{submission.nationally_ranked_wins}</p>
                              </div>
                            )}
                            {submission.college_opens_experience && (
                              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <p className="text-xs font-semibold text-green-800 mb-1">College Opens</p>
                                <p className="text-sm">{submission.college_opens_experience}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Academics */}
                      {(submission.gpa || submission.sat || submission.act || submission.academic_summary || submission.academic_interest) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Academics</h4>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="grid grid-cols-3 gap-4 mb-3">
                              {submission.gpa && (
                                <div>
                                  <p className="text-xs text-gray-600">GPA</p>
                                  <p className="font-semibold text-green-800">{submission.gpa}</p>
                                </div>
                              )}
                              {submission.sat && (
                                <div>
                                  <p className="text-xs text-gray-600">SAT</p>
                                  <p className="font-semibold text-green-800">{submission.sat}</p>
                                </div>
                              )}
                              {submission.act && (
                                <div>
                                  <p className="text-xs text-gray-600">ACT</p>
                                  <p className="font-semibold text-green-800">{submission.act}</p>
                                </div>
                              )}
                            </div>
                            {submission.academic_summary && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-600 mb-1">Academic Summary</p>
                                <p className="text-sm">{submission.academic_summary}</p>
                              </div>
                            )}
                            {submission.academic_interest && (
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Academic Interests</p>
                                <p className="text-sm">{submission.academic_interest}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Social Media & Videos */}
                      {(submission.instagram || submission.twitter || submission.facebook || submission.highlight_video_url) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Social Media & Content</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {submission.instagram && (
                              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-lg border">
                                <p className="text-xs text-gray-600">Instagram</p>
                                <p className="font-medium text-sm truncate">@{submission.instagram.replace('@', '')}</p>
                              </div>
                            )}
                            {submission.twitter && (
                              <div className="bg-blue-50 p-3 rounded-lg border">
                                <p className="text-xs text-gray-600">Twitter/X</p>
                                <p className="font-medium text-sm truncate">@{submission.twitter.replace('@', '')}</p>
                              </div>
                            )}
                            {submission.facebook && (
                              <div className="bg-blue-50 p-3 rounded-lg border">
                                <p className="text-xs text-gray-600">Facebook</p>
                                <p className="font-medium text-sm truncate">{submission.facebook}</p>
                              </div>
                            )}
                            {submission.highlight_video_url && (
                              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                <p className="text-xs text-gray-600 mb-1">Highlight Video</p>
                                <a 
                                  href={submission.highlight_video_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  View Video <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Photo */}
                      {submission.headshot_url && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Athlete Photo</h4>
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300">
                            <Image
                              src={submission.headshot_url}
                              alt={`${submission.firstName} ${submission.lastName}`}
                              fill
                              sizes="128px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {/* Admin Notes */}
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Admin Notes (optional)
                        </label>
                        <Textarea
                          value={adminNotes[submission.id.toString()] || ""}
                          onChange={(e) =>
                            setAdminNotes((prev) => ({
                              ...prev,
                              [submission.id.toString()]: e.target.value,
                            }))
                          }
                          placeholder="Add notes about this submission..."
                          rows={2}
                          className="border-gray-300"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          onClick={() => handleProfileAction(submission.id, "approve")}
                          disabled={processingId === submission.id.toString()}
                          className="bg-green-600 hover:bg-green-700 flex-1"
                          size="lg"
                        >
                          {processingId === submission.id.toString() ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Approve & Create Profile
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleProfileAction(submission.id, "reject")}
                          disabled={processingId === submission.id.toString()}
                          variant="destructive"
                          size="lg"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* History Tab - Approved Submissions */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border-t-4 border-t-green-600">
              <CardHeader className="bg-gradient-to-r from-green-50 to-white">
                <CardTitle className="text-[#002147] flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Approved Submissions History
                </CardTitle>
                <CardDescription>
                  View all previously approved commitments, profile edits, and new profile submissions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {stats.totalApproved === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No approved submissions yet</p>
                    <p className="text-sm">Approved submissions will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Approved Commitments */}
                    {stats.approvedCommitments > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-[#002147] mb-4 flex items-center gap-2">
                          <Trophy className="h-5 w-5" />
                          Approved Commitments ({stats.approvedCommitments})
                        </h3>
                        <div className="space-y-3">
                          {commitments
                            .filter((c) => c.status === "approved")
                            .sort((a, b) => {
                              const dateA = a.updated_at && a.updated_at !== a.created_at 
                                ? new Date(a.updated_at).getTime() 
                                : new Date(a.created_at).getTime()
                              const dateB = b.updated_at && b.updated_at !== b.created_at 
                                ? new Date(b.updated_at).getTime() 
                                : new Date(b.created_at).getTime()
                              return dateB - dateA
                            })
                            .map((submission) => (
                              <Card key={submission.id} className="border-l-4 border-l-green-600 bg-green-50/30">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-[#002147]">
                                          {submission.first_name} {submission.last_name}
                                        </h4>
                                        {getStatusBadge(submission.status)}
                                      </div>
                                      <p className="text-sm text-gray-600 mb-1">
                                        {submission.high_school} → {submission.college}
                                      </p>
                                      <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>Class: {submission.graduation_year}</span>
                                        <span>Weight: {submission.weight_class}</span>
                                        <span>
                                          Approved:{" "}
                                          {submission.updated_at && submission.updated_at !== submission.created_at
                                            ? new Date(submission.updated_at).toLocaleDateString()
                                            : new Date(submission.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Approved Edit Requests */}
                    {stats.approvedEdits > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-[#002147] mb-4 flex items-center gap-2">
                          <Edit className="h-5 w-5" />
                          Approved Profile Edits ({stats.approvedEdits})
                        </h3>
                        <div className="space-y-3">
                          {editRequests
                            .filter((r) => r.status === "approved")
                            .sort((a, b) => {
                              const dateA = a.reviewed_at 
                                ? new Date(a.reviewed_at).getTime() 
                                : new Date(a.created_at).getTime()
                              const dateB = b.reviewed_at 
                                ? new Date(b.reviewed_at).getTime() 
                                : new Date(b.created_at).getTime()
                              return dateB - dateA
                            })
                            .map((request) => (
                              <Card key={request.id} className="border-l-4 border-l-green-600 bg-green-50/30">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-[#002147]">
                                          {getRequestTypeLabel(request.request_type)}
                                        </h4>
                                        {getStatusBadge(request.status)}
                                      </div>
                                      <p className="text-sm text-gray-600 mb-1">
                                        {request.athlete_name} • {request.athlete_high_school}
                                        {request.athlete_college && ` → ${request.athlete_college}`}
                                      </p>
                                      <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>Requested by: {request.user_name}</span>
                                        {request.reviewed_at && (
                                          <span>
                                            Approved: {new Date(request.reviewed_at).toLocaleDateString()}
                                          </span>
                                        )}
                                        {!request.reviewed_at && request.created_at && (
                                          <span>
                                            Approved: {new Date(request.created_at).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                      {/* Show Requested Changes - Always Visible */}
                                      {request.request_data && (
                                        <div className="mt-4 pt-4 border-t border-gray-300">
                                          <div className="text-sm font-semibold text-[#002147] mb-3">
                                            Requested Changes:
                                          </div>
                                          {request.request_data?.description && (
                                            <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                                              <div className="text-xs font-medium text-blue-800 mb-1">Description:</div>
                                              <div className="text-sm text-blue-900">{request.request_data.description}</div>
                                            </div>
                                          )}
                                          {request.request_data?.currentData && (
                                            <div className="space-y-3">
                                              {request.request_data.currentData.bio && (
                                                <div className="p-3 bg-gray-50 rounded border">
                                                  <div className="text-xs font-semibold text-gray-700 mb-2">Bio Updates:</div>
                                                  <div className="space-y-1 text-sm">
                                                    {request.request_data.currentData.bio.highSchool && (
                                                      <div><span className="font-medium">High School:</span> {request.request_data.currentData.bio.highSchool}</div>
                                                    )}
                                                    {request.request_data.currentData.bio.club && (
                                                      <div><span className="font-medium">Wrestling Club:</span> {request.request_data.currentData.bio.club}</div>
                                                    )}
                                                    {request.request_data.currentData.bio.weight && (
                                                      <div><span className="font-medium">Weight Class:</span> {request.request_data.currentData.bio.weight}</div>
                                                    )}
                                                    {request.request_data.currentData.bio.cellNumber && (
                                                      <div><span className="font-medium">Cell Phone:</span> {request.request_data.currentData.bio.cellNumber}</div>
                                                    )}
                                                    {request.request_data.currentData.bio.highlightVideo && (
                                                      <div><span className="font-medium">Highlight Video:</span> {request.request_data.currentData.bio.highlightVideo}</div>
                                                    )}
                                                    {request.request_data.currentData.bio.other && (
                                                      <div><span className="font-medium">Other:</span> {request.request_data.currentData.bio.other}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                              {request.request_data.currentData.achievements && (
                                                <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                                                  <div className="text-xs font-semibold text-gray-700 mb-1">Achievements:</div>
                                                  <div className="text-sm whitespace-pre-wrap">{request.request_data.currentData.achievements}</div>
                                                </div>
                                              )}
                                              {request.request_data.currentData.academics && (
                                                <div className="p-3 bg-green-50 rounded border border-green-200">
                                                  <div className="text-xs font-semibold text-gray-700 mb-2">Academic Updates:</div>
                                                  <div className="space-y-1 text-sm">
                                                    {request.request_data.currentData.academics.gpa && (
                                                      <div><span className="font-medium">GPA:</span> {request.request_data.currentData.academics.gpa}</div>
                                                    )}
                                                    {request.request_data.currentData.academics.sat && (
                                                      <div><span className="font-medium">SAT:</span> {request.request_data.currentData.academics.sat}</div>
                                                    )}
                                                    {request.request_data.currentData.academics.act && (
                                                      <div><span className="font-medium">ACT:</span> {request.request_data.currentData.academics.act}</div>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                              {request.request_data.currentData.other && (
                                                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                                                  <div className="text-xs font-semibold text-gray-700 mb-1">Other Information:</div>
                                                  <div className="text-sm whitespace-pre-wrap">{request.request_data.currentData.other}</div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {/* Expandable full JSON view */}
                                          <div className="mt-3">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setExpandedRequests((prev) => {
                                                  const newSet = new Set(prev)
                                                  if (newSet.has(request.id)) {
                                                    newSet.delete(request.id)
                                                  } else {
                                                    newSet.add(request.id)
                                                  }
                                                  return newSet
                                                })
                                              }}
                                              className="text-xs text-gray-600 hover:text-gray-900"
                                            >
                                              {expandedRequests.has(request.id) ? (
                                                <>
                                                  <ChevronUp className="h-3 w-3 mr-1" />
                                                  Hide Full JSON
                                                </>
                                              ) : (
                                                <>
                                                  <ChevronDown className="h-3 w-3 mr-1" />
                                                  Show Full JSON Data
                                                </>
                                              )}
                                            </Button>
                                            {expandedRequests.has(request.id) && (
                                              <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-300">
                                                <pre className="text-xs overflow-auto max-h-96">
                                                  {JSON.stringify(request.request_data, null, 2)}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Link href={`/view-profile?id=${encodeURIComponent(request.athlete_id)}`} target="_blank">
                                        <Button variant="outline" size="sm">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          View
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Approved Profile Submissions */}
                    {stats.approvedProfiles > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-[#002147] mb-4 flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Approved New Profiles ({stats.approvedProfiles})
                        </h3>
                        <div className="space-y-3">
                          {profileSubmissions
                            .filter((p) => p.status === "approved")
                            .sort((a, b) => {
                              const dateA = a.reviewed_at 
                                ? new Date(a.reviewed_at).getTime() 
                                : new Date(a.submitted_at).getTime()
                              const dateB = b.reviewed_at 
                                ? new Date(b.reviewed_at).getTime() 
                                : new Date(b.submitted_at).getTime()
                              return dateB - dateA
                            })
                            .map((submission) => (
                              <Card key={submission.id} className="border-l-4 border-l-green-600 bg-green-50/30">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-[#002147]">
                                          {submission.firstName} {submission.lastName}
                                        </h4>
                                        {getStatusBadge(submission.status)}
                                      </div>
                                      <p className="text-sm text-gray-600 mb-1">
                                        {submission.highSchool}
                                        {submission.location && ` • ${submission.location}`}
                                      </p>
                                      <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>Class: {submission.graduationYear}</span>
                                        {submission.weightClass && <span>Weight: {submission.weightClass}</span>}
                                        {submission.wrestling_club && <span>Club: {submission.wrestling_club}</span>}
                                        <span>
                                          Approved:{" "}
                                          {submission.reviewed_at
                                            ? new Date(submission.reviewed_at).toLocaleDateString()
                                            : new Date(submission.submitted_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {submission.admin_notes && (
                                        <div className="mt-2 text-xs bg-white p-2 rounded border border-gray-200">
                                          <span className="font-medium">Admin Notes: </span>
                                          <span className="text-gray-600">{submission.admin_notes}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Athlete Self-Edits Tab */}
          <TabsContent value="self-edits" className="space-y-6">
            <Card className="border-t-4 border-t-blue-600">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
                <CardTitle className="text-[#002147] flex items-center gap-2">
                  <Edit className="h-6 w-6 text-blue-600" />
                  Athlete Self-Edits
                </CardTitle>
                <CardDescription>
                  Recent profile edits made by athletes. Changes are auto-approved but can be rejected and reverted.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {athleteSelfEdits.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Edit className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No athlete self-edits yet</p>
                    <p className="text-sm">Athlete profile edits will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {athleteSelfEdits.map((edit) => (
                      <Card key={edit.id} className="border-l-4 border-l-blue-600">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-[#002147]">
                                  {edit.athlete?.name || "Unknown Athlete"}
                                </h4>
                                <Badge variant="outline" className="bg-blue-50">
                                  {edit.field_name}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>
                                  <span className="font-medium">Editor:</span>{" "}
                                  {edit.editor
                                    ? `${edit.editor.first_name || ""} ${edit.editor.last_name || ""} (${edit.editor.email || edit.user_id})`.trim()
                                    : edit.user_id}
                                </p>
                                <p>
                                  <span className="font-medium">Changed:</span>{" "}
                                  {new Date(edit.created_at).toLocaleString()}
                                </p>
                                <div className="mt-2 p-2 bg-gray-50 rounded border">
                                  <p className="text-xs text-gray-500 mb-1">Old Value:</p>
                                  <p className="text-sm">{edit.old_value || "(empty)"}</p>
                                  <p className="text-xs text-gray-500 mb-1 mt-2">New Value:</p>
                                  <p className="text-sm font-medium">{edit.new_value || "(empty)"}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRejectSelfEdit(edit)}
                                disabled={processingId === edit.id}
                              >
                                {processingId === edit.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-1" />
                                )}
                                Reject & Revert
                              </Button>
                              <Link href={`/view-profile?id=${encodeURIComponent(edit.athlete_id)}`} target="_blank">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View Profile
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
