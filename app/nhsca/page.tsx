"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Calendar, Users, Target, Star, TrendingUp, Search, ExternalLink } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { NHSCACountdown } from "@/components/nhsca-countdown"
import { NHSCADivisionStats } from "@/components/nhsca-division-stats"

export default function NHSCAOverview() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Browse Archive hero section at the top */}
        <div className="bg-[#002147] rounded-xl p-4 md:p-8 mb-6 md:mb-8 text-center">
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-4 md:mb-6">
            <Image
              src="/images/nhsca-logo.png"
              alt="NHSCA Logo"
              width={160}
              height={160}
              className="object-contain w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
            NHSCA National Championships
          </h1>
          <p className="text-white/80 text-sm sm:text-base md:text-lg mb-4 md:mb-6">
            The Premier High School Wrestling Tournament
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 md:gap-4 flex-wrap">
            <a href="/nhsca-live" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-[#B31B1B] hover:bg-[#B31B1B]/90 text-white font-bold text-base md:text-lg px-4 md:px-8 py-3 md:py-6 border-2 border-[#D3B574] shadow-lg">
                <span className="relative mr-2 inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                View Live Dashboard
              </Button>
            </a>
            <Link href="/nhsca/2025" className="w-full sm:w-auto">
              <Button className="bg-white hover:bg-white/90 text-[#002147] font-bold text-base md:text-lg px-4 md:px-8 py-3 md:py-6 w-full sm:w-auto">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                2025 Results
              </Button>
            </Link>
            <Link href="/nhsca/archive" className="w-full sm:w-auto">
              <Button className="bg-[#CBAF5D] hover:bg-[#CBAF5D]/90 text-[#002147] font-bold text-base md:text-lg px-4 md:px-8 py-3 md:py-6 w-full sm:w-auto">
                <Search className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Browse Archive
              </Button>
            </Link>
          </div>
        </div>

        {/* Tournament Overview */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 border-2 border-[#002147]">
            <CardHeader className="bg-[#002147] text-white">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                About NHSCA Nationals
              </CardTitle>
              <CardDescription className="text-white/80">
                The most prestigious high school wrestling tournament in America
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-[#B31B1B] text-white p-3 md:p-4 rounded-lg mb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-base md:text-lg flex items-center gap-2 flex-wrap">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                        <span>Next Tournament: March 27–29, 2026</span>
                      </h4>
                      <p className="text-white/90 text-xs md:text-sm mt-1">
                        Virginia Beach Convention Center, Virginia Beach, VA
                      </p>
                    </div>
                    <a
                      href="https://nhsca-events.com/high-school-nationals/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-[#CBAF5D] text-[#002147] font-bold px-4 md:px-6 py-2 rounded-lg hover:bg-[#CBAF5D]/90 transition-colors w-full md:w-auto"
                    >
                      Register Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {/* End tournament banner */}

                {/* Countdown Clock */}
                <NHSCACountdown targetDate={new Date("2026-03-27")} />

                <p className="text-[#002147] leading-relaxed">
                  The National High School Coaches Association (NHSCA) National Championships represents the pinnacle of
                  high school wrestling competition. Each year, the nation&apos;s top wrestlers compete across four divisions
                  - Freshman, Sophomore, Junior, and Senior - for the coveted title of NHSCA All-American.
                </p>
                <p className="text-[#002147] leading-relaxed">
                  Only the top 8 finishers in each weight class earn All-American status, making this one of the most
                  exclusive honors in high school wrestling. NC United has proudly sent numerous wrestlers to this
                  prestigious tournament, with many achieving All-American recognition.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-[#CBAF5D]/10 p-4 rounded-lg border border-[#CBAF5D]/30">
                    <h4 className="font-semibold text-[#002147] mb-2">Tournament Format</h4>
                    <ul className="text-sm space-y-2 text-[#002147]/80">
                      <li>
                        <strong>Divisions by grade level:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>• Freshman, Sophomore, Junior, Senior</li>
                          <li>• High School Girls (9–12)</li>
                          <li>• Middle School (6–8)</li>
                        </ul>
                      </li>
                      <li>
                        <strong>Weight classes per division:</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>• Boys Freshman, Sophomore, Junior, Senior: ~14 weight classes (e.g., 106–285 lb)</li>
                          <li>• High School Girls: Girls weights (e.g., 100–235 lb)</li>
                          <li>• Middle School: Their own weight classes</li>
                        </ul>
                      </li>
                      <li>• Full bracket competition with consolation/wrestlebacks: Wrestlers compete through brackets that include championship and consolation paths (allowing placement matches)</li>
                      <li>• Top finishers earn All-American status: Top 8 place finishers in each weight class receive official All-American recognition</li>
                    </ul>
                  </div>
                  <div className="bg-[#002147]/5 p-4 rounded-lg border border-[#002147]/20">
                    <h4 className="font-semibold text-[#002147] mb-2">Qualification</h4>
                    <ul className="text-sm space-y-2 text-[#002147]/80">
                      <li>• <strong>Open registration:</strong> Wrestlers do not need to qualify by placing in state tournaments or regionals — they register directly for the event</li>
                      <li>• <strong>Registration capacity limits:</strong> Each division has a maximum number of entries (e.g., Freshman, Sophomore, Junior, Senior, Girls, Middle School) — once full, registration closes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Quick Stats - NC Gold */}
            <Card className="border-2 border-[#CBAF5D]">
              <CardHeader className="bg-[#CBAF5D] text-[#002147]">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Tournament Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#002147]/80">Total Divisions</span>
                    <Badge className="bg-[#002147]">4</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#002147]/80">Weight Classes</span>
                    <Badge className="bg-[#002147]">14 per division</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#002147]/80">All-Americans</span>
                    <Badge className="bg-[#CBAF5D] text-[#002147]">Top 8 per weight</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#002147]/80">Archive Years</span>
                    <Badge className="bg-[#B31B1B] text-white">1990-2025</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NC United Highlights - NC Red */}
            <Card className="border-2 border-[#B31B1B]">
              <CardHeader className="bg-[#B31B1B] text-white">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  NC United Legacy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="bg-[#CBAF5D]/10 p-3 rounded border border-[#CBAF5D]/30">
                    <div className="font-semibold text-[#002147]">Champions</div>
                    <div className="text-[#002147]/80">Multiple NHSCA National Champions</div>
                  </div>
                  <div className="bg-[#002147]/5 p-3 rounded border border-[#002147]/20">
                    <div className="font-semibold text-[#002147]">All-Americans</div>
                    <div className="text-[#002147]/80">Dozens of All-American honors</div>
                  </div>
                  <div className="bg-[#B31B1B]/5 p-3 rounded border border-[#B31B1B]/20">
                    <div className="font-semibold text-[#002147]">Growth</div>
                    <div className="text-[#002147]/80">Consistent representation since 1990</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Division Breakdown */}
        <Card className="mb-8 border-2 border-[#002147]/20">
          <CardHeader>
            <CardTitle className="text-[#002147] flex items-center gap-2">
              <Users className="w-6 h-6" />
              Division Breakdown
            </CardTitle>
            <CardDescription className="text-[#002147]/70">
              Understanding the four competitive divisions at NHSCA Nationals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="freshman" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-[#002147]/5">
                <TabsTrigger
                  value="freshman"
                  className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
                >
                  Freshman
                </TabsTrigger>
                <TabsTrigger
                  value="sophomore"
                  className="data-[state=active]:bg-[#002147] data-[state=active]:text-white"
                >
                  Sophomore
                </TabsTrigger>
                <TabsTrigger value="junior" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">
                  Junior
                </TabsTrigger>
                <TabsTrigger value="senior" className="data-[state=active]:bg-[#002147] data-[state=active]:text-white">
                  Senior
                </TabsTrigger>
              </TabsList>

              <TabsContent value="freshman" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#002147] mb-3">Freshman Division</h3>
                    <p className="text-[#002147]/80 mb-4">
                      The entry point for high school wrestling excellence. Freshman wrestlers compete for their first
                      taste of national-level competition.
                    </p>
                    <ul className="space-y-2 text-sm text-[#002147]/80">
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#CBAF5D]" />
                        First-year high school students only
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#CBAF5D]" />
                        Foundation for future success
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#CBAF5D]" />
                        Builds tournament experience
                      </li>
                    </ul>
                  </div>
                  <NHSCADivisionStats division="Freshman" />
                </div>
              </TabsContent>

              <TabsContent value="sophomore" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#002147] mb-3">Sophomore Division</h3>
                    <p className="text-[#002147]/80 mb-4">
                      Second-year wrestlers with growing experience and technical skills. The competition intensifies as
                      wrestlers develop their signature moves.
                    </p>
                    <ul className="space-y-2 text-sm text-[#002147]/80">
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#002147]" />
                        Second-year high school students
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#002147]" />
                        Increased technical proficiency
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#002147]" />
                        Building toward varsity success
                      </li>
                    </ul>
                  </div>
                  <NHSCADivisionStats division="Sophomore" />
                </div>
              </TabsContent>

              <TabsContent value="junior" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#002147] mb-3">Junior Division</h3>
                    <p className="text-[#002147]/80 mb-4">
                      Third-year wrestlers approaching their peak high school performance. Many are varsity starters
                      with college recruitment beginning.
                    </p>
                    <ul className="space-y-2 text-sm text-[#002147]/80">
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#CBAF5D]" />
                        Third-year high school students
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#CBAF5D]" />
                        College recruitment active
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#CBAF5D]" />
                        Peak technical development
                      </li>
                    </ul>
                  </div>
                  <NHSCADivisionStats division="Junior" />
                </div>
              </TabsContent>

              <TabsContent value="senior" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#002147] mb-3">Senior Division</h3>
                    <p className="text-[#002147]/80 mb-4">
                      The pinnacle of high school wrestling. Senior wrestlers compete in their final NHSCA tournament,
                      often with college commitments secured.
                    </p>
                    <ul className="space-y-2 text-sm text-[#002147]/80">
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#B31B1B]" />
                        Final year of high school eligibility
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#B31B1B]" />
                        Peak performance level
                      </li>
                      <li className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#B31B1B]" />
                        College-bound athletes
                      </li>
                    </ul>
                  </div>
                  <NHSCADivisionStats division="Senior" />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
