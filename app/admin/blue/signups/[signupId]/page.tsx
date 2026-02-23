"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, User } from "lucide-react"

export default function AdminBlueSignupDetailPage() {
  const params = useParams()
  const signupId = params?.signupId as string
  const [data, setData] = useState<{
    parent_first_name: string
    parent_last_name: string
    parent_email: string
    parent_phone: string | null
    athlete_first_name: string
    athlete_last_name: string
    athlete_graduation_year: number | null
    athlete_high_school: string
    athlete_wrestling_club: string | null
    athlete_weight_class: string | null
    tshirt_size: string
    status: string
    created_at: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!signupId) {
      setLoading(false)
      setError("Missing signup")
      return
    }
    let cancelled = false
    fetch(`/api/admin/blue/signups/${encodeURIComponent(signupId)}`, { credentials: "include" })
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
  }, [signupId])

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
              <CardDescription>{error ?? "Signup not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/admin/blue/subscriptions"><ArrowLeft className="h-4 w-4 mr-2" /> Back to cockpit</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue/subscriptions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">Blue registration</h1>
            <p className="text-sm text-gray-600">What they filled out when they signed up on this platform</p>
          </div>
        </div>

        <Card className="border-t-4 border-t-[#03154C] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Parent / guardian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">First name</p>
                <p className="font-medium">{data.parent_first_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last name</p>
                <p className="font-medium">{data.parent_last_name || "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
              <p className="font-medium">{data.parent_email || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone (cell)</p>
              <p className="font-medium">{data.parent_phone || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-[#D3B574] mb-6">
          <CardHeader>
            <CardTitle>Athlete</CardTitle>
            <CardDescription>High school, club, weight — from the form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">First name</p>
                <p className="font-medium">{data.athlete_first_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last name</p>
                <p className="font-medium">{data.athlete_last_name || "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">High school</p>
              <p className="font-medium">{data.athlete_high_school || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Wrestling club</p>
              <p className="font-medium">{data.athlete_wrestling_club || "—"}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Graduation year</p>
                <p className="font-medium">{data.athlete_graduation_year ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight class</p>
                <p className="font-medium">{data.athlete_weight_class || "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">T-shirt size</p>
              <p className="font-medium">{data.tshirt_size || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Signed up</p>
              <p className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleString() : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
              <p className="font-medium">{data.status === "paid" ? "Paid" : data.status}</p>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" asChild>
          <Link href="/admin/blue/subscriptions">Back to cockpit</Link>
        </Button>
      </div>
    </div>
  )
}
