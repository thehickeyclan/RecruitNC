"use client"

import { useEffect, useState } from "react"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"

type AthleteRecord = Record<string, unknown>

/**
 * Profile by ?id= — no dynamic segment, so the document request can complete.
 * Use this until GET /unified-profile/[id] stops hanging on Vercel.
 */
export default function ViewProfilePage() {
  const [id, setId] = useState("")
  const [athlete, setAthlete] = useState<AthleteRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const q = params.get("id")?.trim() ?? ""
    setId(q)
  }, [])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError("Missing id. Use ?id= athlete-uuid")
      return
    }
    const apiUrl = `/api/athlete/${encodeURIComponent(id)}`
    const FETCH_TIMEOUT_MS = 12000
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
            <a href={`/view-profile?id=${encodeURIComponent(id)}`} className="text-[#002147] underline">Try again</a>
            <a href="/prospects/all" className="text-[#002147] underline">View all prospects</a>
          </div>
        </div>
      </div>
    )
  }

  const nchsaaResults: Array<{ year: number; place: number | null; classification: string; weight_class: string }> = []
  const nhscaResults: unknown[] = []
  const super32Results: unknown[] = []
  const nationalTeamResults: unknown[] = []

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
