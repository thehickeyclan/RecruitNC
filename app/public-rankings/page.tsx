"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users, Target, Award, TrendingUp } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"

export default function PublicRankingsHomepage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-[#03154C] text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Recruit<span className="underline decoration-2 underline-offset-4 text-[#D3B574]">NC</span> College
                <br />
                Prospect Rankings
              </h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                Official prospect rankings for North Carolina wrestling from a college recruiting perspective
              </p>
            </div>
          </div>
        </div>

        {/* Class Links Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#03154C] mb-4">Current Rankings</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Select a graduation class to view detailed prospect rankings with filters for men's and women's wrestling
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link href="/public-rankings/2026">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-[#D3B574]">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-[#03154C]">Class of 2026</CardTitle>
                  <CardDescription className="text-lg">
                    Seniors entering their final recruiting cycle and solidifying college commitments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center gap-2 text-[#03154C] font-semibold">
                    View Rankings
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/public-rankings/2027">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-[#D3B574]">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-[#03154C]">Class of 2027</CardTitle>
                  <CardDescription className="text-lg">
                    Juniors climbing the ranks and preparing for the next recruiting stage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center gap-2 text-[#03154C] font-semibold">
                    View Rankings
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Our Approach section */}
        <div className="bg-gray-50 border-y">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-[#03154C] mb-8 text-center">Our Approach</h2>
              <div className="text-center mb-12">
                <p className="text-lg leading-relaxed text-gray-700 max-w-3xl mx-auto">
                  Our rankings are designed from a college recruiting perspective. They are not just a reflection of
                  local results, but an evaluation of how athletes perform against the highest levels of national
                  competition.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <Card className="text-center">
                  <CardHeader>
                    <Target className="h-8 w-8 text-[#D3B574] mx-auto mb-2" />
                    <CardTitle className="text-lg text-[#03154C]">Quality of Wins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Victories against nationally ranked opponents carry the greatest weight
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Award className="h-8 w-8 text-[#D3B574] mx-auto mb-2" />
                    <CardTitle className="text-lg text-[#03154C]">Elite Tournaments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Performance at Super 32, Journeymen, NHSCA Nationals, and other top events
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <TrendingUp className="h-8 w-8 text-[#D3B574] mx-auto mb-2" />
                    <CardTitle className="text-lg text-[#03154C]">College Opens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Results at NCAA-sanctioned opens provide insight into college readiness
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Users className="h-8 w-8 text-[#D3B574] mx-auto mb-2" />
                    <CardTitle className="text-lg text-[#03154C]">In-State Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      Emphasis on matches against elite in-state opponents with national credentials
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-[#D3B574]/10 border border-[#D3B574]/20 p-8 rounded-lg text-center">
                <h3 className="text-xl font-semibold text-[#03154C] mb-4">Our Goal</h3>
                <p className="text-[#03154C] leading-relaxed text-lg">
                  To highlight athletes whose achievements best translate to success at the college level, ensuring that
                  rankings reflect both accomplishment and projection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
