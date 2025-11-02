"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, XCircle, Clock, User, Mail, Building, AlertCircle, Loader2, Phone } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PendingCoach {
  id: string
  user_id: string
  email: string
  full_name: string
  first_name: string
  last_name: string
  cell_phone: string
  profile_type: string
  institution: string
  coaching_position: string
  verified_coach: boolean
  verification_status?: string
  created_at: string
  school_id?: string
}

interface School {
  id: string
  name: string
  logo_url: string
  primary_color: string
  secondary_color: string
}

export default function CoachApprovalsPage() {
  const [pendingCoaches, setPendingCoaches] = useState<PendingCoach[]>([])
  const [approvedCoaches, setApprovedCoaches] = useState<PendingCoach[]>([])
  const [rejectedCoaches, setRejectedCoaches] = useState<PendingCoach[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({})
  const [selectedSchools, setSelectedSchools] = useState<{ [key: string]: string }>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchCoaches()
    fetchSchools()
  }, [])

  const fetchSchools = async () => {
    try {
      const response = await fetch("/api/admin/schools")
      if (response.ok) {
        const data = await response.json()
        // Filter out test schools - only production schools should be available
        const customSchools = (data.schools || []).filter((school: any) => !school.is_test)
        setSchools(customSchools)
      }
    } catch (err) {
      console.error("Error fetching schools:", err)
    }
  }

  const fetchCoaches = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/coach-approvals")

      if (!response.ok) {
        throw new Error("Failed to fetch coach approvals")
      }

      const data = await response.json()

      console.log("[v0] Coach approvals data:", data)
      console.log("[v0] Pending coaches:", data.pending)
      console.log("[v0] Pending count:", data.pending?.length || 0)
      console.log("[v0] Approved coaches:", data.approved)
      console.log("[v0] Approved count:", data.approved?.length || 0)
      console.log("[v0] Rejected coaches:", data.rejected)
      console.log("[v0] Rejected count:", data.rejected?.length || 0)

      if (data.pending && data.pending.length > 0) {
        console.log("[v0] First pending coach:", data.pending[0])
      }

      setPendingCoaches(data.pending || [])
      setApprovedCoaches(data.approved || [])
      setRejectedCoaches(data.rejected || [])
    } catch (err) {
      setError("Failed to load coach approval requests")
      console.error("Error fetching coaches:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (coachId: string, action: "approve" | "reject") => {
    try {
      setProcessingId(coachId)
      const response = await fetch("/api/admin/coach-approvals/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId,
          action,
          adminNotes: adminNotes[coachId] || "",
          schoolId: selectedSchools[coachId] || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} coach`)
      }

      toast({
        title: "Success",
        description: `Coach ${action === "approve" ? "approved" : "rejected"} successfully`,
      })

      await fetchCoaches()

      setAdminNotes((prev) => {
        const newNotes = { ...prev }
        delete newNotes[coachId]
        return newNotes
      })

      setSelectedSchools((prev) => {
        const newSchools = { ...prev }
        delete newSchools[coachId]
        return newSchools
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleSchoolUpdate = async (coachId: string, schoolId: string) => {
    try {
      setProcessingId(coachId)
      const response = await fetch("/api/admin/coach-approvals/update-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId,
          schoolId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update school assignment")
      }

      toast({
        title: "Success",
        description: "School assignment updated successfully",
      })

      await fetchCoaches()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AdminHeader />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading coach approval requests...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">College Coach Approvals</h1>
        <p className="text-gray-600">Approve college coaches and assign them to their schools</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCoaches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Coaches</p>
                <p className="text-2xl font-bold text-gray-900">{approvedCoaches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingCoaches.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending College Coach Approvals ({pendingCoaches.length})
            </CardTitle>
            <CardDescription>
              Approve coaches and assign them to their schools for branded portal access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingCoaches.map((coach) => (
              <div key={coach.id} className="border rounded-lg p-6 bg-yellow-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-primary">{coach.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Signed up {new Date(coach.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{coach.email}</span>
                    </div>
                    {coach.cell_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{coach.cell_phone}</span>
                      </div>
                    )}
                    {coach.institution && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{coach.institution}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {coach.coaching_position && (
                      <div className="text-sm">
                        <span className="font-medium">Position:</span>{" "}
                        {coach.coaching_position.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-medium">Profile Type:</span> {coach.profile_type}
                    </div>
                  </div>
                </div>

                {/* School Assignment Section */}
                <div className="border-t pt-4 mt-4 mb-4">
                  <h4 className="font-medium mb-2">Assign School:</h4>
                  <Select
                    value={selectedSchools[coach.id] || ""}
                    onValueChange={(value) =>
                      setSelectedSchools((prev) => ({
                        ...prev,
                        [coach.id]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a school..." />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Assigning a school will brand their portal with the school's logo and colors
                  </p>
                </div>

                {/* Admin Review Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">Admin Review:</h4>
                  <Textarea
                    placeholder="Add notes about this approval (optional)..."
                    value={adminNotes[coach.id] || ""}
                    onChange={(e) =>
                      setAdminNotes((prev) => ({
                        ...prev,
                        [coach.id]: e.target.value,
                      }))
                    }
                    className="mb-4"
                    rows={3}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApproval(coach.id, "approve")}
                      disabled={processingId === coach.id || !selectedSchools[coach.id]}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === coach.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve & Grant Access
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleApproval(coach.id, "reject")}
                      disabled={processingId === coach.id}
                    >
                      {processingId === coach.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                  {!selectedSchools[coach.id] && (
                    <p className="text-sm text-amber-600 mt-2">⚠️ Please select a school before approving</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approved Coaches */}
      {approvedCoaches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approved Coaches ({approvedCoaches.length})</CardTitle>
            <CardDescription>College coaches with access to athlete contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedCoaches.map((coach) => (
                <div key={coach.id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{coach.full_name}</h4>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {coach.email} • {coach.institution || "No institution"}
                      </p>
                      {coach.coaching_position && (
                        <p className="text-xs text-muted-foreground">
                          {coach.coaching_position.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm font-medium">School:</span>
                        <Select
                          value={selectedSchools[coach.id] || coach.school_id || ""}
                          onValueChange={(value) => {
                            setSelectedSchools((prev) => ({
                              ...prev,
                              [coach.id]: value,
                            }))
                            handleSchoolUpdate(coach.id, value)
                          }}
                          disabled={processingId === coach.id}
                        >
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Assign school..." />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {processingId === coach.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Coaches */}
      {rejectedCoaches.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Rejected Coaches ({rejectedCoaches.length})
            </CardTitle>
            <CardDescription>College coaches who were not approved for access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rejectedCoaches.map((coach) => (
                <div key={coach.id} className="border rounded-lg p-4 bg-red-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{coach.full_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {coach.email} • {coach.institution || "No institution"}
                      </p>
                      {coach.coaching_position && (
                        <p className="text-xs text-muted-foreground">
                          {coach.coaching_position.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                      )}
                    </div>
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3 mr-1" />
                      Rejected
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingCoaches.length === 0 && approvedCoaches.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Coach Approvals</h3>
            <p className="text-muted-foreground">
              College coach approval requests will appear here when coaches sign up
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
