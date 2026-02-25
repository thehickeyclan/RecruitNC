"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, GraduationCap, Heart, Medal, Star, ExternalLink, School, MapPin, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"

const NC_NAVY = "#003366"
const NC_GOLD = "#B5985A"

interface DaveSchultzWinner {
  id: number | string
  year: number
  name: string
  high_school: string
  college: string | null
  hasProfile?: boolean
  athleteId?: string
}

/** RecruitNC athlete profile URL (by id). */
const profileHref = (athleteId: string) => `/unified-profile/${athleteId}`

export default function DaveSchultzAwardPage() {
  const [winners, setWinners] = useState<DaveSchultzWinner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWinners = async () => {
      const [winnersResult, athletesResult] = await Promise.all([
        supabase.from("dave_schultz_award").select("*").order("year", { ascending: false }),
        supabase.from("athletes").select("id, name"),
      ])

      if (!winnersResult.error && winnersResult.data) {
        const athleteMap = new Map(
          (athletesResult.data || []).map((a: { id: string; name: string }) => [a.name.toLowerCase(), a.id]),
        )

        const winnersWithProfileStatus = winnersResult.data.map((winner: Record<string, unknown>) => ({
          ...winner,
          id: winner.id,
          year: winner.year,
          name: (winner.name as string) ?? "",
          high_school: (winner.high_school as string) ?? "",
          college: (winner.college as string | null) ?? null,
          hasProfile: athleteMap.has(((winner.name as string) ?? "").toLowerCase()),
          athleteId: athleteMap.get(((winner.name as string) ?? "").toLowerCase()),
        }))

        setWinners(winnersWithProfileStatus)
      }
      setLoading(false)
    }

    fetchWinners()
  }, [])

  const schoolCounts = winners.reduce(
    (acc, winner) => {
      acc[winner.high_school] = (acc[winner.high_school] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const topSchools = Object.entries(schoolCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative" style={{ backgroundColor: NC_NAVY }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/images/nc-united-logo.png"
              alt="NC Wrestling United"
              width={60}
              height={60}
              className="object-contain"
            />
          </div>
          <p className="text-center text-white/70 text-sm uppercase tracking-wider mb-2">
            National Wrestling Hall of Fame
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
            Dave Schultz High School Excellence Award
          </h1>
          <p className="text-xl text-center text-white/90 max-w-3xl mx-auto">
            Honoring the nation&apos;s most exceptional high school senior wrestlers since 1996
          </p>
          <div className="flex justify-center mt-6">
            <a href="#nc-winners">
              <Button size="lg" className="text-lg font-semibold" style={{ backgroundColor: NC_GOLD, color: NC_NAVY }}>
                {winners.length || 26} North Carolina Winners
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* NWHOF Quote */}
        <div className="mb-12">
          <Card className="border-l-4" style={{ borderLeftColor: NC_GOLD, backgroundColor: "#f8f9fa" }}>
            <CardContent className="p-8">
              <blockquote className="text-lg text-gray-700 italic mb-4">
                &quot;The recipients of our Dave Schultz High School Excellence Award represent an exceptional group of young
                men who have set the standard for achievement — excelling not only in the classroom and on the wrestling
                mat, but also through leadership and service to their communities. We are incredibly grateful to our
                selection committees for their thoughtful and dedicated efforts in choosing such outstanding ambassadors
                for our sport.&quot;
              </blockquote>
              <p className="text-right font-semibold" style={{ color: NC_NAVY }}>
                — Lee Roy Smith, Executive Director, National Wrestling Hall of Fame
              </p>
            </CardContent>
          </Card>
        </div>

        {/* About the Award */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: NC_NAVY }}>
            About the Award
          </h2>
          <Card className="mb-8">
            <CardContent className="p-8">
              <p className="text-lg text-gray-700 mb-6">
                The Dave Schultz High School Excellence Award (DSHSEA) was established in 1996 by the National Wrestling
                Hall of Fame to honor Dave Schultz&apos;s legacy. The award recognizes and celebrates the nation&apos;s most
                outstanding high school senior male wrestlers for their excellence in wrestling, scholastic achievement,
                citizenship, and community service.
              </p>
              <p className="text-lg text-gray-700">
                The award is unique because it evaluates the <strong>complete student-athlete</strong> — winners must
                demonstrate elite achievement across all three criteria, not just on the mat.
              </p>
            </CardContent>
          </Card>

          {/* Award Criteria - 3 Column Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-t-4" style={{ borderTopColor: NC_NAVY }}>
              <CardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: NC_NAVY }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: NC_NAVY }}>
                  Wrestling Excellence
                </h3>
                <p className="text-gray-600">
                  Outstanding success on the mat, including state championships, national placements, and overall
                  competitive achievement.
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4" style={{ borderTopColor: NC_GOLD }}>
              <CardContent className="p-6 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-4" style={{ color: NC_GOLD }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: NC_NAVY }}>
                  Scholastic Achievement
                </h3>
                <p className="text-gray-600">
                  Academic excellence demonstrated through GPA, class rank, and commitment to education alongside
                  athletic pursuits.
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4" style={{ borderTopColor: NC_NAVY }}>
              <CardContent className="p-6 text-center">
                <Heart className="w-12 h-12 mx-auto mb-4" style={{ color: NC_NAVY }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: NC_NAVY }}>
                  Citizenship & Service
                </h3>
                <p className="text-gray-600">
                  Leadership in the community, volunteer work, and positive contributions that reflect the values Dave
                  Schultz embodied.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* About Dave Schultz Section */}
        <div className="mb-16">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Image */}
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-md aspect-[3/4] rounded-lg overflow-hidden shadow-xl bg-gray-200">
                <Image
                  src="https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/wakYAfdTUyi10H5VtK6mI-Dave%20Schultz.webp"
                  alt="Dave Schultz - Olympic Champion and World Champion"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-center text-gray-600 mt-4 italic">
                Dave Schultz (1959–1996) — Olympic Champion, World Champion, and one of the most respected figures in
                American wrestling.
              </p>
            </div>

            {/* Bio */}
            <div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: NC_NAVY }}>
                Remembering Dave Schultz
              </h2>
              <div className="prose prose-lg text-gray-700 mb-8">
                <p>
                  Dave Schultz is widely regarded as one of the greatest and most respected figures in the history of
                  American wrestling. Known for his technical mastery, intelligence, and unmatched sportsmanship,
                  Schultz won an Olympic gold medal in 1984, a World Championship in 1983, seven World medals, and was a
                  member of seven U.S. World or Olympic teams.
                </p>
                <p>
                  More than his competitive résumé, Schultz was celebrated for his generosity, humility, and ability to
                  connect with wrestlers from around the world — often learning their languages, studying their styles,
                  and helping elevate the global wrestling community.
                </p>
                <p>
                  His career was tragically cut short when he was murdered in January 1996. He was inducted into the
                  National Wrestling Hall of Fame as a Distinguished Member in 1997 and as a member of the United World
                  Wrestling Hall of Fame in 2016.
                </p>
              </div>

              {/* Career Highlights */}
              <Card className="border-2" style={{ borderColor: NC_GOLD }}>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: NC_NAVY }}>
                    <Medal className="w-5 h-5" style={{ color: NC_GOLD }} />
                    Career Highlights
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: NC_GOLD }} />
                      <span>Olympic Gold Medalist (1984 Los Angeles)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: NC_GOLD }} />
                      <span>World Champion (1983)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: NC_GOLD }} />
                      <span>7x World/Olympic Medalist</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: NC_GOLD }} />
                      <span>4x NCAA All-American (Oklahoma State)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: NC_GOLD }} />
                      <span>Distinguished Member, National Wrestling Hall of Fame (1997)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: NC_GOLD }} />
                      <span>United World Wrestling Hall of Fame (2016)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Selection Process */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: NC_NAVY }}>
            Selection Process
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: NC_NAVY }}
                >
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="font-bold mb-2" style={{ color: NC_NAVY }}>
                  State Winners
                </h3>
                <p className="text-gray-600 text-sm">
                  Nominations from coaches and state chapters are reviewed to select state winners
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: NC_GOLD }}
                >
                  <span className="font-bold text-xl" style={{ color: NC_NAVY }}>
                    2
                  </span>
                </div>
                <h3 className="font-bold mb-2" style={{ color: NC_NAVY }}>
                  Regional Winners
                </h3>
                <p className="text-gray-600 text-sm">
                  State winners compete for 5 regional titles (NC is in the Southeast Region)
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#991B1B" }}
                >
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-bold mb-2" style={{ color: NC_NAVY }}>
                  National Winner
                </h3>
                <p className="text-gray-600 text-sm">One national winner is selected from the five regional winners</p>
              </CardContent>
            </Card>
          </div>

          {/* Southeast Region Info */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5" style={{ color: NC_GOLD }} />
                <h3 className="font-bold" style={{ color: NC_NAVY }}>
                  Southeast Region
                </h3>
              </div>
              <p className="text-gray-600 text-sm">
                North Carolina competes in the Southeast Region alongside Alabama, Florida, Georgia, Kentucky,
                Louisiana, Mississippi, South Carolina, Tennessee, Virginia, and West Virginia.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Schools Section */}
        {topSchools.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8" style={{ color: NC_NAVY }}>
              NC High Schools with Multiple Winners
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {topSchools.map(([school, count]) => (
                <Badge
                  key={school}
                  className="text-base px-4 py-2"
                  style={{ backgroundColor: NC_GOLD, color: NC_NAVY }}
                >
                  <School className="w-4 h-4 mr-2" />
                  {school} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* NC Winners Table */}
        <div id="nc-winners" className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8" style={{ color: NC_NAVY }}>
            North Carolina Winners
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
                style={{ borderColor: NC_NAVY }}
              />
              <p className="mt-4 text-gray-600">Loading winners...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: NC_NAVY }}>
                      <th className="px-6 py-4 text-left text-white font-semibold">Year</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">Wrestler</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">High School</th>
                      <th className="px-6 py-4 text-left text-white font-semibold">College</th>
                      <th className="px-6 py-4 text-center text-white font-semibold">Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((winner, index) => (
                      <tr key={String(winner.id)} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4">
                          <Badge style={{ backgroundColor: NC_GOLD, color: NC_NAVY }}>{winner.year}</Badge>
                        </td>
                        <td className="px-6 py-4 font-medium" style={{ color: NC_NAVY }}>
                          {winner.name}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{winner.high_school}</td>
                        <td className="px-6 py-4 text-gray-600">{winner.college || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          {winner.hasProfile && winner.athleteId ? (
                            <Link href={profileHref(winner.athleteId)}>
                              <Button variant="outline" size="sm" style={{ borderColor: NC_NAVY, color: NC_NAVY }}>
                                View Profile
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="text-gray-400 border-gray-300 cursor-not-allowed bg-transparent"
                            >
                              No Profile
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y">
                {winners.map((winner) => (
                  <div key={String(winner.id)} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge style={{ backgroundColor: NC_GOLD, color: NC_NAVY }}>{winner.year}</Badge>
                      {winner.hasProfile && winner.athleteId ? (
                        <Link href={profileHref(winner.athleteId)}>
                          <Button variant="outline" size="sm" style={{ borderColor: NC_NAVY, color: NC_NAVY }}>
                            View Profile
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="text-gray-400 border-gray-300 cursor-not-allowed bg-transparent"
                        >
                          No Profile
                        </Button>
                      )}
                    </div>
                    <div className="font-semibold text-lg" style={{ color: NC_NAVY }}>
                      {winner.name}
                    </div>
                    <div className="text-gray-600 text-sm">{winner.high_school}</div>
                    {winner.college && (
                      <div className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        {winner.college}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Honors Weekend */}
        <div className="mb-16">
          <Card style={{ backgroundColor: "#f8f9fa" }}>
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6" style={{ color: NC_GOLD }} />
                <h3 className="text-xl font-bold" style={{ color: NC_NAVY }}>
                  Honors Weekend
                </h3>
              </div>
              <p className="text-gray-700 mb-4">
                National winners are honored each June during the National Wrestling Hall of Fame&apos;s Honors Weekend in
                Stillwater, Oklahoma. The Hall of Fame proudly tracks these award winners as they continue their success
                at the collegiate and international levels.
              </p>
              <p className="text-sm text-gray-500">
                The High School Excellence Awards are proudly sponsored by the Hyman Family.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Nomination CTA */}
        <div className="text-center">
          <Card style={{ backgroundColor: NC_NAVY }}>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-white mb-4">Nominate a Worthy Candidate</h3>
              <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                Nominations are accepted from coaches and state chapters of the National Wrestling Hall of Fame. Help
                recognize NC&apos;s outstanding student-athletes.
              </p>
              <a
                href="https://nwhof.org/national-wrestling-hall-of-fame/nomination-forms/tricia-saunders-and-dave-schultz-high-school-excellence-award"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="text-lg" style={{ backgroundColor: NC_GOLD, color: NC_NAVY }}>
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Learn More at NWHOF.org
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-white" style={{ backgroundColor: NC_NAVY }}>
        <p className="text-white/60 text-sm">
          Data compiled by NC Wrestling United. For corrections, use the Report Data Issue feature.
        </p>
      </footer>
    </div>
  )
}
