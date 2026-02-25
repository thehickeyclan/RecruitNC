"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { Crown, Calendar, Trophy, ArrowLeft, Download, Search, Eye, User, FileText, Clock, ArrowRight } from "lucide-react"
import { NCHSAA_2026_ARTICLES } from "./news/articles"
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
  "2A": "bg-[#012ECD]",
  "3A": "bg-[#D3b574]",
  "4A": "bg-[#B91C1C]",
  "5A": "bg-[#6B21A8]",
  "6A": "bg-[#0D9488]",
  "7A": "bg-[#EA580C]",
  "8A": "bg-[#002147]",
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
            <h4 className="text-xl font-semibold text-[#03154c] mb-2">No Results Available</h4>
            <p className="text-slate-600">No {classification} results have been uploaded yet.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {weightClasses.map((weightClass) => (
          <div key={weightClass} className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-lg font-semibold text-[#03154c] mb-3">{weightClass} lbs</h4>
            <div className="space-y-2">
              {data[weightClass]
                .filter((r) => r.place != null && r.place >= 1 && r.place <= maxPlacerPlace)
                .map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge className={getPlaceBadgeColor(result.place)}>
                        {result.place === 1 ? "1st" : result.place === 2 ? "2nd" : result.place === 3 ? "3rd" : result.place ? `${result.place}th` : "-"}
                      </Badge>
                      <div>
                        <div className="font-medium text-[#03154c]">{result.wrestler_name}</div>
                        <div className="text-sm text-slate-600">{result.school}</div>
                      </div>
                    </div>
                    {result.result && <div className="text-sm text-slate-500">{result.result}</div>}
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

      <section className="mb-12 rounded-lg overflow-hidden border-2 border-[#dc2626]" aria-labelledby="tournament-summary">
        <div className="bg-[#dc2626] px-6 py-8 md:py-10">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-white shrink-0" aria-hidden />
            <h2 id="tournament-summary" className="text-2xl font-bold text-white">{displayYear} Tournament Summary</h2>
          </div>
          <p className="text-red-100 mb-8">State championship results and highlights</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">{classifications.length}</div>
              <div className="text-sm font-medium text-red-100">Classifications</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-yellow-400 mb-2">{classifications.length * 14}</div>
              <div className="text-sm font-medium text-red-100">Weight Classes</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stats.totalMedalists}</div>
              <div className="text-sm font-medium text-red-100">Medal Winners</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-blue-300 mb-2">{stats.ncUnitedMedalists ?? "0"}</div>
              <div className="text-sm font-medium text-red-100">NC United Medalists</div>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">{8 * 14 * (classifications.length || 7)}</div>
              <div className="text-sm font-medium text-red-100">State Qualifiers</div>
            </div>
          </div>
        </div>
      </section>

      {displayYear === 2026 && NCHSAA_2026_ARTICLES.length > 0 && (
        <section className="mb-12" aria-labelledby="news-perspective">
          <div className="bg-[#1a2332] text-white rounded-lg px-6 py-5 mb-8">
            <h2 id="news-perspective" className="text-xl font-bold tracking-tight mb-1">2026 State Championship Series</h2>
            <p className="text-red-100 text-sm">Four perspectives on structure, data, and excellence</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {NCHSAA_2026_ARTICLES.map((article, index) => {
              const isHero = index === 0
              const isLast = index === NCHSAA_2026_ARTICLES.length - 1
              const cardContent = (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {article.category && article.categoryBadgeClass && (
                      <span className={`${article.categoryBadgeClass} text-white text-[11px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider`}>
                        {article.category}
                      </span>
                    )}
                    {article.part && <span className="text-xs font-semibold text-slate-500 shrink-0">{article.part}</span>}
                  </div>
                  <h3 className={`font-bold text-[#1a2332] leading-tight mb-2 ${isHero ? "text-xl md:text-2xl line-clamp-3" : "text-lg line-clamp-3"}`}>{article.title}</h3>
                  {article.subtitle && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{article.subtitle}</p>}
                  {article.preview && <p className={`text-slate-500 flex-grow ${isHero ? "text-sm line-clamp-4 mb-4" : "text-sm line-clamp-3 mb-4"}`}>{article.preview}</p>}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-4 h-4 shrink-0" aria-hidden />
                      <span className="font-medium">{article.readTime ?? "—"}</span>
                      {article.date && (
                        <span className="text-slate-400">
                          · {new Date(article.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    {article.published ? (
                      <span className="text-sm font-bold text-red-600 group-hover:text-red-700 flex items-center gap-1">
                        Read More
                        <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden />
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Coming soon</span>
                    )}
                  </div>
                </>
              )}
              const baseClass = "bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full "
              const heroClass = baseClass + "p-6 md:p-8 border-l-4 border-l-red-600 " + (article.published ? "hover:-translate-y-0.5 cursor-pointer group" : "opacity-90")
              const cardClass = baseClass + "p-5 " + (article.published ? "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer group" : "opacity-90")
              const wrapperClass = isHero ? heroClass : cardClass
              const gridClass = isHero ? "lg:col-span-2" : isLast ? "lg:col-span-2" : ""
              if (article.published) {
                return (
                  <a key={article.slug} href={`/nchsaa/${displayYear}/news/${article.slug}`} className={`${wrapperClass} ${gridClass}`}>
                    {cardContent}
                  </a>
                )
              }
              return (
                <article key={article.slug} className={`${wrapperClass} ${gridClass}`}>
                  {cardContent}
                </article>
              )
            })}
          </div>
        </section>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-[#03154c] flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Tournament Brackets
          </CardTitle>
          <CardDescription>Select a division and weight class to view the bracket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#03154c]">Division</label>
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
              <label className="text-sm font-medium text-[#03154c]">Weight Class</label>
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
        <Card className="mb-8 border-2 border-[#03154c] overflow-hidden">
          <CardHeader className="bg-[#03154c] text-white">
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-6 h-6" />
              Most Outstanding Wrestlers
            </CardTitle>
            <CardDescription className="text-slate-300">{displayYear} MOW by division</CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-[#03154c]">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamPointsWinners.map((w) => (
                <div key={w.id} className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#B91C1C] mb-2">{w.division}</div>
                    <div className="text-lg font-semibold text-[#03154c] mb-1">{w.champion_school}</div>
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
          <CardTitle className="text-[#03154c] flex items-center gap-2">
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
              <TabsList className="flex flex-wrap gap-1 w-full">
                {classifications.map((c) => (
                  <TabsTrigger key={c} value={c.toLowerCase().replace("/", "")}>
                    {c}
                  </TabsTrigger>
                ))}
              </TabsList>
              {classifications.map((c) => (
                <TabsContent key={c} value={c.toLowerCase().replace("/", "")} className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#03154c]">{c} State Championship Results</h3>
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
        <Card className="border-2 border-[#012ECD] hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-[#012ECD] to-[#03154c] text-white">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historical Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-slate-600 text-sm mb-4">Browse complete NCHSAA championship history.</p>
            <Link href="/nchsaa/archive">
              <Button variant="outline" className="w-full border-[#012ECD] text-[#012ECD] hover:bg-[#012ECD] hover:text-white">
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
