"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { recruitNcClientLog } from "@/lib/recruitnc-debug-client"
import { useAuth } from "@/contexts/auth-context"

type AthleteRecord = Record<string, unknown>

type NchsaaResult = { year: number; place: number | null; classification: string; weight_class: string }

/**
 * One GET /api/athlete/[id] loads merged NHSCA, NCHSAA (`nchsaa_profile`), Super32, national team — no second client fetch.
 */
export default function UnifiedProfilePage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : ""
  const { user } = useAuth()
  const [athlete, setAthlete] = useState<AthleteRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [debugResponse, setDebugResponse] = useState<{ status: number; body: string } | null>(null)
  const [debug, setDebug] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") setDebug(new URLSearchParams(window.location.search).get("debug") === "1")
  }, [])

  useEffect(() => {
    if (!id?.trim()) {
      setLoading(false)
      setError("Missing profile id")
      return
    }
    const apiUrl = `/api/athlete/${encodeURIComponent(id)}`
    const FETCH_TIMEOUT_MS = 30000
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
        let data: { ok?: boolean; athlete?: unknown; error?: string } = {}
        try {
          data = JSON.parse(text)
        } catch {
          clearTimeout(timeoutId)
          if (!cancelled) {
            setAthlete(null)
            setError(res.ok ? "Invalid response." : res.status === 500 ? "Server error. Try again." : `Error ${res.status}`)
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
    if (!athlete?.id) return
    recruitNcClientLog("unified-profile /api/athlete bundle (client)", {
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
      <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#D3B574]" />
      </main>
    )
  }

  if (error || !athlete) {
    const profileHref = `/unified-profile/${id}`
    return (
      <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-white/10 bg-[#0f1c2e] p-6">
          <h1 className="text-xl font-bold text-white mb-2">Profile not found</h1>
          <p className="text-sm text-red-400 font-mono mb-4">{error ?? "No data"}</p>
          {debug && debugResponse && (
            <div className="mb-4 p-3 rounded-lg border border-white/10 bg-white/5 text-xs font-mono overflow-auto max-h-48 text-white/70">
              <div className="font-bold text-white/90">[RecruitNC] API response (status={debugResponse.status})</div>
              <pre className="whitespace-pre-wrap break-all mt-1">{debugResponse.body}</pre>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <a href={profileHref} className="text-[#D3B574] underline">
              Try again
            </a>
            <a href={`${profileHref}?debug=1`} className="text-[#D3B574] underline">
              Try again with ?debug=1
            </a>
            <a href="/prospects/all" className="text-[#D3B574] underline">
              View all prospects
            </a>
          </div>
        </div>
      </main>
    )
  }

  const nchsaaResults = Array.isArray(athlete.nchsaa_profile)
    ? (athlete.nchsaa_profile as NchsaaResult[])
    : []
  const nhscaResults = Array.isArray(athlete.nhsca_results) ? athlete.nhsca_results : []
  const super32Results = Array.isArray(athlete.super32_results) ? athlete.super32_results : []
  const nationalTeamResults = Array.isArray(athlete.national_team_results) ? athlete.national_team_results : []
  const athleteName = String(athlete.name ?? "Athlete")

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src="/hero-banner-nchsaa-2026-arena.png"
            alt=""
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/90 to-[#0A1628]/80" />
        </div>
        <div className="container relative mx-auto px-4 py-8">
          <Link
            href="/prospects/all"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#D3B574] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Prospects
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">{athleteName}</h1>
        </div>
      </section>

      <div className="container mx-auto min-w-0 max-w-full px-4 py-8">
        <ProfileViewTracker athleteId={athlete.id as string} athleteName={athleteName} />
        <AthleteDetail
          theme="dark"
          athlete={athlete as Parameters<typeof AthleteDetail>[0]["athlete"]}
          nchsaaResults={nchsaaResults.map((r) => ({
            ...r,
            place: r.place ?? 0,
          }))}
          currentUserId={user?.id ?? null}
            tournamentResultsComponent={
            <div className="w-full min-w-0 max-w-full">
              <TournamentResultsDisplay
                nchsaaResults={nchsaaResults}
                nhscaResults={nhscaResults as never[]}
                super32Results={super32Results as never[]}
                nationalTeamResults={nationalTeamResults as never[]}
                alwaysShowStructure={true}
                theme="dark"
              />
            </div>
          }
        />
      </div>
    </main>
  )
}
