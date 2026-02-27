"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { Crown, Calendar, Trophy, ArrowLeft, Download, Search, Eye, User, FileText, Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { NCHSAA_2026_ARTICLES, type NCHSAAArticle } from "./news/articles"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { TournamentBracketModal } from "@/components/tournament-bracket-modal"

const CLASSIFICATION_ORDER = ["1-4A", "1A/2A", "1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"]

interface TournamentResult {
  id: string
  year: number
  weight_class: string
  classification: string
  place: number
  wrestler_name: string
  school: string
  result: string
  is_forfeit: boolean
}

interface MostOutstandingWrestler {
  id: number
  name: string
  school: string
  division: string
  year: number
  photo_url?: string | null
}

interface TeamPointsWinner {
  id: number
  year: number
  division: string
  champion_school: string
  coach_name: string
  points: number
  tournament_site: string
}

interface ClassificationData {
  [weightClass: string]: TournamentResult[]
}

const DIVISION_BADGE_COLORS: Record<string, string> = {
  "1-4A": "bg-pink-500",
  "1A/2A": "bg-[#32cd32]",
  "1A": "bg-[#32cd32]",
  "2A": "bg-[#003366]",
  "3A": "bg-[#D3b574]",
  "4A": "bg-[#B91C1C]",
  "5A": "bg-[#6B21A8]",
  "6A": "bg-[#0D9488]",
  "7A": "bg-[#EA580C]",
  "8A": "bg-[#003366]",
}

