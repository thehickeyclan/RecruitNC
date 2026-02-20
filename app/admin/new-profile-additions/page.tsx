"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AdminHeader } from "@/components/admin-header"
import { useToast } from "@/components/ui/use-toast"
import { UserPlus, Loader2, Eye, Pencil, EyeOff, CheckCircle } from "lucide-react"

interface AthleteRow {
  id: string
  name: string | null
  highschool: string | null
  graduationyear: number | null
  claimed_at: string | null
  profile_verified: boolean | null
  photourl: string | null
}

export default function NewProfileAdditionsPage() {
  const [athletes, setAthletes] = useState<AthleteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchAdditions()
  }, [])

  const fetchAdditions = async () => {
    try {
      setLoading(true)
      setError("")
      const res = await fetch("/api/admin/new-profile-additions", { credentials: "include" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load")
      }
      const data = await res.json()
      setAthletes(data.athletes || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load new additions")
    } finally {
      setLoading(false)
    }
  }

  const setVisibility = async (athleteId: string, published: boolean) => {
    try {
      setUpdatingId(athleteId)
      const res = await fetch(`/api/admin/athletes/${athleteId}/profile-visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ published }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update")
      }
      toast({
        title: published ? "Published" : "Unpublished",
        description: published ? "Profile is live again." : "Profile is hidden from public listings.",
      })
      await fetchAdditions()
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update visibility",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <UserPlus className="h-8 w-8 text-[#13294B]" />
          New Profile Additions
        </h1>
        <p className="text-gray-600">
          Profiles created or claimed in the last 90 days. Unpublish to hide from public listings, or edit to update
          details.
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent additions</CardTitle>
          <CardDescription>Unpublish removes from All Prospects and public listings. Owner can still view their profile.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
            </div>
          ) : athletes.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No new profile additions in the last 90 days.</p>
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
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a) => (
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
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {a.profile_verified ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === a.id}
                              onClick={() => setVisibility(a.id, false)}
                            >
                              {updatingId === a.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <EyeOff className="h-4 w-4 mr-1" />
                              )}
                              Unpublish
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === a.id}
                              onClick={() => setVisibility(a.id, true)}
                            >
                              {updatingId === a.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Publish
                            </Button>
                          )}
                          <Link href={`/admin/athletes/edit?id=${encodeURIComponent(a.id)}`}>
                            <Button size="sm" variant="outline">
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Link href={`/view-profile?id=${encodeURIComponent(a.id)}`} target="_blank" rel="noopener noreferrer">
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
    </div>
  )
}
