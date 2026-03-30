"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"

type AthleteRecord = Record<string, unknown>

type NchsaaResult = { year: number; place: number | null; classification: string; weight_class: string }

type NhscaAchievementRow = { year: number; placement: string; record?: string; weight?: string; division?: string }

export default function UnifiedProfilePage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : ""
  const [athlete, setAthlete] = useState<AthleteRecord | null>(null)
  const [nchsaaResults, setNchsaaResults] = useState<NchsaaResult[]>([])
  /** Same NHSCA merge as /api/wrestling-achievements; used when /api/athlete nhsca_results is empty or stale. */
  const [nhscaAchievementResults, setNhscaAchievementResults] = useState<NhscaAchievementRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [debugResponse, setDebugResponse] = useState<{ status: number; body: string } | null>(null)
  const [debug, setDebug] = useState(false)
  useEffect(() => {
    if (typeof window !== "undefined") setDebug(new URLSearchParams(window.location.search).get("debug") === "1")
  }, [])

  useEffect(() => {
    if (!id?.trim()) {
      console.log("[profile-debug] Profile page mount: no id in params", { params: params ?? {} })
      setLoading(false)
      setError("Missing profile id")
      return
    }
    console.log("[profile-debug] Profile page mount", { id })
    const apiUrl = `/api/athlete/${encodeURIComponent(id)}`
    console.log("[profile-debug] Fetching", apiUrl)
    const FETCH_TIMEOUT_MS = 12000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let cancelled = false
    setLoading(true)
    setError(null)
    setDebugResponse(null)

    fetch(apiUrl, { credentials: "include", signal: controller.signal })
      .then(async (res) => {
        const text = await res.text()
        if (!cancelled) setDebugResponse({ status: res.status, body: text })
        console.log("[profile-debug] Response", { status: res.status, ok: res.ok, bodyLength: text.length, bodyPreview: text.slice(0, 200) })
        let data: { ok?: boolean; athlete?: unknown; error?: string } = {}
        try {
          data = JSON.parse(text)
        } catch {
          clearTimeout(timeoutId)
          console.log("[profile-debug] Response not JSON", { status: res.status })
          if (!cancelled) {
            setAthlete(null)
            setError(res.ok ? "Invalid response." : res.status === 500 ? "Server error. Try again." : `Error ${res.status}`)
          }
          return
        }
        if (cancelled) return
        clearTimeout(timeoutId)
        console.log("[profile-debug] Parsed", { ok: data?.ok, hasAthlete: !!data?.athlete, error: data?.error })
        if (data?.ok && data?.athlete) {
          setAthlete(data.athlete as AthleteRecord)
          setError(null)
        } else {
          setAthlete(null)
          setError(data?.error ?? "Profile not found")
        }
      })
      .catch((err) => {
        if (cancelled) return
        clearTimeout(timeoutId)
        console.log("[profile-debug] Fetch failed", { name: err?.name, message: err?.message })
        setAthlete(null)
        setError(err?.name === "AbortError" ? "Request timed out. Refresh or try again." : err?.message ?? "Failed to load profile")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [id])

  useEffect(() => {
    if (!athlete?.name || typeof athlete.name !== "string") {
      setNchsaaResults([])
      setNhscaAchievementResults([])
      return
    }
    let cancelled = false
    const name = (athlete.name as string).trim()
    const wrestlingName = (athlete.wrestling_name as string)?.trim()
    const gradYear = athlete.graduationyear != null ? Number(athlete.graduationyear) : undefined
    const params = new URLSearchParams({ name })
    if (id?.trim()) params.set("athlete_id", id.trim())
    if (wrestlingName && wrestlingName !== name) params.set("wrestling_name", wrestlingName)
    if (gradYear && !isNaN(gradYear)) params.set("graduation_year", String(gradYear))
    fetch(`/api/wrestling-achievements?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { success?: boolean; achievements?: { all_results?: { nchsaa?: any[]; nhsca?: any[] } } }) => {
        if (cancelled) return
        if (!data?.success) {
          setNchsaaResults([])
          setNhscaAchievementResults([])
          return
        }
        const all = data.achievements?.all_results
        const nchsaaRaw = all?.nchsaa
        if (Array.isArray(nchsaaRaw) && nchsaaRaw.length) {
          const mapped: NchsaaResult[] = nchsaaRaw.map((r: any) => ({
            year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || 0,
            place: r.place != null ? Number(r.place) : null,
            classification: (r.division ?? r.classification ?? "").toString(),
            weight_class: (r.weight_class ?? r.weight ?? "").toString(),
          }))
          setNchsaaResults(mapped)
        } else {
          setNchsaaResults([])
        }
        const nhscaRaw = all?.nhsca
        if (Array.isArray(nhscaRaw) && nhscaRaw.length) {
          setNhscaAchievementResults(
            nhscaRaw.map((r: any) => ({
              year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || 0,
              placement: (r.placement ?? "").toString(),
              record: (r.record ?? "").toString(),
              weight: r.weight != null && String(r.weight).trim() !== "" ? String(r.weight) : undefined,
              division: r.division != null && String(r.division).trim() !== "" ? String(r.division) : undefined,
            })),
          )
        } else {
          setNhscaAchievementResults([])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNchsaaResults([])
          setNhscaAchievementResults([])
        }
      })
    return () => { cancelled = true }
  }, [id, athlete?.name, athlete?.graduationyear, athlete?.wrestling_name])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-[#003366] font-medium">Loading profile…</div>
      </div>
    )
  }

  if (error || !athlete) {
    const profileHref = `/unified-profile/${id}`
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h1>
          <p className="text-sm text-red-600 font-mono mb-4">{error ?? "No data"}</p>
          {debug && debugResponse && (
            <div className="mb-4 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-48">
              <div className="font-bold text-gray-700">[profile-debug] API response (status={debugResponse.status})</div>
              <pre className="whitespace-pre-wrap break-all mt-1">{debugResponse.body}</pre>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <a href={profileHref} className="text-[#003366] underline">Try again</a>
            <a href={`${profileHref}?debug=1`} className="text-[#003366] underline">Try again with ?debug=1</a>
            <a href="/prospects/all" className="text-[#003366] underline">View all prospects</a>
          </div>
        </div>
      </div>
    )
  }

  const nhscaFromAthlete = Array.isArray(athlete.nhsca_results) ? athlete.nhsca_results : []
  const nhscaResults =
    nhscaAchievementResults.length > 0 ? nhscaAchievementResults : (nhscaFromAthlete as NhscaAchievementRow[])
  const super32Results = Array.isArray(athlete.super32_results) ? athlete.super32_results : []
  const nationalTeamResults = Array.isArray(athlete.national_team_results) ? athlete.national_team_results : []

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileViewTracker athleteId={athlete.id as string} athleteName={(athlete.name as string) || "Unknown"} />
      <AthleteDetail
        athlete={athlete}
        nchsaaResults={nchsaaResults}
        currentUserId={null}
        tournamentResultsComponent={
          <div className="w-full">
            <TournamentResultsDisplay
              nchsaaResults={nchsaaResults}
              nhscaResults={nhscaResults}
              super32Results={super32Results}
              nationalTeamResults={nationalTeamResults}
              alwaysShowStructure={true}
            />
          </div>
        }
      />
    </div>
  )
}
