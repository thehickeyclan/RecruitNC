"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, User, ExternalLink } from "lucide-react"

type SignupData = {
  parent_first_name: string
  parent_last_name: string
  parent_email: string
  parent_phone: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_graduation_year: number | string
  athlete_high_school: string
  athlete_wrestling_club: string
  athlete_weight_class: string
  tshirt_size: string
  status: string
  created_at: string
}

type FallbackData = {
  parent_name: string
  parent_email: string
  parent_phone: string
  athlete_name: string
  high_school: string
  graduation_year: number | string
  weight_class: string
  wrestling_club: string
  tshirt_size: string
}

export default function AdminBlueMemberDetailPage() {
  const params = useParams()
  const athleteId = params?.athleteId as string
  const [data, setData] = useState<{
    athlete: { id: string; name: string; high_school: string; graduation_year: number | null; weight_class: string; wrestling_club: string }
    signup: SignupData | null
    fallback: FallbackData | null
    payer: { name: string; email: string | null; cell_phone: string | null }
    memberships: { status: string; tshirt_size: string | null; created_at: string }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!athleteId) {
      setLoading(false)
      setError("Missing athlete")
      return
    }
    let cancelled = false
    fetch(`/api/admin/blue/members/${encodeURIComponent(athleteId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return
        if (res.error) {
          setError(res.error)
          setData(null)
        } else {
          setData(res)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [athleteId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#13294B]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
              <CardDescription>{error ?? "Member not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/admin/blue/members-2026"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Blue members</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const signup = data.signup
  const fallback = data.fallback

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue/members-2026">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">Blue registration</h1>
            <p className="text-sm text-gray-600">What they filled out when they signed up</p>
          </div>
        </div>

        <Card className="border-t-4 border-t-[#03154C] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Parent / guardian
            </CardTitle>
            <CardDescription>Contact info from registration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signup ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">First name</p>
                    <p className="font-medium">{signup.parent_first_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last name</p>
                    <p className="font-medium">{signup.parent_last_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="font-medium">{signup.parent_email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone (cell)</p>
                  <p className="font-medium">{signup.parent_phone || "—"}</p>
                </div>
              </>
            ) : fallback ? (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="font-medium">{fallback.parent_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="font-medium">{fallback.parent_email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone (cell)</p>
                  <p className="font-medium">{fallback.parent_phone || "—"}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No parent info on file.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#D3B574] mb-6">
          <CardHeader>
            <CardTitle>Athlete (wrestler)</CardTitle>
            <CardDescription>High school, club, weight — from registration form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {signup ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">First name</p>
                    <p className="font-medium">{signup.athlete_first_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last name</p>
                    <p className="font-medium">{signup.athlete_last_name}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">High school</p>
                  <p className="font-medium">{signup.athlete_high_school}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Wrestling club</p>
                  <p className="font-medium">{signup.athlete_wrestling_club || "—"}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Graduation year</p>
                    <p className="font-medium">{String(signup.athlete_graduation_year)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight class</p>
                    <p className="font-medium">{signup.athlete_weight_class || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">T-shirt size</p>
                  <p className="font-medium">{signup.tshirt_size}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Signed up</p>
                  <p className="font-medium">{signup.created_at ? new Date(signup.created_at).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                  <p className="font-medium">{signup.status === "paid" ? "Paid" : signup.status}</p>
                </div>
              </>
            ) : fallback ? (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="font-medium">{fallback.athlete_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">High school</p>
                  <p className="font-medium">{fallback.high_school}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Wrestling club</p>
                  <p className="font-medium">{fallback.wrestling_club || "—"}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Graduation year</p>
                    <p className="font-medium">{String(fallback.graduation_year)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight class</p>
                    <p className="font-medium">{fallback.weight_class || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">T-shirt size</p>
                  <p className="font-medium">{fallback.tshirt_size || "—"}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No athlete registration form on file.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-[#03154C] hover:bg-[#0a2571]">
            <Link href={`/admin/athletes/edit?id=${encodeURIComponent(athleteId)}`}>
              Full athlete profile <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/blue/members-2026">Back to Blue members</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
