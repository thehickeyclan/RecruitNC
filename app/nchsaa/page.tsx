"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Crown, Calendar, ArrowRight, Star, TrendingUp, ChevronDown, School, Archive, MapPin } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { regionsData } from "@/lib/regional-data"
import { nchsaaClassificationOverviewData as classificationData } from "@/lib/nchsaa-classification-overview-data"
import { NCHSAAYearResultsClient } from "./[year]/year-results-client"

export default function NCHSAAOverview() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Helper function to get regions for a classification
  const getRegionsForClassification = (classification: string) => {
    if (classification === "1A" || classification === "2A") {
      return regionsData.filter((r) => r.region.startsWith("1A/2A"))
    }
    return regionsData.filter((r) => r.region.startsWith(classification))
  }

  if (selectedYear !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <button
            type="button"
            onClick={() => setSelectedYear(null)}
            className="text-[#B91C1C] font-medium hover:underline mb-4"
          >
            ← Back to Overview
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#003366]">{selectedYear} NCHSAA Results</h1>
          <p className="text-slate-600 text-sm sm:text-base mb-6">North Carolina State Wrestling Championships</p>
          <NCHSAAYearResultsClient displayYear={selectedYear} yearParam={String(selectedYear)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Browse Archive CTA front and center at top */}
        <div className="mb-6 md:mb-8">
          <Card className="border-2 border-[#003366] bg-gradient-to-r from-[#003366] to-[#001a38]">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 w-full md:w-auto">
                  <Image
                    src="/images/nchsaa-logo.png"
                    alt="NCHSAA Logo"
                    width={80}
                    height={80}
                    className="object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0"
                  />
                  <div className="text-center md:text-left flex-1 min-w-0 w-full md:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2 leading-tight">
                      NCHSAA State Championships
                    </h1>
                    <p className="text-white/80 text-sm sm:text-base md:text-lg">
                      North Carolina's Premier High School Wrestling Tournament
                    </p>
                  </div>
                </div>
                <a href="/nchsaa/archive" className="w-full md:w-auto mt-2 md:mt-0 block">
                  <Button
                    size="lg"
                    className="bg-[#CBAF5D] hover:bg-[#b89c4a] text-[#003366] font-bold text-sm sm:text-base md:text-lg px-4 md:px-8 py-2 md:py-3 lg:py-6 shadow-lg w-full md:w-auto"
                  >
                    <Archive className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Browse Archive
                  </Button>
                </a>
              </div>
              <p className="mt-3 text-center md:text-right">
                <a
                  href="/history/records/single-season-wins"
                  className="text-sm text-white/90 underline underline-offset-2 hover:text-white"
                >
                  Single-season most victories leaderboard
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <button
            type="button"
            onClick={() => setSelectedYear(2026)}
            className="w-full h-full text-left cursor-pointer border-0 p-0 bg-transparent"
          >
            <Card className="border-2 border-[#003366] hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="bg-[#003366] text-white p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                  2026 NCHSAA Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <p className="text-[#003366] text-sm md:text-base">
                  View 2026 State Championship results, MOW by division, and the new 7-class format.
                </p>
                <div className="flex items-center text-[#003366] font-semibold mt-3 md:mt-4 text-sm md:text-base">
                  View Results <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </button>
          <button
            type="button"
            onClick={() => setSelectedYear(2025)}
            className="w-full h-full text-left cursor-pointer border-0 p-0 bg-transparent"
          >
            <Card className="border-2 border-[#B31B1B] hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="bg-[#B31B1B] text-white p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                  2025 NCHSAA Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <p className="text-[#003366] text-sm md:text-base">
                  View 2025 NCHSAA State Championship results across all classifications.
                </p>
                <div className="flex items-center text-[#B31B1B] font-semibold mt-3 md:mt-4 text-sm md:text-base">
                  View Results <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </CardContent>
            </Card>
          </button>
          <form action="/nchsaa/archive" method="get" className="block h-full">
            <button type="submit" className="w-full h-full text-left cursor-pointer border-0 p-0 bg-transparent">
              <Card className="border-2 border-[#003366] hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="bg-[#003366] text-white p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Archive className="w-4 h-4 md:w-5 md:h-5" />
                    Historical Archive
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <p className="text-[#003366] text-sm md:text-base">
                    Search and explore historical NCHSAA State Championship results by year, school, or wrestler.
                  </p>
                  <div className="flex items-center text-[#003366] font-semibold mt-3 md:mt-4 text-sm md:text-base">
                    Browse Archive <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </button>
          </form>
        </div>

        {/* Tournament Overview */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="lg:col-span-2 border-2 border-[#003366]">
            <CardHeader className="bg-[#003366] text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Crown className="w-5 h-5 md:w-6 md:h-6" />
                About NCHSAA State Championships
              </CardTitle>
              <CardDescription className="text-white/80 text-sm md:text-base">
                The ultimate high school wrestling competition in North Carolina
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-3 md:space-y-4">
                <p className="text-[#003366] leading-relaxed text-sm md:text-base">
                  The North Carolina High School Athletic Association (NCHSAA) State Wrestling Championships represents
                  the pinnacle of high school wrestling competition in North Carolina. Each year, the state's top
                  wrestlers compete across multiple classifications for the coveted title of State Champion.
                </p>
                <p className="text-[#003366] leading-relaxed text-sm md:text-base">
                  Only the best wrestlers from each region advance to the state tournament, making every match a battle
                  between elite competitors. NC United has proudly coached numerous state champions and place winners
                  throughout our history.
                </p>
                <div className="grid md:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6">
                  <div className="bg-[#CBAF5D]/10 p-3 md:p-4 rounded-lg border border-[#CBAF5D]/30">
                    <h4 className="font-semibold text-[#003366] mb-2 text-sm md:text-base">Tournament Format</h4>
                    <ul className="text-xs md:text-sm space-y-1 text-[#003366]/80">
                      <li>• Multiple Classifications (1A-8A)</li>
                      <li>• 14 Weight Classes per classification</li>
                      <li>• Top 4 finishers earn medals</li>
                      <li>• Double elimination format</li>
                    </ul>
                  </div>
                  <div className="bg-[#003366]/5 p-3 md:p-4 rounded-lg border border-[#003366]/20">
                    <h4 className="font-semibold text-[#003366] mb-2 text-sm md:text-base">Qualification</h4>
                    <ul className="text-xs md:text-sm space-y-1 text-[#003366]/80">
                      <li>• Regional tournament qualifiers</li>
                      <li>• Top 4 from each regional</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-2 border-yellow-400">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tournament Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Classifications</span>
                    <Badge className="bg-[#003366]">7 (1A/2A combine at states)</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Weight Classes</span>
                    <Badge className="bg-[#003366]">14 per class</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Medal Winners</span>
                    <Badge className="bg-yellow-500 text-white">Top 4 per weight</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Archive Years</span>
                    <Badge className="bg-blue-600 text-white">Historic</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#2563eb]">
              <CardHeader className="bg-gradient-to-r from-[#2563eb] to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  NC United Legacy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <div className="font-semibold text-[#003366]">🏆 State Champions</div>
                    <div className="text-slate-600">Multiple NCHSAA State Champions</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="font-semibold text-[#003366]">🥈 Place Winners</div>
                    <div className="text-slate-600">Numerous top-6 finishers</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="font-semibold text-[#003366]">📈 Consistency</div>
                    <div className="text-slate-600">Decades of state tournament success</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mb-6 md:mb-8">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-[#003366] flex items-center gap-2 text-lg md:text-xl">
              <School className="w-5 h-5 md:w-6 md:h-6" />
              New 8A Classification System
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              North Carolina's expanded classification system now includes 8 divisions (1A-8A) based on school
              enrollment
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gradient-to-r from-[#003366]/5 to-[#003366]/10 rounded-lg border border-[#003366]/20">
              <h3 className="font-semibold text-[#003366] mb-2 text-sm md:text-base">About the 8A System</h3>
              <p className="text-[#003366] text-xs md:text-sm leading-relaxed">
                The NCHSAA has expanded from the traditional 4-classification system to an 8-classification system,
                providing more balanced competition by creating smaller enrollment ranges within each division. This
                ensures schools compete against others of similar size and resources.
              </p>
            </div>

            <div className="space-y-3 md:space-y-4">
              {Object.entries(classificationData).map(([classification, data]) => (
                <Collapsible
                  key={classification}
                  open={openSections[classification]}
                  onOpenChange={() => toggleSection(classification)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-between p-3 md:p-4 h-auto bg-gradient-to-r ${data.bgColor} border-2 ${data.borderColor} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <Badge className={`bg-gradient-to-r ${data.color} text-white px-2 md:px-3 py-1 text-xs md:text-sm font-bold flex-shrink-0`}>
                          {classification}
                        </Badge>
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 text-sm md:text-base truncate">{classification} Classification</div>
                          <div className="text-xs md:text-sm text-slate-600">{data.schools.length} Schools</div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 md:w-5 md:h-5 transition-transform flex-shrink-0 ${openSections[classification] ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <Card className={`border-2 ${data.borderColor}`}>
                      <CardContent className="p-3 md:p-4">
                        <p className="text-[#003366] text-xs md:text-sm mb-3 md:mb-4 leading-relaxed">{data.description}</p>

                        {/* Regional Breakdown */}
                        {(() => {
                          const regions = getRegionsForClassification(classification)
                          if (regions.length > 0) {
                            return (
                              <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                                <h4 className="font-semibold text-[#003366] text-xs md:text-sm mb-2 md:mb-3 flex items-center gap-2">
                                  <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                                  Regional Breakdown
                                </h4>
                                {regions.map((regionData) => {
                                  const isEast = regionData.region.includes("East")
                                  const regionKey = `${classification}-${regionData.region.replace(/\s+/g, "-").toLowerCase()}`
                                  return (
                                    <Collapsible
                                      key={regionData.region}
                                      open={openSections[regionKey]}
                                      onOpenChange={() => toggleSection(regionKey)}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={`w-full justify-between p-2 md:p-3 h-auto bg-gradient-to-r ${
                                            isEast ? "from-[#B31B1B]/5 to-[#B31B1B]/10" : "from-[#003366]/5 to-[#003366]/10"
                                          } border-2 ${
                                            isEast ? "border-[#B31B1B]/20" : "border-[#003366]/20"
                                          } hover:shadow-md transition-all`}
                                        >
                                          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                            <Badge
                                              className={`bg-gradient-to-r ${
                                                isEast ? "from-[#B31B1B] to-[#8f1616]" : "from-[#003366] to-[#001a38]"
                                              } text-white px-1.5 md:px-2 py-0.5 md:py-1 text-xs font-bold flex-shrink-0`}
                                            >
                                              {isEast ? "East" : "West"}
                                            </Badge>
                                            <div className="text-left min-w-0 flex-1">
                                              <div className="font-semibold text-slate-800 text-xs md:text-sm truncate">{regionData.region}</div>
                                              <div className="text-xs text-slate-600">{regionData.schools.length} Schools</div>
                                            </div>
                                          </div>
                                          <ChevronDown
                                            className={`w-3 h-3 md:w-4 md:h-4 transition-transform flex-shrink-0 ${openSections[regionKey] ? "rotate-180" : ""}`}
                                          />
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="mt-2">
                                        <Card className={`border-2 ${isEast ? "border-[#B31B1B]/20" : "border-[#003366]/20"}`}>
                                          <CardContent className="p-2 md:p-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-2">
                                              {regionData.schools.map((school, index) => (
                                                <div
                                                  key={index}
                                                  className="p-1.5 md:p-2 bg-white rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                                                >
                                                  <span className="font-medium text-slate-800 text-xs leading-tight block">{school}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )
                                })}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* State Tournament Qualification */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-[#003366] flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              State Tournament Qualification
            </CardTitle>
            <CardDescription>
              How wrestlers qualify for the NCHSAA State Tournament under the new 8-class system (effective 2025-26)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-gradient-to-r from-[#B31B1B]/5 to-[#CBAF5D]/5 rounded-lg border border-[#B31B1B]/20">
              <h3 className="font-semibold text-[#003366] mb-2">Key Changes for 2025-26</h3>
              <p className="text-[#003366] text-sm leading-relaxed">
                Qualification has been reduced from 16 to 8 wrestlers per classification. There will be two regional
                championships for each classification (East and West), with the top four wrestlers from each regional
                advancing to the State Championship.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card className="border-2 border-[#003366]/20">
                <CardHeader className="bg-[#003366]/5">
                  <CardTitle className="text-[#003366] text-lg">Regional Structure</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#003366] text-white">East Regional</Badge>
                      <span className="text-[#003366]/70 text-sm">Top 4 advance</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-[#003366] text-white">West Regional</Badge>
                      <span className="text-[#003366]/70 text-sm">Top 4 advance</span>
                    </div>
                    <div className="mt-4 p-3 bg-[#CBAF5D]/10 rounded border border-[#CBAF5D]/30">
                      <div className="font-semibold text-[#003366] text-sm">Total State Qualifiers</div>
                      <div className="text-[#003366]/70 text-sm">8 wrestlers per weight class</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-[#CBAF5D]/20">
                <CardHeader className="bg-[#CBAF5D]/10">
                  <CardTitle className="text-[#003366] text-lg">Championship Format</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-[#003366] mb-2">Boys Wrestling</h4>
                      <ul className="text-sm space-y-1 text-[#003366]/80">
                        <li>• 1A & 2A: Combined championship</li>
                        <li>• 3A-8A: Individual championships</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#003366] mb-2">Girls Wrestling</h4>
                      <ul className="text-sm space-y-1 text-[#003366]/80">
                        <li>• 1A-4A: Combined championship</li>
                        <li>• 5A-8A: Individual championships</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-[#003366]/20">
              <CardHeader>
                <CardTitle className="text-[#003366] text-lg">Qualification Summary Table</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-2 font-semibold text-[#003366]">Classification</th>
                        <th className="text-left p-2 font-semibold text-[#003366]"># Regionals</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Advancers per Regional</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Total State Qualifiers</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Boys Format</th>
                        <th className="text-left p-2 font-semibold text-[#003366]">Girls Format</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="p-2">1A, 2A</td>
                        <td className="p-2">2</td>
                        <td className="p-2">4 per regional</td>
                        <td className="p-2">8 per class</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Combined
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Combined
                          </Badge>
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-2">3A-8A (each)</td>
                        <td className="p-2">2</td>
                        <td className="p-2">4 per regional</td>
                        <td className="p-2">8 per class</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Separate
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Separate (5A-8A)
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">1A-4A (Girls only)</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">N/A</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            Combined
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-[#003366]/5 rounded border border-[#003366]/20">
                  <p className="text-[#003366] text-sm">
                    <strong>Bottom Line:</strong> Wrestlers must place in the top four at their regional (East or West)
                    to qualify for the state tournament. Every classification now gets just eight spots total.
                  </p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Most Outstanding Wrestlers */}
        <Card className="mb-8 border-2 border-orange-400">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-6 h-6" />
              Most Outstanding Wrestlers
            </CardTitle>
            <CardDescription className="text-orange-100">
              Honoring the most exceptional performers at each NCHSAA State Championship
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#CBAF5D]/10 to-[#CBAF5D]/10 p-4 rounded-lg border border-[#CBAF5D]/30">
                <h3 className="font-semibold text-[#003366] mb-2">About the Award</h3>
                <p className="text-[#003366] text-sm leading-relaxed">
                  The Most Outstanding Wrestler award is presented annually to the wrestler who demonstrates exceptional
                  skill, sportsmanship, and performance at the NCHSAA State Championships. This prestigious honor has
                  been awarded since 1958, recognizing the finest high school wrestlers in North Carolina history.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#003366] flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Award Criteria
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
                      <Star className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 text-sm">Exceptional Performance</div>
                        <div className="text-slate-600 text-xs">Dominant wrestling throughout the tournament</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
                      <Star className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 text-sm">Technical Excellence</div>
                        <div className="text-slate-600 text-xs">Superior wrestling technique and skill</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded border border-orange-200">
                      <Star className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-slate-800 text-sm">Sportsmanship</div>
                        <div className="text-slate-600 text-xs">Exemplary conduct and character</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-[#003366] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Historical Context
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-[#CBAF5D]/10 p-3 rounded border border-[#CBAF5D]/30">
                      <div className="font-semibold text-[#003366] text-sm">Award History</div>
                      <div className="text-[#003366]/70 text-xs">Presented annually since 1958</div>
                    </div>
                    <div className="bg-[#003366]/5 p-3 rounded border border-[#003366]/20">
                      <div className="font-semibold text-[#003366] text-sm">Era Changes</div>
                      <div className="text-[#003366]/70 text-xs">
                        Open era (1958-1986) → Divisional era (1987-present)
                      </div>
                    </div>
                    <div className="bg-slate-100 p-3 rounded border border-slate-200">
                      <div className="font-semibold text-[#003366] text-sm">Legacy</div>
                      <div className="text-slate-600 text-xs">65+ years of wrestling excellence</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#003366]/5 to-[#001a38]/5 p-4 rounded-lg border border-[#003366]/20">
                <h4 className="font-semibold text-[#003366] mb-2">Find Award Winners</h4>
                <p className="text-[#003366] text-sm mb-3">
                  Search our athlete database to find Most Outstanding Wrestler award winners. These exceptional
                  athletes are marked with special badges in their profiles, highlighting their historic achievements.
                </p>
                <Link href="/athletes">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white text-sm">
                    <Star className="w-4 h-4 mr-2" />
                    Search Award Winners
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
