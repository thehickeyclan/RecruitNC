"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AdminHeader } from "@/components/admin-header"
import { ClipboardList, Loader2, Search, Eye, Pencil, FileText, RefreshCw } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface ClaimedAthlete {
  id: string
  name: string | null
  highschool: string | null
  graduationyear: number | null
  claimed_at: string | null
  profile_verified: boolean | null
  claimed_by_user_id: string | null
  hs_matches_uploaded?: boolean | null
  admin_reviewed?: boolean | null
}

interface PendingSubmission {
  id: number
  firstname: string | null
  lastname: string | null
  email: string | null
  highschool: string | null
  graduationyear: number | null
  status: string | null
  submitted_at: string | null
}

export default function ProfileInventoryPage() {
  const [claimedAthletes, setClaimedAthletes] = useState<ClaimedAthlete[]>([])
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([])
  const [days, setDays] = useState(365)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const setHsMatches = async (athleteId: string, checked: boolean) => {
    setTogglingId(athleteId)
    try {
      const res = await fetch("/api/admin/profile-inventory/hs-matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId, checked }),
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.details || data.error || "Failed to update")
      setClaimedAthletes((prev) =>
        prev.map((a) => (a.id === athleteId ? { ...a, hs_matches_uploaded: checked } : a)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update HS Matches")
    } finally {
      setTogglingId(null)
    }
  }

  const setAdminReviewed = async (athleteId: string, checked: boolean) => {
    setReviewingId(athleteId)
    try {
      const res = await fetch("/api/admin/profile-inventory/admin-reviewed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId, checked }),
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.details || data.error || "Failed to update")
      setClaimedAthletes((prev) =>
        prev.map((a) => (a.id === athleteId ? { ...a, admin_reviewed: checked } : a)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update Reviewed")
    } finally {
      setReviewingId(null)
    }
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch(`/api/admin/profile-inventory?days=${days}`, { credentials: "include" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load")
      }
      const data = await res.json()
      setClaimedAthletes(data.claimedAthletes || [])
      setPendingSubmissions(data.pendingSubmissions || [])
      if (data.days != null) setDays(data.days)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const searchLower = search.trim().toLowerCase()
  const filteredClaimed = useMemo(() => {
    if (!searchLower) return claimedAthletes
    return claimedAthletes.filter(
      (a) =>
        (a.name || "").toLowerCase().includes(searchLower) ||
        (a.highschool || "").toLowerCase().includes(searchLower),
    )
  }, [claimedAthletes, searchLower])
  const filteredPending = useMemo(() => {
    if (!searchLower) return pendingSubmissions
    const name = (s: PendingSubmission) =>
      `${s.firstname || ""} ${s.lastname || ""}`.trim().toLowerCase()
    return pendingSubmissions.filter(
      (s) =>
        name(s).includes(searchLower) ||
        (s.email || "").toLowerCase().includes(searchLower) ||
        (s.highschool || "").toLowerCase().includes(searchLower),
    )
  }, [pendingSubmissions, searchLower])

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-[#13294B]" />
          User-Created Profiles Inventory
        </h1>
        <p className="text-gray-600">
          All profiles created or claimed by users (last {days} days) and pending submit-profile submissions. Use
          search to find a user by name or email when they say &quot;I created one.&quot;
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchInventory} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
        <Link href="/admin/new-profile-additions">
          <Button variant="outline">New Additions (90 days)</Button>
        </Link>
        <Link href="/admin/submissions-manager">
          <Button variant="outline">Submissions Manager</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
        </div>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>In Athletes (user-created)</CardTitle>
              <CardDescription>
                Profiles in the athletes table with a linked user (claimed_by_user_id set). {filteredClaimed.length} in last {days} days
                {searchLower ? `, ${filteredClaimed.length} match search` : ""}. HS Matches = uploaded; Reviewed = you&apos;ve reviewed and approved (backend only; users always see live).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClaimed.length === 0 ? (
                <p className="text-center py-6 text-gray-500">
                  No claimed/created profiles in this window.
                  {searchLower ? " Try a different search." : " Extend the window or check New Additions (90 days)."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">High School</th>
                        <th className="text-left p-3 font-medium">Grad Year</th>
                        <th className="text-left p-3 font-medium">Added</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">HS Matches</th>
                        <th className="text-left p-3 font-medium">Reviewed</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClaimed.map((a) => (
                        <tr key={a.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{a.name || "—"}</td>
                          <td className="p-3">{a.highschool || "—"}</td>
                          <td className="p-3">{a.graduationyear ?? "—"}</td>
                          <td className="p-3 text-gray-600">
                            {a.claimed_at ? new Date(a.claimed_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-3">
                            {a.profile_verified ? (
                              <Badge className="bg-green-100 text-green-800">Live</Badge>
                            ) : (
                              <Badge variant="secondary">Unpublished</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <Checkbox
                              checked={a.hs_matches_uploaded ?? false}
                              onCheckedChange={(checked) =>
                                setHsMatches(a.id, checked === true)
                              }
                              disabled={togglingId === a.id}
                            />
                            {togglingId === a.id && (
                              <Loader2 className="inline h-4 w-4 ml-1 animate-spin text-gray-400" />
                            )}
                          </td>
                          <td className="p-3">
                            <Checkbox
                              checked={a.admin_reviewed ?? false}
                              onCheckedChange={(checked) =>
                                setAdminReviewed(a.id, checked === true)
                              }
                              disabled={reviewingId === a.id}
                            />
                            {reviewingId === a.id && (
                              <Loader2 className="inline h-4 w-4 ml-1 animate-spin text-gray-400" />
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/athletes/edit/${a.id}`}>
                                <Button size="sm" variant="outline">
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </Link>
                              <Link href={`/unified-profile/${a.id}`} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Submissions (submit-profile form)
              </CardTitle>
              <CardDescription>
                Profiles submitted via the public &quot;Submit Profile&quot; form — not yet in athletes. Approve in
                Submissions Manager to add. {filteredPending.length} total
                {searchLower ? `, ${filteredPending.length} match search` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPending.length === 0 ? (
                <p className="text-center py-6 text-gray-500">
                  No pending submissions.
                  {searchLower ? " Try a different search." : " If a user says they submitted, check Submissions Manager."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">High School</th>
                        <th className="text-left p-3 font-medium">Grad Year</th>
                        <th className="text-left p-3 font-medium">Submitted</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPending.map((s) => (
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">
                            {[s.firstname, s.lastname].filter(Boolean).join(" ") || "—"}
                          </td>
                          <td className="p-3">{s.email || "—"}</td>
                          <td className="p-3">{s.highschool || "—"}</td>
                          <td className="p-3">{s.graduationyear ?? "—"}</td>
                          <td className="p-3 text-gray-600">
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-3">
                            <Badge variant={s.status === "pending" ? "default" : "secondary"}>{s.status || "—"}</Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Link href="/admin/submissions-manager">
                              <Button size="sm" variant="outline">
                                Review in Submissions
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
