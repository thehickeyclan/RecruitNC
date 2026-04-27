"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { ArrowLeft, Users, GraduationCap, Scale, Building2, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const DEFAULT_PRIMARY = "#2563eb"
const DEFAULT_SECONDARY = "#0f172a"

type School = {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
}

type Recruit = {
  id: string
  name: string
  graduationyear: number
  weightclass: string | null
  highschool: string | null
  photourl: string | null
  recruiting_status?: string | null
  pipeline_stage?: string | null
}

export default function CollegeMyRecruitsPage() {
  const params = useParams()
  const slug = (params?.slug as string) ?? ""
  const [school, setSchool] = useState<School | null>(null)
  const [recruits, setRecruits] = useState<Recruit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setError("Invalid school")
      setLoading(false)
      return
    }
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/colleges/${encodeURIComponent(slug)}/recruits`, {
          credentials: "include",
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data.error || "Failed to load")
          return
        }
        setSchool(data.school ?? null)
        setRecruits(data.recruits ?? [])
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error && e.name === "AbortError" ? "Request timed out" : "Failed to load recruits")
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [slug])

  const primary = school?.primary_color || DEFAULT_PRIMARY
  const secondary = school?.secondary_color || DEFAULT_SECONDARY
  const schoolName = school?.name ?? "School"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: secondary }}>
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: primary }} />
          <p>Loading {schoolName} recruits…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Unable to load</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/schools">Back to Schools</Link>
              </Button>
              <Button asChild style={{ backgroundColor: primary }}>
                <Link href={`/colleges/${slug}`}>Retry</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f0f0f" }}>
      <header
        className="border-b"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 50%, ${secondary} 100%)`,
          borderColor: "rgba(0,0,0,0.2)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/schools"
                className="flex items-center gap-2 text-black/90 hover:text-black font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Schools
              </Link>
              <div className="h-6 w-px bg-black/30" />
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white flex-shrink-0">
                  {school?.logo_url ? (
                    <Image
                      src={school.logo_url}
                      alt=""
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-xl font-bold text-black flex items-center justify-center w-full h-full">
                      {schoolName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-black">{schoolName}</h1>
                  <p className="text-black/80 text-sm">My Recruits</p>
                </div>
              </div>
            </div>
            <Button
              asChild
              className="bg-black text-white hover:bg-black/90 border-0"
            >
              <Link href={school?.id ? `/schools/${school.id}/portal` : "/admin/schools"}>
                Full portal
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: primary }} />
            Recruits ({recruits.length})
          </h2>
        </div>

        {recruits.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="py-12 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recruits yet.</p>
              <p className="text-sm mt-1">Star athletes in the portal to add them here.</p>
              <Button asChild className="mt-4" style={{ backgroundColor: primary }}>
                <Link href={school?.id ? `/schools/${school.id}/portal` : "/admin/schools"}>
                  Open portal
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recruits.map((r) => (
              <Card key={r.id} className="bg-gray-900 border-gray-700 overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                    {r.photourl ? (
                      <Image
                        src={r.photourl}
                        alt=""
                        fill
                        className="object-cover object-top"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gray-600 flex items-center justify-center w-full h-full">
                        {r.name?.charAt(0) ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/view-profile?id=${encodeURIComponent(r.id)}`}
                      className="font-medium text-white hover:underline block truncate"
                    >
                      {r.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 mt-0.5">
                      {r.graduationyear && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          ’{String(r.graduationyear).slice(-2)}
                        </span>
                      )}
                      {r.weightclass && (
                        <span className="flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          {r.weightclass}
                        </span>
                      )}
                      {r.highschool && (
                        <span className="flex items-center gap-1 truncate" title={r.highschool}>
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.highschool}</span>
                        </span>
                      )}
                    </div>
                    {(r.recruiting_status || r.pipeline_stage) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.pipeline_stage && (
                          <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                            {r.pipeline_stage}
                          </Badge>
                        )}
                        {r.recruiting_status && (
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {r.recruiting_status}
                          </Badge>
                        )}
                      </div>
                    )}
                    <Button asChild size="sm" className="mt-2" style={{ backgroundColor: primary }}>
                      <Link href={`/view-profile?id=${encodeURIComponent(r.id)}`}>
                        View profile
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
