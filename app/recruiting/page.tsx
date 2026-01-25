"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  GraduationCap, 
  Trophy, 
  Calendar, 
  Download, 
  Mail, 
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  BarChart3
} from "lucide-react"

type GenderFilter = "all" | "male" | "female"

interface NCStats {
  total: number
  d1: number
  d2: number
  d3: number
  naia: number
  njcaa: number
}

export default function RecruitingPage() {
  const [selectedGender, setSelectedGender] = useState<GenderFilter>("all")
  const [ncStats, setNcStats] = useState<NCStats>({
    total: 89,
    d1: 17,
    d2: 30,
    d3: 21,
    naia: 9,
    njcaa: 4,
  })
  const [loading, setLoading] = useState(true)

  // NC Class of 2025 data by gender
  const ncData = {
    all: { total: 89, d1: 17, d2: 30, d3: 21, naia: 9, njcaa: 4 },
    male: { total: 66, d1: 16, d2: 22, d3: 16, naia: 3, njcaa: 3 },
    female: { total: 23, d1: 1, d2: 8, d3: 5, naia: 6, njcaa: 1 },
  }

  // National macro data (from the stats table)
  const nationalData = {
    d1OptedIn: { programs: 25, wrestlers: 900, percent: 0.4 },
    d1NotOptedIn: { programs: 50, wrestlers: 1550, percent: 0.6 },
    d2: { programs: 65, wrestlers: 1800, percent: 0.7 },
    d3: { programs: 109, wrestlers: 3000, percent: 1.2 },
    naia: { programs: 100, wrestlers: 1800, percent: 0.7 },
    njcaa: { programs: 100, wrestlers: 2500, percent: 1.0 },
  }

  useEffect(() => {
    // Fetch actual NC stats from API
    const fetchNCStats = async () => {
      try {
        const response = await fetch("/api/direct-dashboard-stats?year=2025")
        if (response.ok) {
          const data = await response.json()
          if (data.divisionBreakdown) {
            setNcStats({
              total: data.classOf2025 || 89,
              d1: data.divisionBreakdown.D1 || 17,
              d2: data.divisionBreakdown.D2 || 30,
              d3: data.divisionBreakdown.D3 || 21,
              naia: data.divisionBreakdown.NAIA || 9,
              njcaa: data.divisionBreakdown.NJCAA || 4,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching NC stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchNCStats()
  }, [])

  const currentData = ncData[selectedGender]

  // Estimated total NC high school wrestlers (Class of 2025)
  // Based on: National ~245,000 HS wrestlers total, ~61,250 per class (4 grades)
  // NC is ~3.2% of US population, so ~1,960 NC wrestlers per graduating class
  // This is an estimate - update with actual NC NCHSAA participation data when available
  const NC_CLASS_OF_2025_WRESTLERS = 1960 // Estimate for Class of 2025 specifically

  // Calculate percentages based on NC high school wrestler total (not just those who went to college)
  // This matches the national calculation: % of HS wrestlers, not % of college wrestlers
  const calculateNCPercentages = (data: NCStats) => {
    if (NC_CLASS_OF_2025_WRESTLERS === 0) return { d1: 0, d2: 0, d3: 0, naia: 0, njcaa: 0 }
    return {
      d1: (data.d1 / NC_CLASS_OF_2025_WRESTLERS) * 100,
      d2: (data.d2 / NC_CLASS_OF_2025_WRESTLERS) * 100,
      d3: (data.d3 / NC_CLASS_OF_2025_WRESTLERS) * 100,
      naia: (data.naia / NC_CLASS_OF_2025_WRESTLERS) * 100,
      njcaa: (data.njcaa / NC_CLASS_OF_2025_WRESTLERS) * 100,
    }
  }

  const ncPercentages = calculateNCPercentages(currentData)

  // National percentages (based on ~245,000 total high school wrestlers, ~61,250 per class)
  // These match the "% of HS Wrestlers" column in the stats table
  const NATIONAL_CLASS_SIZE = 61250 // ~245,000 / 4 grades
  const nationalPercentages = {
    d1: ((nationalData.d1OptedIn.wrestlers + nationalData.d1NotOptedIn.wrestlers) / NATIONAL_CLASS_SIZE) * 100, // ~4.0%
    d2: (nationalData.d2.wrestlers / NATIONAL_CLASS_SIZE) * 100, // ~2.9%
    d3: (nationalData.d3.wrestlers / NATIONAL_CLASS_SIZE) * 100, // ~4.9%
    naia: (nationalData.naia.wrestlers / NATIONAL_CLASS_SIZE) * 100, // ~2.9%
    njcaa: (nationalData.njcaa.wrestlers / NATIONAL_CLASS_SIZE) * 100, // ~4.1%
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1e50] via-[#13294B] to-[#1e3a5f]">
      {/* Hero Section */}
      <section className="relative w-full bg-gradient-to-r from-[#13294B] to-[#1e3a5f] text-white py-20 md:py-32">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Wrestling Recruiting Guide
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              For Athletes, Parents & Families
            </p>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-3xl mx-auto">
              Navigate the college wrestling recruiting journey with division-specific guidance, 
              timelines, NCAA rules, and expert advice for every level of competition.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#for-families">
                <Button 
                  size="lg" 
                  className="bg-[#BC0B03] hover:bg-[#9a0902] text-white px-8 py-6 text-lg"
                >
                  For Families →
                </Button>
              </Link>
              <Link href="#for-coaches">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
                >
                  For Coaches →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-16 space-y-16 md:space-y-24">
        {/* College Wrestling Landscape Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Understanding College Wrestling</h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Only 5% of high school wrestlers compete in college—here&apos;s the breakdown
            </p>
          </div>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white/10 border-b-2 border-white/20">
                      <th className="text-left p-4 text-white font-bold">Division</th>
                      <th className="text-center p-4 text-white font-bold"># of Programs</th>
                      <th className="text-center p-4 text-white font-bold">Total Wrestlers</th>
                      <th className="text-center p-4 text-white font-bold">% of HS Wrestlers*</th>
                      <th className="text-center p-4 text-white font-bold">Scholarships (2025-26)</th>
                      <th className="text-center p-4 text-white font-bold">Roster Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">Division I (Opted In)</td>
                      <td className="p-4 text-white/90 text-center">~25-30</td>
                      <td className="p-4 text-white/90 text-center">~900</td>
                      <td className="p-4 text-white/90 text-center">~0.4%</td>
                      <td className="p-4 text-white/90 text-center">Up to 30 per team</td>
                      <td className="p-4 text-white/90 text-center">30 max</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">Division I (Not Opted In)</td>
                      <td className="p-4 text-white/90 text-center">~48-53</td>
                      <td className="p-4 text-white/90 text-center">~1,550</td>
                      <td className="p-4 text-white/90 text-center">~0.6%</td>
                      <td className="p-4 text-white/90 text-center">9.9 per team</td>
                      <td className="p-4 text-white/90 text-center">No limit</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">Division II</td>
                      <td className="p-4 text-white/90 text-center">65</td>
                      <td className="p-4 text-white/90 text-center">~1,800</td>
                      <td className="p-4 text-white/90 text-center">~0.7%</td>
                      <td className="p-4 text-white/90 text-center">9.0 per team</td>
                      <td className="p-4 text-white/90 text-center">No limit</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">Division III</td>
                      <td className="p-4 text-white/90 text-center">109</td>
                      <td className="p-4 text-white/90 text-center">~3,000</td>
                      <td className="p-4 text-white/90 text-center">~1.2%</td>
                      <td className="p-4 text-white/90 text-center">None (Academic aid)</td>
                      <td className="p-4 text-white/90 text-center">No limit</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">NAIA</td>
                      <td className="p-4 text-white/90 text-center">~100</td>
                      <td className="p-4 text-white/90 text-center">~1,800</td>
                      <td className="p-4 text-white/90 text-center">~0.7%</td>
                      <td className="p-4 text-white/90 text-center">8.0 per team</td>
                      <td className="p-4 text-white/90 text-center">No limit</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">JUCO</td>
                      <td className="p-4 text-white/90 text-center">~100</td>
                      <td className="p-4 text-white/90 text-center">~2,500</td>
                      <td className="p-4 text-white/90 text-center">~1.0%</td>
                      <td className="p-4 text-white/90 text-center">Varies</td>
                      <td className="p-4 text-white/90 text-center">No limit</td>
                    </tr>
                    <tr className="bg-white/10 font-bold">
                      <td className="p-4 text-white">TOTAL</td>
                      <td className="p-4 text-white text-center">~450+</td>
                      <td className="p-4 text-white text-center">~11,500+</td>
                      <td className="p-4 text-white text-center">~5%</td>
                      <td className="p-4 text-white text-center">—</td>
                      <td className="p-4 text-white text-center">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-white/70 mt-4">
                *Based on approximately 245,000 high school wrestlers in the US
              </p>
            </CardContent>
          </Card>

          <Card className="mt-6 bg-[#D3B574]/10 border-[#D3B574]/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div>
                  <p className="text-white font-semibold mb-2">KEY INSIGHT</p>
                  <p className="text-white/90">
                    Only about 5% of high school wrestlers compete in college at any level. 
                    Understanding which division fits your skill level, academic goals, and family&apos;s 
                    financial situation is critical to finding the right program.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* NC Class of 2025 Comparison Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How North Carolina Compares to National Trends
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Real data from NC&apos;s Class of 2025 commitments compared to national averages
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button
              onClick={() => setSelectedGender("all")}
              variant={selectedGender === "all" ? "default" : "outline"}
              className={selectedGender === "all" 
                ? "bg-[#BC0B03] hover:bg-[#9a0902] text-white" 
                : "border-white/30 text-white hover:bg-white/10"
              }
            >
              All ({ncData.all.total})
            </Button>
            <Button
              onClick={() => setSelectedGender("male")}
              variant={selectedGender === "male" ? "default" : "outline"}
              className={selectedGender === "male" 
                ? "bg-[#BC0B03] hover:bg-[#9a0902] text-white" 
                : "border-white/30 text-white hover:bg-white/10"
              }
            >
              Male ({ncData.male.total})
            </Button>
            <Button
              onClick={() => setSelectedGender("female")}
              variant={selectedGender === "female" ? "default" : "outline"}
              className={selectedGender === "female" 
                ? "bg-[#BC0B03] hover:bg-[#9a0902] text-white" 
                : "border-white/30 text-white hover:bg-white/10"
              }
            >
              Female ({ncData.female.total})
            </Button>
          </div>

          {/* Comparison Table */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white/10 border-b-2 border-white/20">
                      <th className="text-left p-4 text-white font-bold">Division</th>
                      <th className="text-center p-4 text-white font-bold">National % of HS Wrestlers</th>
                      <th className="text-center p-4 text-white font-bold">NC Class of 2025</th>
                      <th className="text-center p-4 text-white font-bold">NC % of HS Wrestlers</th>
                      <th className="text-center p-4 text-white font-bold">Comparison</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">Division I</td>
                      <td className="p-4 text-white/90 text-center">{nationalPercentages.d1.toFixed(2)}%</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{currentData.d1}</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{ncPercentages.d1.toFixed(2)}%</td>
                      <td className="p-4 text-center">
                        {Math.abs(ncPercentages.d1 - nationalPercentages.d1) < 0.1 ? (
                          <Badge className="bg-green-600">Similar</Badge>
                        ) : ncPercentages.d1 > nationalPercentages.d1 ? (
                          <Badge className="bg-blue-600">Higher</Badge>
                        ) : (
                          <Badge className="bg-yellow-600">Lower</Badge>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">Division II</td>
                      <td className="p-4 text-white/90 text-center">{nationalPercentages.d2.toFixed(2)}%</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{currentData.d2}</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{ncPercentages.d2.toFixed(2)}%</td>
                      <td className="p-4 text-center">
                        {Math.abs(ncPercentages.d2 - nationalPercentages.d2) < 0.1 ? (
                          <Badge className="bg-green-600">Similar</Badge>
                        ) : ncPercentages.d2 > nationalPercentages.d2 ? (
                          <Badge className="bg-blue-600">Higher</Badge>
                        ) : (
                          <Badge className="bg-yellow-600">Lower</Badge>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">Division III</td>
                      <td className="p-4 text-white/90 text-center">{nationalPercentages.d3.toFixed(2)}%</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{currentData.d3}</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{ncPercentages.d3.toFixed(2)}%</td>
                      <td className="p-4 text-center">
                        {Math.abs(ncPercentages.d3 - nationalPercentages.d3) < 0.1 ? (
                          <Badge className="bg-green-600">Similar</Badge>
                        ) : ncPercentages.d3 > nationalPercentages.d3 ? (
                          <Badge className="bg-blue-600">Higher</Badge>
                        ) : (
                          <Badge className="bg-yellow-600">Lower</Badge>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">NAIA</td>
                      <td className="p-4 text-white/90 text-center">{nationalPercentages.naia.toFixed(2)}%</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{currentData.naia}</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{ncPercentages.naia.toFixed(2)}%</td>
                      <td className="p-4 text-center">
                        {Math.abs(ncPercentages.naia - nationalPercentages.naia) < 0.1 ? (
                          <Badge className="bg-green-600">Similar</Badge>
                        ) : ncPercentages.naia > nationalPercentages.naia ? (
                          <Badge className="bg-blue-600">Higher</Badge>
                        ) : (
                          <Badge className="bg-yellow-600">Lower</Badge>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">JUCO</td>
                      <td className="p-4 text-white/90 text-center">{nationalPercentages.njcaa.toFixed(2)}%</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{currentData.njcaa}</td>
                      <td className="p-4 text-white/90 text-center font-semibold">{ncPercentages.njcaa.toFixed(2)}%</td>
                      <td className="p-4 text-center">
                        {Math.abs(ncPercentages.njcaa - nationalPercentages.njcaa) < 0.1 ? (
                          <Badge className="bg-green-600">Similar</Badge>
                        ) : ncPercentages.njcaa > nationalPercentages.njcaa ? (
                          <Badge className="bg-blue-600">Higher</Badge>
                        ) : (
                          <Badge className="bg-yellow-600">Lower</Badge>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card className="bg-[#D3B574]/10 border-[#D3B574]/30">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-lg mb-4">💡 What This Means for NC Wrestlers</h3>
              <ul className="space-y-2 text-white/90">
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574] mt-1">•</span>
                  <span>
                    <strong>NC vs. National:</strong> Comparing NC&apos;s {currentData.total} Class of 2025 commitments 
                    to national trends shows how our state compares. The percentages represent what % of NC high school 
                    wrestlers go to each division level.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574] mt-1">•</span>
                  <span>
                    <strong>Division II is most common:</strong> {ncPercentages.d2.toFixed(2)}% of NC high school 
                    wrestlers go D2, compared to {nationalPercentages.d2.toFixed(2)}% nationally.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574] mt-1">•</span>
                  <span>
                    <strong>Division I is competitive:</strong> Only {ncPercentages.d1.toFixed(2)}% of NC high school 
                    wrestlers go D1 (vs. {nationalPercentages.d1.toFixed(2)}% nationally), reinforcing that it&apos;s 
                    the most selective level.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574] mt-1">•</span>
                  <span>
                    <strong>Cast a wide net:</strong> The &quot;best fit&quot; program might not be at the division 
                    level you initially expected. D2, D3, and NAIA all offer excellent opportunities.
                  </span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <p className="text-white/70 text-sm">
                  <strong>Note:</strong> Percentages are calculated based on estimated {NC_CLASS_OF_2025_WRESTLERS.toLocaleString()} NC high school wrestlers in the Class of 2025 
                  NC high school wrestlers (estimated from national data). Update with actual NC participation numbers when available.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Critical D1 Changes Callout */}
        <section>
          <Alert className="bg-orange-950/30 border-orange-500/50 border-2">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
            <AlertDescription className="text-white">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-orange-300 mb-2">
                  ⚠️ CRITICAL: DIVISION I WRESTLING SPLIT INTO TWO GROUPS (2025-26)
                </h3>
                <p className="text-white/90">
                  Starting Fall 2025, D1 wrestling programs fall into two categories:
                </p>
                
                <div className="bg-white/5 p-4 rounded-lg space-y-3">
                  <h4 className="font-bold text-white">OPTED INTO HOUSE SETTLEMENT (~25-30 Programs):</h4>
                  <ul className="list-disc list-inside space-y-1 text-white/90 ml-4">
                    <li>Roster LIMIT: 30 wrestlers maximum (strict cap)</li>
                    <li>Scholarships: Up to 30 full scholarships available</li>
                    <li>More money per wrestler, but fewer total roster spots</li>
                    <li>Walk-ons nearly eliminated</li>
                    <li>Who: Power 4 conferences (ACC, Big Ten, Big 12, SEC) + some others</li>
                    <li>Examples: Penn State, Iowa, Ohio State, Michigan, NC State</li>
                  </ul>
                </div>

                <div className="bg-white/5 p-4 rounded-lg space-y-3">
                  <h4 className="font-bold text-white">DID NOT OPT IN (~48-53 Programs):</h4>
                  <ul className="list-disc list-inside space-y-1 text-white/90 ml-4">
                    <li>Roster: NO LIMIT (can carry 40-60+ wrestlers like before)</li>
                    <li>Scholarships: 9.9 limit (old rules remain)</li>
                    <li>More roster opportunities, but less $ per wrestler</li>
                    <li>Walk-ons still welcomed</li>
                    <li>Who: Most non-Power 4 D1 programs</li>
                    <li>Examples: Most non-Power 4 schools (ask coaches directly)</li>
                  </ul>
                </div>

                <div className="bg-red-950/30 p-4 rounded-lg border border-red-500/30">
                  <p className="text-white font-semibold mb-2">⚠️ IMPORTANT:</p>
                  <p className="text-white/90">
                    We do NOT have a complete public list of which schools opted in beyond Power 4. 
                    ALWAYS ask coaches directly: &quot;Did your program opt into the House settlement? 
                    What is your roster limit for 2025-26?&quot;
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </section>

        {/* Choose Your Path Section */}
        <section id="for-families">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Find Your Path</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-8 w-8 text-[#D3B574]" />
                  <CardTitle className="text-white text-2xl">👨‍👩‍👧‍👦 FOR WRESTLING FAMILIES</CardTitle>
                </div>
                <CardDescription className="text-white/70">Athletes & Parents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/90">
                  Complete recruiting guidance for wrestlers and parents working together.
                </p>
                <div>
                  <p className="text-white font-semibold mb-2">What You&apos;ll Learn:</p>
                  <ul className="space-y-1 text-white/80 text-sm">
                    <li>• Division-specific recruiting timelines</li>
                    <li>• NCAA contact rules and compliance</li>
                    <li>• Scholarship vs. financial aid options</li>
                    <li>• Official visit planning and questions to ask</li>
                    <li>• Making your college decision as a family</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-[#BC0B03] hover:bg-[#9a0902] text-white">
                  View Family Guide →
                </Button>
              </CardFooter>
            </Card>

            <Card id="for-coaches" className="bg-white/5 border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="h-8 w-8 text-[#D3B574]" />
                  <CardTitle className="text-white text-2xl">👔 FOR COACHES</CardTitle>
                </div>
                <CardDescription className="text-white/70">Best Practices & Tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/90">
                  Build and manage your recruiting pipeline with proven strategies and tools.
                </p>
                <div>
                  <p className="text-white font-semibold mb-2">What You&apos;ll Learn:</p>
                  <ul className="space-y-1 text-white/80 text-sm">
                    <li>• Prospecting and athlete evaluation</li>
                    <li>• Communication strategy and NCAA compliance</li>
                    <li>• Using MyRecruits platform effectively</li>
                    <li>• House settlement impact on your program</li>
                    <li>• Closing recruits successfully</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-[#BC0B03] hover:bg-[#9a0902] text-white">
                  View Coach Guide →
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Division Deep Dives - I'll create a simplified version for now */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Explore Each Division</h2>
            <p className="text-xl text-white/80">Click to learn recruiting specifics for each level</p>
          </div>

          <div className="space-y-6">
            {/* D1 Opted In Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl">
                  DIVISION I - OPTED INTO SETTLEMENT (~25-30 Programs | Power 4 + Select Others)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/90">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>📍 Skill Level:</strong> Top 0.4% of HS wrestlers (~900 total)</p>
                    <p><strong>💰 Scholarships:</strong> Up to 30 per team (NEW for 2025-26!)</p>
                    <p><strong>👥 Roster Limit:</strong> 30 maximum (strict cap)</p>
                  </div>
                  <div>
                    <p><strong>📞 Contact:</strong> September 1 of junior year</p>
                    <p><strong>🎓 Academics:</strong> 2.3+ GPA minimum (sliding scale)</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Best For:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>National champions and All-Americans</li>
                    <li>Top-5 state finishers at major states</li>
                    <li>Elite national tournament competitors</li>
                    <li>Nationally ranked wrestlers (top 100)</li>
                  </ul>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Key Changes for 2025-26:</p>
                  <ul className="space-y-1">
                    <li>✅ More scholarship money available (up to 30 vs. 9.9)</li>
                    <li>❌ Far fewer roster spots (30 max vs. 40-60 before)</li>
                    <li>❌ Walk-ons nearly eliminated</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Learn More →
                </Button>
              </CardFooter>
            </Card>

            {/* D1 Not Opted In Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl">
                  DIVISION I - DID NOT OPT IN (~48-53 Programs | Most Non-Power 4)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/90">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>📍 Skill Level:</strong> Top 0.6% of HS wrestlers (~1,550 total)</p>
                    <p><strong>💰 Scholarships:</strong> 9.9 per team (unchanged)</p>
                    <p><strong>👥 Roster Limit:</strong> NO LIMIT (can carry 40-60+)</p>
                  </div>
                  <div>
                    <p><strong>📞 Contact:</strong> September 1 of junior year</p>
                    <p><strong>🎓 Academics:</strong> 2.3+ GPA minimum</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Best For:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>State champions and place-winners</li>
                    <li>All-American level or close</li>
                    <li>Top-10 state finishers</li>
                    <li>Strong national tournament competitors</li>
                  </ul>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Key Advantage:</p>
                  <ul className="space-y-1">
                    <li>✅ MORE roster opportunities than opted-in schools</li>
                    <li>✅ Walk-ons still welcomed</li>
                    <li>✅ Better chance to compete as freshman/sophomore</li>
                    <li>⚠️ Less scholarship money per wrestler (9.9 split)</li>
                  </ul>
                </div>
                <div className="bg-yellow-950/20 p-4 rounded-lg border border-yellow-500/30">
                  <p className="text-yellow-200 text-sm">
                    ⚠️ Note: Some non-Power 4 schools may opt in. Always ask coaches: &quot;What is your opt-in status?&quot;
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Learn More →
                </Button>
              </CardFooter>
            </Card>

            {/* D2 Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl">DIVISION II (65 Programs)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/90">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>📍 Skill Level:</strong> Top 0.7% of HS wrestlers (~1,800 total)</p>
                    <p><strong>💰 Scholarships:</strong> 9.0 per team</p>
                    <p><strong>👥 Roster Limit:</strong> No limit</p>
                  </div>
                  <div>
                    <p><strong>📞 Contact:</strong> June 15 after sophomore year</p>
                    <p><strong>🎓 Academics:</strong> 2.2+ GPA minimum</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Best For:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>State place-winners (top 8)</li>
                    <li>Regional competitors</li>
                    <li>Strong academic students seeking balance</li>
                    <li>Athletes wanting smaller school environment</li>
                  </ul>
                </div>
                <div className="bg-green-950/20 p-4 rounded-lg border border-green-500/30">
                  <p className="text-green-200 text-sm">
                    ✅ NOT affected by House settlement - Rules unchanged from previous years
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Learn More →
                </Button>
              </CardFooter>
            </Card>

            {/* D3 Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl">DIVISION III (109 Programs)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/90">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>📍 Skill Level:</strong> Top 1.2% of HS wrestlers (~3,000 total)</p>
                    <p><strong>💰 Scholarships:</strong> NONE (athletic scholarships)</p>
                    <p><strong>💡 Financial Aid:</strong> Academic/merit/need-based aid</p>
                    <p><strong>👥 Roster Limit:</strong> No limit</p>
                  </div>
                  <div>
                    <p><strong>📞 Contact:</strong> Anytime (no NCAA restrictions)</p>
                    <p><strong>🎓 Academics:</strong> School-specific (often higher standards)</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Best For:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>State qualifiers and place-winners</li>
                    <li>Academically-focused student-athletes</li>
                    <li>Athletes seeking top academic programs</li>
                    <li>Balanced college experience (sports + academics)</li>
                  </ul>
                </div>
                <div className="bg-blue-950/20 p-4 rounded-lg border border-blue-500/30">
                  <p className="text-blue-200 font-semibold mb-2">⚠️ CRITICAL: No Athletic Scholarships BUT...</p>
                  <p className="text-blue-200 text-sm">
                    Many D3 schools offer BETTER total financial aid packages than D1/D2 partial athletic scholarships! 
                    Consider: academic merit aid, need-based grants, institutional scholarships combined.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Learn More →
                </Button>
              </CardFooter>
            </Card>

            {/* NAIA Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl">NAIA (~100 Programs)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/90">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>📍 Skill Level:</strong> Top 0.7% of HS wrestlers (~1,800 total)</p>
                    <p><strong>💰 Scholarships:</strong> 8.0 per team</p>
                    <p><strong>👥 Roster Limit:</strong> No limit</p>
                  </div>
                  <div>
                    <p><strong>📞 Contact:</strong> Very flexible (fewer restrictions)</p>
                    <p><strong>🎓 Academics:</strong> 2.0+ GPA OR minimum test scores</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Best For:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Wide range of talent levels</li>
                    <li>Late bloomers or developing wrestlers</li>
                    <li>Athletes seeking smaller, private schools</li>
                    <li>More flexible academic/athletic balance</li>
                  </ul>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Key Advantages:</p>
                  <ul className="space-y-1">
                    <li>✅ More relaxed recruiting rules than NCAA</li>
                    <li>✅ Can stack athletic + academic scholarships</li>
                    <li>✅ Often MORE total aid than D2</li>
                    <li>✅ Competitive programs rival D2/D3</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Learn More →
                </Button>
              </CardFooter>
            </Card>

            {/* JUCO Card */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-xl">JUCO / JUNIOR COLLEGE (~100 Programs)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/90">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>📍 Skill Level:</strong> Top 1% of HS wrestlers (~2,500 total)</p>
                    <p><strong>💰 Scholarships:</strong> Varies by division</p>
                    <p className="text-sm ml-4">• NJCAA DI: Full scholarships available</p>
                    <p className="text-sm ml-4">• NJCAA DII: Tuition + books</p>
                    <p className="text-sm ml-4">• NJCAA DIII: No athletic aid</p>
                    <p><strong>👥 Roster Limit:</strong> No limit</p>
                  </div>
                  <div>
                    <p><strong>📞 Contact:</strong> Year-round (very few restrictions)</p>
                    <p><strong>🎓 Academics:</strong> HS diploma or GED (most flexible)</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Best For:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Late bloomers needing development time</li>
                    <li>Athletes needing academic improvement</li>
                    <li>Wrestlers wanting immediate playing time</li>
                    <li>Affordable path to 4-year school</li>
                  </ul>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Key Advantages:</p>
                  <ul className="space-y-1">
                    <li>✅ Develop for 2 years, then transfer to D1/D2/D3</li>
                    <li>✅ Compete as true freshman</li>
                    <li>✅ Most affordable option</li>
                    <li>✅ Second chance for academics</li>
                    <li>✅ Build resume for 4-year schools</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  Learn More →
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* D1 Comparison Table */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Comparing the Two Types of D1 Programs
            </h2>
            <p className="text-xl text-white/80">Understanding your options in Division I wrestling</p>
          </div>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white/10 border-b-2 border-white/20">
                      <th className="text-left p-4 text-white font-bold">Factor</th>
                      <th className="text-center p-4 text-white font-bold">Opted In (Power 4 + Some)</th>
                      <th className="text-center p-4 text-white font-bold">Did NOT Opt In (Most Non-P4)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">Roster Size</td>
                      <td className="p-4 text-white/90 text-center">30 maximum</td>
                      <td className="p-4 text-white/90 text-center">40-60+ possible</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">Scholarships</td>
                      <td className="p-4 text-white/90 text-center">Up to 30 available</td>
                      <td className="p-4 text-white/90 text-center">9.9 available</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">$ Per Wrestler</td>
                      <td className="p-4 text-white/90 text-center">Potentially much higher</td>
                      <td className="p-4 text-white/90 text-center">Often partial scholarships</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">Walk-Ons</td>
                      <td className="p-4 text-white/90 text-center">Nearly eliminated</td>
                      <td className="p-4 text-white/90 text-center">Still welcomed</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-4 text-white font-semibold">Competition Level</td>
                      <td className="p-4 text-white/90 text-center">Absolute highest</td>
                      <td className="p-4 text-white/90 text-center">Very high</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 bg-white/5">
                      <td className="p-4 text-white font-semibold">Roster Spot Difficulty</td>
                      <td className="p-4 text-white/90 text-center">Extremely hard to get</td>
                      <td className="p-4 text-white/90 text-center">More opportunities</td>
                    </tr>
                    <tr className="bg-white/10">
                      <td className="p-4 text-white font-semibold">Best For</td>
                      <td className="p-4 text-white/90 text-center">Elite All-Americans, top-100 ranked</td>
                      <td className="p-4 text-white/90 text-center">Strong state champions, top-20 state</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Resources Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Quick Resources</h2>
            <p className="text-xl text-white/80">Download guides and tools to jumpstart your recruiting journey</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/5 border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-[#D3B574] mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">📅 RECRUITING TIMELINE</h3>
                <p className="text-white/70 text-sm mb-4">
                  Division-specific checklist from freshman to senior year
                </p>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  Download PDF →
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-[#D3B574] mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">📊 DIVISION COMPARISON</h3>
                <p className="text-white/70 text-sm mb-4">
                  Side-by-side comparison of rules, scholarships, and requirements
                </p>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  Download PDF →
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <Mail className="h-12 w-12 text-[#D3B574] mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">✉️ EMAIL TEMPLATES</h3>
                <p className="text-white/70 text-sm mb-4">
                  Sample messages for contacting coaches and following up
                </p>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  Download PDF →
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <HelpCircle className="h-12 w-12 text-[#D3B574] mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">💬 CONTACT US</h3>
                <p className="text-white/70 text-sm mb-4">
                  Have questions? Need guidance? Reach out to our team
                </p>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  Get Help →
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="bg-white/5 rounded-lg p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Recruiting Journey?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Create your free RecruitNC profile to get discovered by college coaches, 
            track your tournament results, and manage your recruiting process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/submit-profile">
              <Button size="lg" className="bg-[#BC0B03] hover:bg-[#9a0902] text-white px-8">
                Create Your Profile →
              </Button>
            </Link>
            <Link href="/colleges">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8">
                Browse College Programs →
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
    </AuthGuard>
  )
}

