"use client"

// NOTE: This homepage is intentionally PUBLIC and accessible without authentication.
// Do NOT wrap this page with AuthGuard - it must be accessible to all users, including mobile.

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useEffect } from "react"
import "./athletes/flip-card.css"
import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"
import { normalizeAthleteList } from "@/lib/professional-athlete"
import { StoreProductPromotion } from "@/components/store-product-promotion"
import { HomeNewsHighlightsCarousel } from "@/components/home-news-highlights-carousel"
import { FundraisingPlaybookHomeBanner } from "@/components/fundraising-playbook-home-banner"
import { Users, GraduationCap, Trophy, ArrowRight, TrendingUp } from "lucide-react"

type YearFilter = "All" | "2025" | "2026"

// Homepage hero background
const HERO_BACKGROUND_IMAGE = "/hero-banner-nchsaa-2026-arena.png"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  graduationyear: number
  photourl: string
  commitmentPhotoUrl?: string
  weightclass: string
  college_weight_class?: string
  wrestlingclub: string
  achievements: string[]
  team?: string
  wrestlingClub?: string
  club?: string
  gender?: string
  prospect_ranking?: number | string | null
}

export default function HomePage() {
  const [yearFilter, setYearFilter] = useState<YearFilter>("2026")
  const [featuredAthletes, setFeaturedAthletes] = useState<Athlete[]>([])
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
  })
  const [loading, setLoading] = useState(true)
  const [athletesLoading, setAthletesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featuredRankings, setFeaturedRankings] = useState<Athlete[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [latestCommits, setLatestCommits] = useState<Athlete[]>([])
  const [commitsLoading, setCommitsLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedAthletes = async () => {
      try {
        setError(null)
        setAthletesLoading(true)
        const url = yearFilter === "All" ? "/api/featured-athletes" : `/api/featured-athletes?year=${yearFilter}`
        const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" })
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json()
        if (!data.success) throw new Error(data.error || "API returned unsuccessful response")
        setFeaturedAthletes(normalizeAthleteList(Array.isArray(data.athletes) ? data.athletes : []))
      } catch (err) {
        console.error("Error fetching featured athletes:", err)
        setFeaturedAthletes([])
      } finally {
        setAthletesLoading(false)
      }
    }
    fetchFeaturedAthletes()
  }, [yearFilter])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const url = yearFilter === "All" ? "/api/stats" : `/api/stats?year=${yearFilter}`
        const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" })
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json()
        if (!data.success) throw new Error(data.error || "API returned unsuccessful response")
        setStats({
          total: data.stats.totalAthletes || 0,
          male: data.stats.genderBreakdown?.male || 0,
          female: data.stats.genderBreakdown?.female || 0,
        })
      } catch (err) {
        console.error("Error fetching stats:", err)
        setStats({ total: 0, male: 0, female: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [yearFilter])

  useEffect(() => {
    const fetchFeaturedRankings = async () => {
      try {
        setRankingsLoading(true)
        const [response2026, response2027] = await Promise.all([
          fetch(`/api/public-rankings?year=2026&gender=Male&limit=3`, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }),
          fetch(`/api/public-rankings?year=2027&gender=Male&limit=3`, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }),
        ])
        const data2026 = response2026.ok ? await response2026.json() : { rankings: [] }
        const data2027 = response2027.ok ? await response2027.json() : { rankings: [] }
        const mapRankingToAthlete = (r: any) => ({
          id: r.id,
          name: r.name || "Unknown",
          highschool: r.highschool || "",
          graduationyear: r.graduationyear,
          photourl: r.photourl || "",
          prospect_ranking: r.prospect_ranking,
          weightclass: r.weight_display ? String(r.weight_display).replace(/\s*lbs$/i, "").trim() : "",
          achievements: [r.state_championship_summary, r.nhsca_record_display, r.super_32_record_display].filter(Boolean),
        })
        const top2026 = (data2026.rankings || []).slice(0, 3).map(mapRankingToAthlete)
        const top2027 = (data2027.rankings || []).slice(0, 3).map(mapRankingToAthlete)
        setFeaturedRankings([...top2026, ...top2027])
      } catch (err) {
        console.error("Error fetching featured rankings:", err)
        setFeaturedRankings([])
      } finally {
        setRankingsLoading(false)
      }
    }
    fetchFeaturedRankings()
  }, [])

  useEffect(() => {
    const fetchLatestCommits = async () => {
      try {
        setCommitsLoading(true)
        const response = await fetch(`/api/featured-athletes?limit=10`, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" })
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json()
        if (!data.success) throw new Error(data.error || "API returned unsuccessful response")
        setLatestCommits(normalizeAthleteList((data.athletes || []).slice(0, 3)))
      } catch (err) {
        console.error("Error fetching latest commits:", err)
        setLatestCommits([])
      } finally {
        setCommitsLoading(false)
      }
    }
    fetchLatestCommits()
  }, [])

  // Ranking card component for DRY code
  const RankingCard = ({ athlete }: { athlete: Athlete }) => (
    <Link href={`/view-profile?id=${encodeURIComponent(athlete.id)}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f1c2e] to-[#1a2d47] p-1 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#D3B574]/10">
        <div className="rounded-lg bg-[#0A1628] p-4">
          <div className="flex items-center gap-4">
            {athlete.photourl ? (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg ring-2 ring-[#D3B574]/30">
                <Image src={athlete.photourl} alt={athlete.name} fill className="object-cover object-top" />
              </div>
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#13294B] ring-2 ring-[#D3B574]/30">
                <span className="text-xl font-bold text-white/50">{athlete.name?.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white truncate">{athlete.name}</h3>
                {athlete.prospect_ranking && (
                  <span className="flex-shrink-0 rounded bg-[#D3B574] px-2 py-0.5 text-xs font-bold text-[#0A1628]">
                    #{athlete.prospect_ranking}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/60 truncate">{athlete.highschool}</p>
              <p className="text-xs text-[#D3B574]">{athlete.weightclass} lbs</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[#D3B574]" />
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <main className="min-h-screen bg-[#0A1628]">
      <FundraisingPlaybookHomeBanner />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_BACKGROUND_IMAGE}
            alt="NCHSAA Wrestling Championship arena"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/80 to-[#0A1628]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
        </div>

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-5xl font-black tracking-tight text-white md:text-6xl lg:text-7xl">
              Recruit<span className="text-[#D3B574]">NC</span>
            </h1>
            <p className="mb-8 text-lg text-white/80 md:text-xl max-w-xl leading-relaxed">
              The premier destination for tracking North Carolina&apos;s top wrestling prospects, college commitments, and prospect rankings.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/athletes">
                <Button className="h-12 px-6 text-base font-semibold bg-[#BC0B03] text-white hover:bg-[#a00a03] transition-all hover:scale-105">
                  View Commitments
                </Button>
              </Link>
              <Link href="/public-rankings">
                <Button variant="outline" className="h-12 px-6 text-base font-semibold border-2 border-[#D3B574] text-[#D3B574] bg-transparent hover:bg-[#D3B574]/10">
                  Prospect Rankings
                </Button>
              </Link>
              <Link href="/prospects/all">
                <Button className="h-12 px-6 text-base font-semibold bg-[#13294B] text-white hover:bg-[#1a3a5f] transition-all">
                  Browse Prospects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/10 bg-[#0f1c2e]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            <div className="py-8 text-center">
              <div className="text-3xl font-black text-white md:text-4xl">{loading ? "..." : stats.total}</div>
              <div className="mt-1 text-sm text-white/50 uppercase tracking-wider">Total Commits</div>
            </div>
            <div className="py-8 text-center">
              <div className="text-3xl font-black text-[#D3B574] md:text-4xl">{loading ? "..." : stats.male}</div>
              <div className="mt-1 text-sm text-white/50 uppercase tracking-wider">Male Athletes</div>
            </div>
            <div className="py-8 text-center">
              <div className="text-3xl font-black text-[#BC0B03] md:text-4xl">{loading ? "..." : stats.female}</div>
              <div className="mt-1 text-sm text-white/50 uppercase tracking-wider">Female Athletes</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* News Carousel */}
        <HomeNewsHighlightsCarousel />

        {/* Store Promotion */}
        <StoreProductPromotion />

        {/* Features Section */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-white">Explore</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link href="/prospects/all" className="group block">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#BC0B03]/20 to-[#BC0B03]/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-[#BC0B03]/20 hover:border-[#BC0B03]/40">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#BC0B03]/20">
                  <Users className="h-6 w-6 text-[#BC0B03]" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Athlete Profiles</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Detailed profiles including high school, graduation year, college commitment, and achievements.
                </p>
                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[#BC0B03]" />
              </div>
            </Link>

            <Link href="/colleges" className="group block">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#13294B]/40 to-[#13294B]/10 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-[#13294B]/30 hover:border-[#13294B]/50">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#13294B]/40">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">College Insights</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Explore which colleges are recruiting NC wrestlers with breakdown by division and conference.
                </p>
                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </div>
            </Link>

            <Link href="/public-rankings" className="group block">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#D3B574]/20 to-[#D3B574]/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-[#D3B574]/20 hover:border-[#D3B574]/40">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#D3B574]/20">
                  <Trophy className="h-6 w-6 text-[#D3B574]" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Prospect Rankings</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Comprehensive rankings by graduation year, weight class, and wrestling style.
                </p>
                <ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[#D3B574]" />
              </div>
            </Link>
          </div>
        </section>

        {/* Featured Rankings Section */}
        <section className="mb-16">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-[#D3B574]" />
              <h2 className="text-2xl font-bold text-white">Featured Rankings</h2>
            </div>
            <Link href="/public-rankings">
              <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {rankingsLoading ? (
            <div className="py-12 text-center text-white/50">Loading rankings...</div>
          ) : featuredRankings.length > 0 ? (
            <div className="space-y-8">
              {/* Class of 2026 */}
              {featuredRankings.filter((a) => a.graduationyear === 2026).length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-white/80">Class of 2026</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {featuredRankings.filter((a) => a.graduationyear === 2026).map((athlete) => (
                      <RankingCard key={athlete.id} athlete={athlete} />
                    ))}
                  </div>
                </div>
              )}

              {/* Class of 2027 */}
              {featuredRankings.filter((a) => a.graduationyear === 2027).length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-white/80">Class of 2027</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {featuredRankings.filter((a) => a.graduationyear === 2027).map((athlete) => (
                      <RankingCard key={athlete.id} athlete={athlete} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-white/50">No ranked prospects available.</div>
          )}
        </section>

        {/* Latest Commits Section */}
        <section className="mb-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Latest Commits</h2>
            <Link href="/athletes">
              <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {commitsLoading ? (
            <div className="py-12 text-center text-white/50">Loading commits...</div>
          ) : latestCommits.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {latestCommits.map((athlete) => (
                <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-white/50">No recent commits available.</div>
          )}
        </section>

        {/* CTA Banner */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#13294B] to-[#1a3a5f] p-8 md:p-12">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">Submit or Update Information</h2>
                <p className="text-white/70 max-w-lg">
                  Help us keep our database current by submitting new commitments or requesting updates to existing profiles.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link href="/submit-commitment">
                  <Button className="bg-[#BC0B03] text-white hover:bg-[#a00a03]">
                    Submit Commitment
                  </Button>
                </Link>
                <Link href="/request-edit">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    Request Edit
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
