"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { useAuth } from "@/contexts/auth-context"
import { recruitNcClientLog } from "@/lib/recruitnc-debug-client"

type AthleteRecord = Record<string, unknown>

type NchsaaResult = { year: number; place: number | null; classification: string; weight_class: string }

/**
 * Profile by ?id= — no dynamic segment, so the document request can complete.
 * Tournament data: single GET /api/athlete/[id] (NHSCA + NCHSAA merge + Super32 + national team on the server).
 *
 * useSearchParams (inside Suspense) avoids a mount race where a separate effect set `id` from
 * window.location after the fetch effect ran with "" and stuck on "Missing id".
 */
function ViewProfileContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")?.trim() ?? ""
  const [athlete, setAthlete] = useState<AthleteRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => Boolean(id))

  useEffect(() => {
    if (!id) {
      setAthlete(null)
      setError("Missing id. Use ?id= athlete-uuid")
      setLoading(false)
      return
    }

    const apiUrl = `/api/athlete/${encodeURIComponent(id)}`
    const FETCH_TIMEOUT_MS = 30000
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(apiUrl, { credentials: "include", signal: controller.signal })
      .then(async (res) => {
        const text = await res.text()
        let data: { ok?: boolean; athlete?: unknown; error?: string } = {}
        try {
          data = JSON.parse(text)
        } catch {
          clearTimeout(timeoutId)
          if (!cancelled) {
            setAthlete(null)
            setError(res.ok ? "Invalid response." : res.status === 500 ? "Server error." : `Error ${res.status}`)
          }
          return
        }
        if (cancelled) return
        clearTimeout(timeoutId)
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
        setAthlete(null)
        setError(err?.name === "AbortError" ? "Request timed out." : err?.message ?? "Failed to load profile")
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
    if (!athlete?.id) return
    recruitNcClientLog("view-profile /api/athlete bundle (client)", {
      athleteIdPrefix: String(athlete.id).slice(0, 8),
      graduationyear: athlete.graduationyear,
      nhscaRows: Array.isArray(athlete.nhsca_results) ? athlete.nhsca_results.length : 0,
      nchsaaRows: Array.isArray(athlete.nchsaa_profile) ? athlete.nchsaa_profile.length : 0,
      super32Rows: Array.isArray(athlete.super32_results) ? athlete.super32_results.length : 0,
      nationalTeamRows: Array.isArray(athlete.national_team_results) ? athlete.national_team_results.length : 0,
    })
  }, [athlete])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-[#002147] font-medium">Loading profile…</div>
      </div>
    )
  }

  if (error || !athlete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h1>
          <p className="text-sm text-red-600 font-mono mb-4">{error ?? "No data"}</p>
          <div className="flex flex-wrap gap-4">
            <a href={`/view-profile?id=${encodeURIComponent(id)}`} className="text-[#002147] underline">
              Try again
            </a>
            <a href="/prospects/all" className="text-[#002147] underline">
              View all prospects
            </a>
          </div>
        </div>
      </div>
    )
  }

  const nchsaaResults = Array.isArray(athlete.nchsaa_profile)
    ? (athlete.nchsaa_profile as NchsaaResult[])
    : []
  const nhscaResults = Array.isArray(athlete.nhsca_results) ? athlete.nhsca_results : []
  const super32Results = Array.isArray(athlete.super32_results) ? athlete.super32_results : []
  const nationalTeamResults = Array.isArray(athlete.national_team_results) ? athlete.national_team_results : []

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileViewTracker athleteId={athlete.id as string} athleteName={(athlete.name as string) || "Unknown"} />
      <AthleteDetail
        athlete={athlete}
        nchsaaResults={nchsaaResults}
        currentUserId={user?.id ?? null}
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

export default function ViewProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="text-[#002147] font-medium">Loading profile…</div>
        </div>
      }
    >
      <ViewProfileContent />
    </Suspense>
  )
}
