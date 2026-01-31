import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  GraduationCap,
  School,
  Star,
  ArrowLeft,
  Medal,
  Target,
  Instagram,
  ExternalLink,
  Mail,
} from "lucide-react"
import Link from "next/link"
import { AthleteImage } from "@/components/athlete-image"
import { ClubLogoClient } from "@/components/club-logo-client"
import { HighSchoolLogoClient } from "@/components/high-school-logo-client"
import { MatchDataSection } from "@/components/match-data-section-improved"
import { getNhscaResults, getSuper32Results } from "@/lib/tournament-utils"

interface ProspectPageProps {
  params: {
    id: string
  }
}

async function getProspect(id: string) {
  const supabase = await createClient()

  const { data: prospect, error } = await supabase
    .from("athletes")
    .select(`
      id,
      name,
      firstName,
      lastName,
      graduationyear,
      gender,
      weightclass,
      highschool,
      wrestlingClub,
      division,
      photourl,
      achievements,
      bio,
      bio_headline,
      location,
      prospect_ranking,
      recruiting_status,
      is_prospect,
      academic_gpa,
      academic_sat,
      academic_act,
      academic_summary,
      careerRecord,
      socialMedia,
      created_at,
      updated_at,
      super_32_2024_record,
      super_32_2024_placement,
      super_32_2025_record,
      super_32_2025_placement,
      super_32_2023_record,
      super_32_2023_placement,
      nhsca_2024_record,
      nhsca_2024_placement,
      nhsca_2025_record,
      nhsca_2025_placement,
      nhsca_results,
      super32_results,
      super_32_results,
      nationally_ranked_wins,
      college_opens_experience,
      college,
      ncUnitedTeam
    `)
    .eq("id", id)
    .single()

  if (error || !prospect) {
    console.log("[v0] Prospect not found or error:", error)
    return null
  }

  console.log("[v0] Fetched prospect:", {
    id: prospect.id,
    name: prospect.name,
    graduationyear: prospect.graduationyear,
    prospect_ranking: prospect.prospect_ranking,
    prospect_ranking_type: typeof prospect.prospect_ranking,
  })

  if (prospect.college) {
    return null
  }

  return prospect
}

