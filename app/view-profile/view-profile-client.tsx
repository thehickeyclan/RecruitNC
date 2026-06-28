"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { AthleteDetail } from "@/components/athlete-detail"
import { TournamentResultsDisplay } from "@/components/tournament-results-display"
import { ProfileViewTracker } from "@/components/profile-view-tracker"
import { useAuth } from "@/contexts/auth-context"
import type { PublicAthleteProfile } from "@/lib/load-public-athlete-profile"

type NchsaaResult = { year: number; place: number | null; classification: string; weight_class: string }

type ViewProfileClientProps = {
  id: string
  initialAthlete: PublicAthleteProfile | null
  initialError: string | null
}

export function ViewProfileClient({ id, initialAthlete, initialError }: ViewProfileClientProps) {
  const { user } = useAuth()
  const athlete = initialAthlete
  const error = initialError

  if (error || !athlete) {
    return (
      <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-white/10 bg-[#0f1c2e] p-6">
          <h1 className="text-xl font-bold text-white mb-2">Profile not found</h1>
          <p className="text-sm text-red-400 font-mono mb-4">{error ?? "No data"}</p>
          <div className="flex flex-wrap gap-4">
            <a href={`/view-profile?id=${encodeURIComponent(id)}`} className="text-[#D3B574] underline">
              Try again
            </a>
            <a href="/athletes" className="text-[#D3B574] underline">
              Browse commits
            </a>
          </div>
        </div>
      </main>
    )
  }

  const nchsaaResults = Array.isArray(athlete.nchsaa_profile) ? (athlete.nchsaa_profile as NchsaaResult[]) : []
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
            href="/athletes"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-[#D3B574] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Athletes
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">{athleteName}</h1>
        </div>
      </section>

      <div className="container mx-auto min-w-0 max-w-full px-4 py-8">
        <ProfileViewTracker athleteId={String(athlete.id)} athleteName={athleteName} />
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