function sortClassifications(classes: string[]): string[] {
  const sorted = [...classes].sort((a, b) => {
    const ia = CLASSIFICATION_ORDER.indexOf(a)
    const ib = CLASSIFICATION_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
  return sorted
}

/** Carousel: 1 hero + 2 smaller cards; prev/next flips which story is featured. Matches home News layout. */
function NCHSAA2026ArticleCarousel({ articles, displayYear }: { articles: NCHSAAArticle[]; displayYear: number }) {
  const [heroIndex, setHeroIndex] = useState(0)
  const hero = articles[heroIndex]
  const sideIndices = [(heroIndex + 1) % articles.length, (heroIndex + 2) % articles.length]
  const sideArticles = sideIndices.map((i) => articles[i])

  const go = (delta: number) => {
    setHeroIndex((prev) => (prev + delta + articles.length) % articles.length)
  }

  if (articles.length === 0) return null

  return (
    <section className="mb-10 sm:mb-12" aria-labelledby="news-perspective">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="bg-[#1a2332] text-white rounded-lg px-4 sm:px-6 py-4 sm:py-5 flex-1 sm:flex-initial">
          <h2 id="news-perspective" className="text-lg sm:text-xl font-bold tracking-tight mb-1">2026 State Championship Series</h2>
          <p className="text-red-100 text-xs sm:text-sm">Three perspectives on structure, data, and excellence</p>
        </div>
        {articles.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              className="rounded-full p-2 border border-slate-300 bg-white shadow-sm hover:bg-slate-50 text-[#003366] transition-colors"
              aria-label="Previous story"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-600">
              {heroIndex + 1} / {articles.length}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              className="rounded-full p-2 border border-slate-300 bg-white shadow-sm hover:bg-slate-50 text-[#003366] transition-colors"
              aria-label="Next story"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Hero — same layout as home: image left, content right on md+ */}
        {hero && hero.published && (
          <Link
            href={`/nchsaa/${displayYear}/news/${hero.slug}`}
            className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="grid min-h-[200px] grid-cols-1 md:grid-cols-5">
              <div className="relative h-48 md:h-auto md:min-h-[220px] md:col-span-2">
                {hero.image ? (
                  <Image
                    src={hero.image}
                    alt=""
                    fill
                    className={`object-cover transition-transform group-hover:scale-[1.02] ${hero.imagePosition === "top" ? "object-top" : ""}`}
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-100" aria-hidden>
                    <FileText className="h-12 w-12 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center p-6 md:col-span-3">
                {hero.category && (
                  <span className={`mb-2 inline-block self-start rounded px-2 py-0.5 text-xs font-medium text-white ${hero.categoryBadgeClass ?? "bg-[#1a2332]"}`}>
                    {hero.category}
                  </span>
                )}
                <h3 className="mb-2 text-xl font-bold text-[#003366] group-hover:underline md:text-2xl">{hero.title}</h3>
                {hero.subtitle && <p className="mb-3 line-clamp-2 text-sm text-slate-600">{hero.subtitle}</p>}
                {hero.preview && <p className="mb-3 line-clamp-2 text-sm text-slate-500">{hero.preview}</p>}
                <span className="inline-flex items-center text-sm font-medium text-[#003366]">Read article →</span>
              </div>
            </div>
          </Link>
        )}

        {/* Two smaller cards — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {sideArticles.filter((a) => a.published).map((article) => (
            <Link
              key={article.slug}
              href={`/nchsaa/${displayYear}/news/${article.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-36 w-full shrink-0">
                {article.image ? (
                  <Image
                    src={article.image}
                    alt=""
                    fill
                    className={`object-cover transition-transform group-hover:scale-[1.02] ${article.imagePosition === "top" ? "object-top" : ""}`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-100" aria-hidden>
                    <FileText className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                {article.category && (
                  <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-medium text-white ${article.categoryBadgeClass ?? "bg-[#1a2332]"}`}>
                    {article.category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h4 className="mb-1 line-clamp-2 font-semibold text-[#003366] group-hover:underline">{article.title}</h4>
                {article.subtitle && <p className="line-clamp-2 text-xs text-slate-600 mb-2">{article.subtitle}</p>}
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100">
                  {article.readTime && <span className="text-xs text-slate-500">{article.readTime}</span>}
                  <span className="text-sm font-medium text-[#003366]">Read article →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function NCHSAAYearResultsClient({
  displayYear,
  yearParam,
}: {
  displayYear: number
  yearParam: string
}) {
  const [tournamentData, setTournamentData] = useState<Record<string, ClassificationData>>({})
  const [classifications, setClassifications] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalMedalists: 0, ncUnitedMedalists: 0 })
  const [mostOutstandingWrestlers, setMostOutstandingWrestlers] = useState<MostOutstandingWrestler[]>([])
  const [teamPointsWinners, setTeamPointsWinners] = useState<TeamPointsWinner[]>([])
  const [bracketModal, setBracketModal] = useState({ isOpen: false, weightClass: "", classification: "" })
  const [selectedDivision, setSelectedDivision] = useState("")
  const [selectedWeight, setSelectedWeight] = useState("")
  const [debug, setDebug] = useState<{
    yearParam: string
    displayYear: number
    resultsRowCount: number
    mowCount: number
    teamPointsCount: number
    classifications: string[]
    error: string | null
  } | null>(null)

  const openBracketModal = (classification: string, weightClass: string) => {
    setBracketModal({ isOpen: true, weightClass, classification })
  }
  const closeBracketModal = () => {
    setBracketModal({ isOpen: false, weightClass: "", classification: "" })
  }

  useEffect(() => {
    const FETCH_TIMEOUT_MS = 15000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Check your connection and try again.")), FETCH_TIMEOUT_MS)
    )

    const fetchTournamentData = async () => {
      try {
        await Promise.race([
          (async () => {
            const { data: results, error } = await supabase
              .from("wrestling_nchsaa_results")
              .select("*")
              .eq("year", displayYear)
              .order("classification")
              .order("weight_class")
              .order("place")

            if (error) {
              console.error("[RecruitNC] NCHSAA fetch error:", error instanceof Error ? error.message : String(error), error)
              setDebug({
                yearParam,
                displayYear,
                resultsRowCount: 0,
                mowCount: 0,
                teamPointsCount: 0,
                classifications: [],
                error: error.message ?? String(error),
              })
              return
            }

            const { data: mowResults, error: mowError } = await supabase
              .from("most_outstanding_wrestlers")
              .select("*")
              .eq("year", displayYear)
              .order("division")

            let mowCount = 0
            if (!mowError && mowResults?.length) {
              const uniqueMOW =
                mowResults?.reduce((acc: MostOutstandingWrestler[], current) => {
                  if (!acc.find((item) => item.division === current.division)) acc.push(current)
                  return acc
                }, []) || []
              mowCount = uniqueMOW.length
              setMostOutstandingWrestlers(uniqueMOW)
            }

            const { data: teamPointsResults, error: teamPointsError } = await supabase
              .from("tournament_champions")
              .select("*")
              .eq("year", displayYear)
              .order("division")

            if (!teamPointsError && teamPointsResults?.length) {
              setTeamPointsWinners(teamPointsResults || [])
            }

            const groupedData: Record<string, ClassificationData> = {}
            let totalMedalists = 0
            let ncUnitedCount = 0
            const maxPlacerPlace = displayYear >= 2026 ? 4 : 6
            results?.forEach((result: TournamentResult) => {
              const classification = result.classification
              const weightClass = result.weight_class
              if (!groupedData[classification]) groupedData[classification] = {}
              if (!groupedData[classification][weightClass]) groupedData[classification][weightClass] = []
              groupedData[classification][weightClass].push(result)
              if (result.place >= 1 && result.place <= maxPlacerPlace) totalMedalists++
              if (result.school?.toLowerCase().includes("nc united") || result.school?.toLowerCase().includes("ncunited")) {
                ncUnitedCount++
              }
            })

            setTournamentData(groupedData)
            const sortedClasses = sortClassifications(Object.keys(groupedData))
            setClassifications(sortedClasses)
            setStats({ totalMedalists, ncUnitedMedalists: ncUnitedCount })
            setDebug({
              yearParam,
              displayYear,
              resultsRowCount: results?.length ?? 0,
              mowCount,
              teamPointsCount: teamPointsResults?.length ?? 0,
              classifications: sortedClasses,
              error: null,
            })
          })(),
          timeoutPromise,
        ])
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e)
        console.error("[RecruitNC] NCHSAA page error:", errMsg, e)
        setDebug({
          yearParam,
          displayYear,
          resultsRowCount: 0,
          mowCount: 0,
          teamPointsCount: 0,
          classifications: [],
          error: errMsg,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTournamentData()
  }, [displayYear, yearParam])

  const getPlaceBadgeColor = (place: number) => {
    switch (place) {
      case 1: return "bg-yellow-500 text-white"
      case 2: return "bg-gray-400 text-white"
      case 3: return "bg-amber-600 text-white"
      case 4: return "bg-blue-500 text-white"
      case 5: return "bg-green-500 text-white"
      case 6: return "bg-purple-500 text-white"
      default: return "bg-gray-200 text-gray-800"
    }
  }

  const maxPlacerPlace = displayYear >= 2026 ? 4 : 6

  const renderClassificationResults = (classification: string, data: ClassificationData) => {
    const weightClasses = Object.keys(data).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

    if (weightClasses.length === 0) {
      return (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-lg border border-gray-200">
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-[#003366] mb-2">No Results Available</h4>
            <p className="text-slate-600">No {classification} results have been uploaded yet.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        {weightClasses.map((weightClass) => (
          <div key={weightClass} className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
            <h4 className="text-base sm:text-lg font-semibold text-[#003366] mb-2 sm:mb-3">{weightClass} lbs</h4>
            <div className="space-y-2">
              {data[weightClass]
                .filter((r) => r.place != null && r.place >= 1 && r.place <= maxPlacerPlace)
                .map((result, index) => (
                  <div key={index} className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <Badge className={`${getPlaceBadgeColor(result.place)} shrink-0`}>
                        {result.place === 1 ? "1st" : result.place === 2 ? "2nd" : result.place === 3 ? "3rd" : result.place ? `${result.place}th` : "-"}
                      </Badge>
                      <div className="min-w-0">
                        <div className="font-medium text-[#003366] truncate">{result.wrestler_name}</div>
                        <div className="text-xs sm:text-sm text-slate-600 truncate">{result.school}</div>
                      </div>
                    </div>
                    {result.result && <div className="text-xs sm:text-sm text-slate-500 shrink-0 hidden sm:block">{result.result}</div>}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B91C1C] mx-auto mb-4" />
          <p className="text-slate-600">Loading {displayYear} NCHSAA Results...</p>
        </div>
      </div>
    )
  }

  const weightClasses = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"]

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/nchsaa">
          <Button variant="outline" size="sm" className="border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
        </Link>
      </div>

      {displayYear === 2026 && NCHSAA_2026_ARTICLES.length > 0 && (
        <NCHSAA2026ArticleCarousel articles={NCHSAA_2026_ARTICLES} displayYear={displayYear} />
      )}

      <section className="mb-8 sm:mb-12 rounded-lg overflow-hidden border-2 border-[#C20017]" aria-labelledby="tournament-summary">
        <div className="bg-[#C20017] px-4 sm:px-6 py-6 sm:py-8 md:py-10">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white shrink-0" aria-hidden />
            <h2 id="tournament-summary" className="text-xl sm:text-2xl font-bold text-white">{displayYear} Tournament Summary</h2>
          </div>
          <p className="text-white/90 text-sm mb-6 sm:mb-8">State championship results and highlights</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2">{classifications.length}</div>
              <div className="text-xs sm:text-sm font-medium text-white/90">Classifications</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-yellow-300 mb-1 sm:mb-2">{classifications.length * 14}</div>
              <div className="text-xs sm:text-sm font-medium text-white/90">Weight Classes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2">{stats.totalMedalists}</div>
              <div className="text-xs sm:text-sm font-medium text-white/90">Medal Winners</div>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1 sm:mb-2">{8 * 14 * (classifications.length || 7)}</div>
              <div className="text-xs sm:text-sm font-medium text-white/90">State Qualifiers</div>
            </div>
          </div>
        </div>
      </section>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-[#003366] flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Tournament Brackets
          </CardTitle>
          <CardDescription>Select a division and weight class to view the bracket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#003366]">Division</label>
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger className="border-[#B91C1C]">
                  <SelectValue placeholder="Choose division..." />
                </SelectTrigger>
                <SelectContent>
                  {classifications.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#003366]">Weight Class</label>
              <Select value={selectedWeight} onValueChange={setSelectedWeight} disabled={!selectedDivision}>
                <SelectTrigger className="border-[#B91C1C]">
                  <SelectValue placeholder="Choose weight..." />
                </SelectTrigger>
                <SelectContent>
                  {weightClasses.map((w) => (
                    <SelectItem key={w} value={w}>{w} lbs</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => selectedDivision && selectedWeight && openBracketModal(selectedDivision, selectedWeight)}
              disabled={!selectedDivision || !selectedWeight}
              className="bg-[#B91C1C] hover:bg-[#7F1D1D] text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Bracket
            </Button>
            <Button variant="outline" onClick={() => { setSelectedDivision(""); setSelectedWeight(""); }} className="border-[#B91C1C] text-[#B91C1C]">
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {mostOutstandingWrestlers.length > 0 && (
        <Card className="mb-8 border-2 border-[#003366] overflow-hidden">
          <CardHeader className="bg-[#003366] text-white">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-6 h-6" />
              Most Outstanding Wrestlers
            </CardTitle>
            <CardDescription className="text-slate-300">{displayYear} MOW by division</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 bg-[#003366]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {mostOutstandingWrestlers.map((mow) => (
                <div key={mow.id} className="bg-white/5 p-4 rounded-lg border border-white/20">
                  <div className="text-center">
                    {mow.photo_url ? (
                      <div className="relative w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border border-white bg-white">
                        <Image
                          src={mow.photo_url}
                          alt={mow.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                          unoptimized={!mow.photo_url.startsWith("/")}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full border border-white bg-white/10 flex items-center justify-center">
                        <User className="w-12 h-12 text-amber-400" />
                      </div>
                    )}
                    <div className="text-2xl font-bold text-[#D3b574] mb-2">{mow.division}</div>
                    <div className="text-lg font-semibold text-white mb-1">{mow.name}</div>
                    <div className="text-sm text-slate-300">{mow.school}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {teamPointsWinners.length > 0 && (
        <Card className="mb-8 border-2 border-[#B91C1C]">
          <CardHeader className="bg-gradient-to-r from-[#B91C1C] to-[#7F1D1D] text-white">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Team Points Champions
            </CardTitle>
            <CardDescription className="text-red-100">{displayYear} team points by division</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {teamPointsWinners.map((w) => (
                <div key={w.id} className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#B91C1C] mb-2">{w.division}</div>
                    <div className="text-lg font-semibold text-[#003366] mb-1">{w.champion_school}</div>
                    <div className="text-sm text-slate-600 mb-1">Coach: {w.coach_name}</div>
                    <div className="text-lg font-bold text-[#B91C1C]">{w.points} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-[#003366] flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Results by Classification
          </CardTitle>
          <CardDescription>{displayYear} NCHSAA State Championship results</CardDescription>
        </CardHeader>
        <CardContent>
          {classifications.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No results for {displayYear} yet. Upload data via Admin → NCHSAA State Results Upload.
            </div>
          ) : (
            <Tabs defaultValue={classifications[0]?.toLowerCase().replace("/", "") ?? "4a"} className="w-full">
              <TabsList className="flex flex-wrap gap-1.5 w-full h-auto p-1.5 sm:p-1 bg-slate-100">
                {classifications.map((c) => (
                  <TabsTrigger key={c} value={c.toLowerCase().replace("/", "")} className="text-xs sm:text-sm px-2.5 py-2 sm:px-3 sm:py-1.5 data-[state=active]:bg-white">
                    {c}
                  </TabsTrigger>
                ))}
              </TabsList>
              {classifications.map((c) => (
                <TabsContent key={c} value={c.toLowerCase().replace("/", "")} className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#003366]">{c} State Championship Results</h3>
                    <Badge className={DIVISION_BADGE_COLORS[c] || "bg-gray-500"}>{c}</Badge>
                  </div>
                  {renderClassificationResults(c, tournamentData[c] || {})}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-2 border-[#003366] hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-[#003366] to-[#003366] text-white">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historical Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-slate-600 text-sm mb-4">Browse complete NCHSAA championship history.</p>
            <Link href="/nchsaa/archive">
              <Button variant="outline" className="w-full border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white">
                View Archive
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {debug != null && (
        <details className="mt-6 border border-amber-200 bg-amber-50 rounded-md overflow-hidden">
          <summary className="px-4 py-2 cursor-pointer font-medium text-amber-900 bg-amber-100">
            Debug: NCHSAA {displayYear}
          </summary>
          <pre className="p-4 text-xs text-left overflow-auto max-h-60 bg-white border-t border-amber-200">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </details>
      )}

      <TournamentBracketModal
        isOpen={bracketModal.isOpen}
        onClose={closeBracketModal}
        weightClass={bracketModal.weightClass}
        classification={bracketModal.classification}
        year={displayYear}
      />
    </>
  )
}