async function getNCHSAAResults(athleteName: string, graduationYear: number) {
  const supabase = await createClient()

  if (!graduationYear || isNaN(graduationYear)) {
    return []
  }

  const { data: results } = await supabase
    .from("wrestling_nchsaa_results")
    .select("*")
    .ilike("wrestler_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4) // Get results from high school years
    .lte("year", graduationYear)
    .order("year", { ascending: false })

  return results || []
}

async function getNHSCAResults(athleteName: string, graduationYear: number) {
  const supabase = await createClient()

  if (!graduationYear || isNaN(graduationYear)) {
    return []
  }

  const { data: results } = await supabase
    .from("wrestling_nhsca_results")
    .select("*")
    .ilike("athlete_name", `%${athleteName}%`)
    .gte("year", graduationYear - 4) // Get results from high school years
    .lte("year", graduationYear)
    .order("year", { ascending: false })

  return results || []
}

async function getHighSchoolClassification(athleteName: string, highSchool: string, graduationYear?: number) {
  const supabase = await createClient()

  if (!athleteName || !highSchool) {
    return null
  }

  // For current athletes (2024+ graduation), use the current classification table
  if (graduationYear && graduationYear >= 2024) {
    // First try to get current classification from the official table
    const { data: currentClassification } = await supabase
      .from("nchsaa_school_classifications")
      .select("division")
      .or(`school_name.ilike.%${highSchool}%,school_name.ilike.%${highSchool.replace(/\s+/g, "%")}%`)
      .limit(1)
      .single()

    if (currentClassification?.division) {
      return currentClassification.division
    }
  }

  // For historical data or fallback, use tournament results to preserve original classifications
  const { data: result } = await supabase
    .from("wrestling_nchsaa_results")
    .select("classification")
    .ilike("wrestler_name", `%${athleteName}%`)
    .ilike("school", `%${highSchool}%`)
    .order("year", { ascending: false })
    .limit(1)
    .single()

  return result?.classification || null
}

export default async function ProspectPage({ params }: ProspectPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/signin?returnTo=${encodeURIComponent(`/prospects/${params.id}`)}`)
  }

  const prospect = await getProspect(params.id)

  if (!prospect) {
    notFound()
  }

  const [nchsaaResults, nhscaResults, highSchoolClassification] = await Promise.all([
    getNCHSAAResults(prospect.name, prospect.graduationyear),
    getNHSCAResults(prospect.name, prospect.graduationyear),
    getHighSchoolClassification(prospect.name, prospect.highschool, prospect.graduationyear),
  ])

  // Use tournament-utils (handles JSON + scalar columns); fall back to table-fetched NHSCA when prospect row has no data
  let effectiveNhsca = getNhscaResults(prospect)
  if (effectiveNhsca.length === 0 && nhscaResults?.length) {
    effectiveNhsca = nhscaResults.map((r: any) => ({
      year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
      placement: String(r.placement ?? r.place ?? ""),
      record: (r.record ?? r.record_text ?? "").toString().trim(),
      weight: r.weight ?? "",
      division: r.division ?? "",
    }))
  }

  const effectiveSuper32 = getSuper32Results(prospect)

  const instagramLink =
    prospect.socialMedia?.instagram ||
    (typeof prospect.socialMedia === "string" && prospect.socialMedia.includes("instagram")
      ? prospect.socialMedia
      : null)

  const parseCareerRecord = (record: string) => {
    if (!record || typeof record !== "string") return { wins: 0, losses: 0, winPercentage: 0 }
    const match = record.match(/(\d+)-(\d+)/)
    if (match) {
      const wins = Number.parseInt(match[1])
      const losses = Number.parseInt(match[2])
      const total = wins + losses
      const winPercentage = total > 0 ? (wins / total) * 100 : 0
      return { wins, losses, winPercentage: Math.round(winPercentage * 10) / 10 }
    }
    return { wins: 0, losses: 0, winPercentage: 0 }
  }

  const careerStats = parseCareerRecord(prospect.careerRecord)
  const totalMatches = careerStats.wins + careerStats.losses
  const stateTitles = nchsaaResults?.filter((r) => r?.place === 1)?.length || 0
  const stateMedals = nchsaaResults?.filter((r) => r?.place <= 3)?.length || 0

  const isStateChampion = stateTitles > 0
  const isStatePlacer = stateMedals > 0
  const isAllAmerican = nhscaResults?.some((r) => r?.placement <= 8) || false

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#03154C] text-white">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-6">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Link href="/prospects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rankings
              </Link>
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
            <div className="relative w-full lg:w-auto flex justify-center lg:justify-start">
              <AthleteImage
                src={prospect.photourl}
                alt={prospect.name}
                className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-xl object-cover border-4 border-white shadow-2xl"
              />
            </div>

            <div className="flex-1 w-full text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4 sm:mb-6 lg:mb-8 px-2 sm:px-0">
                <Badge className="bg-[#BC0B03] hover:bg-red-700 text-white text-sm sm:text-lg lg:text-xl px-3 sm:px-6 lg:px-8 py-1 sm:py-2 font-bold rounded-full shadow-lg">
                  UNCOMMITTED
                </Badge>
                {prospect.ncUnitedTeam === "blue" && (
                  <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-full px-2 sm:px-3 lg:px-4 py-1 sm:py-2 shadow-lg">
                    <img
                      src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/CqLaWvzmjRuOdctL8VovY-NC%20United.png"
                      alt="NC United Blue"
                      className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 object-contain"
                    />
                    <span className="text-[#03154C] font-bold text-xs sm:text-sm lg:text-lg whitespace-nowrap">
                      NC UNITED BLUE
                    </span>
                  </div>
                )}
                {isStateChampion && (
                  <Badge className="bg-[#D3B574] text-[#03154C] text-sm sm:text-lg lg:text-xl px-3 sm:px-4 lg:px-6 py-1 sm:py-2 font-bold rounded-full">
                    STATE CHAMPION
                  </Badge>
                )}
                {isAllAmerican && (
                  <Badge className="bg-[#D3B574] text-[#03154C] text-sm sm:text-lg lg:text-xl px-3 sm:px-4 lg:px-6 py-1 sm:py-2 font-bold rounded-full">
                    ALL-AMERICAN
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-8 text-white mb-4 sm:mb-6 lg:mb-8 px-2 sm:px-0">
                <div className="text-center lg:text-left">
                  <div className="text-white/80 text-xs font-medium uppercase tracking-wide">Graduation Year</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{prospect.graduationyear}</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-white/80 text-xs font-medium uppercase tracking-wide">Weight Class</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{prospect.weightclass}</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-white/80 text-xs font-medium uppercase tracking-wide">Ranking</div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#D3B574]">
                    {prospect.prospect_ranking ? `#${prospect.prospect_ranking}` : "#Unranked"}
                  </div>
                </div>
              </div>

              {instagramLink && (
                <div className="mt-4 sm:mt-6 px-2 sm:px-0">
                  <Button
                    asChild
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-sm sm:text-lg px-4 sm:px-6 py-2 sm:py-3"
                  >
                    <Link
                      href={
                        instagramLink.startsWith("http")
                          ? instagramLink
                          : `https://instagram.com/${instagramLink.replace("@", "")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Instagram className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Follow on Instagram
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#D3B574] mb-4 sm:mb-6 text-center">
              {prospect.bio_headline || `${prospect.name} - ${prospect.graduationyear} Wrestling Prospect`}
            </h2>
            {prospect.bio && (
              <p className="text-lg sm:text-xl leading-relaxed text-gray-700 font-medium text-center px-2 sm:px-0">
                {prospect.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <Card className="shadow-lg border-2 border-gray-100">
              <CardHeader className="bg-[#03154C] text-white">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <School className="h-5 w-5 sm:h-6 sm:w-6" />
                  High School & Academics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    <HighSchoolLogoClient schoolName={prospect.highschool || ""} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-base sm:text-lg lg:text-xl text-[#03154C] truncate">
                      {prospect.highschool}
                    </div>
                    <div className="text-gray-600 text-sm lg:text-base truncate">{prospect.location}</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="h-4 w-4 text-[#D3B574]" />
                    <span className="font-semibold text-[#D3B574] text-sm sm:text-base">Academic Performance</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">GPA</div>
                      {prospect.academic_gpa ? (
                        <div className="text-sm sm:text-lg font-bold text-[#03154C]">
                          {Number(prospect.academic_gpa).toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-gray-400">N/A</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">SAT</div>
                      {prospect.academic_sat ? (
                        <div className="text-sm sm:text-lg font-bold text-[#03154C]">{prospect.academic_sat}</div>
                      ) : (
                        <div className="text-xs sm:text-sm text-gray-400">N/A</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">ACT</div>
                      {prospect.academic_act ? (
                        <div className="text-sm sm:text-lg font-bold text-[#03154C]">{prospect.academic_act}</div>
                      ) : (
                        <div className="text-xs sm:text-sm text-gray-400">N/A</div>
                      )}
                    </div>
                  </div>
                  {prospect.academic_summary && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{prospect.academic_summary}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Clubs & Programs Card */}
            {(prospect.wrestlingClub || prospect.ncUnitedTeam === "blue") && (
              <Card className="shadow-lg border-2 border-gray-100">
                <CardHeader className="bg-[#03154C] text-white">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                    Clubs & Programs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {prospect.ncUnitedTeam === "blue" && (
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-[#D3B574]/10 to-[#D3B574]/5 rounded-lg border-2 border-[#D3B574] shadow-sm">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center p-2 shadow-md flex-shrink-0">
                          <img
                            src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/CqLaWvzmjRuOdctL8VovY-NC%20United.png"
                            alt="NC United Blue"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-lg sm:text-xl text-[#03154C]">NC UNITED BLUE</div>
                          <div className="text-xs sm:text-sm text-gray-600 font-medium">Elite Development Program</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {prospect.wrestlingClub && (
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        <ClubLogoClient clubName={prospect.wrestlingClub} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-lg sm:text-xl text-[#03154C] truncate">
                          {prospect.wrestlingClub}
                        </div>
                        <div className="text-gray-600 text-sm sm:text-lg">Wrestling Club</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Super 32 Performance Card - uses tournament-utils (JSON + scalar columns) */}
            {effectiveSuper32.length > 0 && (
              <Card className="shadow-lg border-2 border-gray-100 bg-[#F7F7F7] lg:col-span-2 xl:col-span-3">
                <CardHeader className="bg-[#03154C] text-white">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Medal className="h-5 w-5 sm:h-6 sm:w-6" />
                    Super 32 Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {effectiveSuper32
                      .sort((a, b) => b.year - a.year)
                      .map((r) => (
                        <div key={r.year} className="p-6 bg-white rounded-lg shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-xl text-[#03154C]">{r.year} Super 32</span>
                            {r.placement && (
                              <Badge className="bg-[#D3B574] text-[#03154C] text-lg sm:text-xl px-4 sm:px-6 py-2 font-bold">
                                {r.placement}
                              </Badge>
                            )}
                          </div>
                          <div className="text-3xl font-bold text-[#BC0B03]">{r.record || "—"}</div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NHSCA Competition Card - uses tournament-utils + fallback to table-fetched results */}
            {effectiveNhsca.length > 0 && (
              <Card className="shadow-lg border-2 border-gray-100 bg-[#F7F7F7] lg:col-span-2 xl:col-span-3">
                <CardHeader className="bg-[#03154C] text-white">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6" />
                    NHSCA Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {effectiveNhsca
                      .sort((a, b) => b.year - a.year)
                      .map((r) => (
                        <div key={r.year} className="p-6 bg-white rounded-lg shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-xl text-[#03154C]">{r.year} NHSCA</span>
                            {r.placement && (
                              <Badge className="bg-[#D3B574] text-[#03154C] text-lg sm:text-xl px-4 sm:px-6 py-2 font-bold">
                                {r.placement}
                              </Badge>
                            )}
                          </div>
                          <div className="text-3xl font-bold text-[#BC0B03]">{r.record || "—"}</div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notable Wins Against Nationally Ranked Opponents Card */}
            {prospect.nationally_ranked_wins && (
              <Card className="shadow-lg border-2 border-gray-100 lg:col-span-2 xl:col-span-3">
                <CardHeader className="bg-[#03154C] text-white">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                    Notable Wins Against Nationally Ranked Opponents
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prospect.nationally_ranked_wins
                      .split("\n")
                      .filter((win) => win.trim())
                      .map((win, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-[#D3B574] rounded-full mt-3 flex-shrink-0"></div>
                          <span className="text-lg text-gray-700 leading-relaxed">{win.trim()}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* College Opens Record & Key Wins Card */}
            {prospect.college_opens_experience && (
              <Card className="shadow-lg lg:col-span-2 xl:col-span-3">
                <CardHeader className="bg-blue-900 text-white">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
                    College Opens Record & Key Wins
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {prospect.college_opens_experience}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Match Data Section */}
          <div className="mt-8">
            <MatchDataSection
              athleteId={prospect.id}
              athleteName={prospect.name}
              graduationYear={prospect.graduationyear}
            />
          </div>

          {/* Centered CTA section at bottom */}
          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="shadow-lg border-2 border-gray-100">
              <CardHeader className="bg-[#03154C] text-white">
                <CardTitle className="text-xl text-center">Interested in this prospect?</CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-[#03154C] text-white text-center">
                <p className="text-white/90 mb-6 leading-relaxed text-lg">
                  Contact information available to verified college coaches.
                </p>
                <Button asChild className="bg-[#BC0B03] hover:bg-red-700 text-white font-bold py-4 px-8 text-lg">
                  <Link href="/coach-portal">
                    <Mail className="h-5 w-5 mr-2" />
                    Access Coach Portal
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
