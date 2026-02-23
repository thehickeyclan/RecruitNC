"use client"

import { useState, useEffect } from "react"
import { Award, Trophy, GraduationCap, Users, ExternalLink, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import Link from "next/link"

interface TriciaSaundersWinner {
  id: number | string
  year: number
  name: string
  high_school: string
  city: string | null
  college: string | null
}

/** RecruitNC athlete profile URL (by id). */
const profileHref = (athleteId: string) => `/unified-profile/${athleteId}`

export default function TriciaSaundersAwardPage() {
  const [winners, setWinners] = useState<TriciaSaundersWinner[]>([])
  const [loading, setLoading] = useState(true)
  const [athleteProfiles, setAthleteProfiles] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchData() {
      const [winnersResult, athletesResult] = await Promise.all([
        supabase.from("tricia_saunders_award").select("*").order("year", { ascending: false }),
        supabase.from("athletes").select("id, name"),
      ])

      if (!winnersResult.error && winnersResult.data) {
        setWinners(winnersResult.data as TriciaSaundersWinner[])

        const names = winnersResult.data.map((w: { name?: string }) => w.name)
        const profiles = (athletesResult.data ?? []).filter(
          (p: { name?: string | null }) => p.name != null && names.includes(p.name),
        ) as { id: string; name: string }[]
        const profileMap: Record<string, string> = {}
        profiles.forEach((p) => {
          profileMap[p.name] = p.id
        })
        setAthleteProfiles(profileMap)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  // Count schools with multiple winners
  const schoolCounts: Record<string, number> = {}
  winners.forEach((w) => {
    schoolCounts[w.high_school] = (schoolCounts[w.high_school] || 0) + 1
  })
  const multiWinnerSchools = Object.entries(schoolCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0a1628] to-[#1a365d] text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4 md:mb-6">
            <Image
              src="/images/nc-united-logo.png"
              alt="NC Wrestling United"
              width={80}
              height={80}
              className="rounded-full w-16 h-16 md:w-20 md:h-20"
            />
          </div>
          <p className="text-[#d4a855] font-semibold mb-2 text-sm md:text-base">National Wrestling Hall of Fame</p>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 px-2">
            Tricia Saunders High School Excellence Award
          </h1>
          <p className="text-base md:text-xl text-gray-300 mb-6 md:mb-8 px-4">
            Honoring the nation&apos;s most exceptional high school senior female wrestlers since 2018
          </p>
          <a href="#nc-winners">
            <Button className="bg-[#d4a855] hover:bg-[#c49745] text-[#0a1628] font-semibold px-6 md:px-8 py-2 md:py-3 text-sm md:text-base">
              {winners.length} North Carolina Winners
            </Button>
          </a>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-8 md:py-12 bg-gradient-to-r from-[#f8f4eb] to-[#fff9ed]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Quote className="w-8 h-8 md:w-12 md:h-12 text-[#d4a855] mx-auto mb-4 md:mb-6" />
            <blockquote className="text-lg md:text-2xl text-gray-700 italic mb-4 md:mb-6 px-2">
              &quot;The Tricia Saunders High School Excellence Award recognizes the complete student-athlete—one who
              excels on the mat, in the classroom, and in her community. These young women represent the future of our
              sport and embody the pioneering spirit of women&apos;s wrestling.&quot;
            </blockquote>
            <p className="text-gray-600 font-semibold text-sm md:text-base">— National Wrestling Hall of Fame</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
            <div className="relative order-2 md:order-1">
              <Image
                src="/images/image.png"
                alt="Tricia Saunders competing"
                width={500}
                height={400}
                className="rounded-lg shadow-xl w-full h-auto"
              />
              <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 bg-[#d4a855] text-[#0a1628] px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold shadow-lg text-sm md:text-base">
                4x World Champion
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl md:text-3xl font-bold text-[#0a1628] mb-4 md:mb-6">Honoring Tricia Saunders</h2>
              <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                Four-time World Champion and women&apos;s wrestling pioneer Tricia Saunders is the first woman ever
                inducted as a Distinguished Member of the National Wrestling Hall of Fame.
              </p>
              <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                Saunders captured World Championship gold medals in 1992, 1996, 1998 and 1999. The first U.S. woman to
                win a World wrestling title, she is the only American to win more than two.
              </p>
              <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">
                She won a record 11 U.S. National Women&apos;s Freestyle championships and triumphed at 11 World Team
                Trials. When she completed her competitive career in 2001, she had never lost a single match to a U.S.
                competitor.
              </p>
              <p className="text-gray-600 text-sm md:text-base">
                As a strong advocate for women&apos;s wrestling, Saunders served in leadership positions in USA
                Wrestling and pushed for women&apos;s opportunities in the sport. She was named the first-ever USA
                Wrestling Woman of the Year in 1997.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Award Criteria */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#0a1628] mb-8 md:mb-12">About the Award</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <Card className="text-center border-t-4 border-t-[#d4a855]">
              <CardContent className="pt-6 md:pt-8 px-4">
                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-[#d4a855] mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-bold text-[#0a1628] mb-2">Wrestling Excellence</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Outstanding achievement and success on the wrestling mat at the high school level
                </p>
              </CardContent>
            </Card>
            <Card className="text-center border-t-4 border-t-[#d4a855]">
              <CardContent className="pt-6 md:pt-8 px-4">
                <GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-[#d4a855] mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-bold text-[#0a1628] mb-2">Academic Achievement</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Excellence in the classroom demonstrating commitment to education
                </p>
              </CardContent>
            </Card>
            <Card className="text-center border-t-4 border-t-[#d4a855]">
              <CardContent className="pt-6 md:pt-8 px-4">
                <Users className="w-10 h-10 md:w-12 md:h-12 text-[#d4a855] mx-auto mb-3 md:mb-4" />
                <h3 className="text-lg md:text-xl font-bold text-[#0a1628] mb-2">Character & Service</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Citizenship and community service reflecting strong moral character
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Selection Process */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#0a1628] mb-8 md:mb-12">Selection Process</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#0a1628] text-white rounded-full flex items-center justify-center text-xl md:text-2xl font-bold mx-auto mb-3 md:mb-4">
                1
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#0a1628] mb-2">State Winner</h3>
              <p className="text-gray-600 text-sm md:text-base">Selected by each state&apos;s wrestling chapter</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#0a1628] text-white rounded-full flex items-center justify-center text-xl md:text-2xl font-bold mx-auto mb-3 md:mb-4">
                2
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#0a1628] mb-2">Regional Winner</h3>
              <p className="text-gray-600 text-sm md:text-base">NC competes in the Southeast Region</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-[#d4a855] text-[#0a1628] rounded-full flex items-center justify-center text-xl md:text-2xl font-bold mx-auto mb-3 md:mb-4">
                3
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#0a1628] mb-2">National Winner</h3>
              <p className="text-gray-600 text-sm md:text-base">Honored at NWHOF Honors Weekend in Stillwater, OK</p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Winner Schools */}
      {multiWinnerSchools.length > 0 && (
        <section className="py-8 md:py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold text-center text-[#0a1628] mb-6 md:mb-8">
              NC High Schools with Multiple Winners
            </h2>
            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
              {multiWinnerSchools.map(([school, count]) => (
                <Badge key={school} className="bg-[#0a1628] text-white px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-lg">
                  {school} ({count})
                </Badge>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* NC Winners Table */}
      <section id="nc-winners" className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#0a1628] mb-8 md:mb-12">
            North Carolina Winners
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a855] mx-auto" />
              <p className="mt-4 text-gray-600">Loading winners...</p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <div className="bg-[#0a1628] text-white rounded-t-lg">
                  <div className="grid grid-cols-5 gap-4 p-4 font-semibold">
                    <div>Year</div>
                    <div>Wrestler</div>
                    <div>High School</div>
                    <div>College</div>
                    <div>Profile</div>
                  </div>
                </div>
                <div className="border border-t-0 rounded-b-lg divide-y">
                  {winners.map((winner) => (
                    <div key={String(winner.id)} className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-gray-50">
                      <div>
                        <Badge className="bg-[#d4a855] text-[#0a1628] hover:bg-[#c49745]">{winner.year}</Badge>
                      </div>
                      <div className="font-semibold text-[#0a1628]">{winner.name}</div>
                      <div className="text-gray-600">{winner.high_school}</div>
                      <div className="text-gray-600">{winner.college || "—"}</div>
                      <div>
                        {athleteProfiles[winner.name] ? (
                          <Link href={profileHref(athleteProfiles[winner.name])}>
                            <Button variant="outline" size="sm">
                              View Profile
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="opacity-50 bg-transparent">
                            No Profile
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {winners.map((winner) => (
                  <Card key={String(winner.id)} className="border border-gray-200 overflow-hidden">
                    <div className="bg-[#0a1628] px-4 py-2 flex items-center justify-between">
                      <Badge className="bg-[#d4a855] text-[#0a1628]">{winner.year}</Badge>
                      {athleteProfiles[winner.name] ? (
                        <Link href={profileHref(athleteProfiles[winner.name])}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-white border-white hover:bg-white hover:text-[#0a1628] bg-transparent"
                          >
                            View Profile
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="opacity-50 text-white/50 border-white/50 bg-transparent"
                        >
                          No Profile
                        </Button>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <div className="font-semibold text-[#0a1628] text-lg">{winner.name}</div>
                      <div className="text-gray-600 text-sm">{winner.high_school}</div>
                      {winner.college && (
                        <div className="text-gray-500 text-sm flex items-center gap-1">
                          <GraduationCap className="w-4 h-4" />
                          {winner.college}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Nomination CTA */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-[#0a1628] to-[#1a365d] text-white">
        <div className="container mx-auto px-4 text-center">
          <Award className="w-12 h-12 md:w-16 md:h-16 text-[#d4a855] mx-auto mb-4 md:mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Know an Outstanding Female Wrestler?</h2>
          <p className="text-base md:text-xl text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Nominate a deserving senior who excels in wrestling, academics, and community service for the Tricia
            Saunders High School Excellence Award.
          </p>
          <a
            href="https://nwhof.org/national-wrestling-hall-of-fame/nomination-forms/tricia-saunders-and-dave-schultz-high-school-excellence-award"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-[#d4a855] hover:bg-[#c49745] text-[#0a1628] font-semibold px-6 md:px-8 py-2 md:py-3 text-sm md:text-base">
              <ExternalLink className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Submit a Nomination
            </Button>
          </a>
          <p className="text-xs md:text-sm text-gray-400 mt-4">Award sponsored by the Hyman Family</p>
        </div>
      </section>
    </div>
  )
}
