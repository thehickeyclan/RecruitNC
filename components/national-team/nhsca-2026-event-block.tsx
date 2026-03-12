import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Trophy, Scale, Clock, AlertCircle, Award, BookOpen, ExternalLink, UsersRound, Phone } from "lucide-react"
import Image from "next/image"

/** Shared NHSCA 2026 event content: coaches through competition rules. Used on event page and hub. */
export function NHSCA2026EventBlock() {
  return (
    <>
      {/* Coaching staff */}
      <Card id="coaches" className="border-[#003366]/20 overflow-hidden">
        <CardHeader className="bg-[#003366]/5">
          <CardTitle className="flex items-center gap-2 text-[#002147]">
            <UsersRound className="h-5 w-5" />
            Coaching staff
          </CardTitle>
          <CardDescription>
            NC United NHSCA Duals 2026 is led by Colton Palmer, Michael Macchiavello, and Araad Fischer.
          </CardDescription>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-lg bg-[#D3B574]/20 px-4 py-3 text-[#002147]">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="font-semibold">Main point of contact:</span>
            <a href="tel:+16316625409" className="font-medium hover:underline">Matt Hickey (631) 662-5409</a>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 ring-2 ring-[#003366]/20">
                <Image src="/images/coach-palmer.png" alt="Colton Palmer" fill className="object-cover" sizes="128px" />
              </div>
              <h3 className="text-lg font-bold text-[#002147]">Colton Palmer</h3>
              <p className="text-sm text-gray-600 mb-3">NC United Coach</p>
              <p className="text-sm mb-3">
                <a href="tel:+19194519864" className="text-[#003366] font-medium hover:underline">(919) 451-9864</a>
              </p>
              <ul className="text-left text-sm text-gray-700 space-y-1.5 max-w-xs mx-auto mb-3">
                <li>• NC State alumni, four-year letter winner, team co-captain</li>
                <li>• 2x NCHSAA state champion</li>
                <li>• NC all-time wins leader (284 victories)</li>
                <li>• Co-founder, NC Wrestling United</li>
              </ul>
              <p className="text-xs text-gray-600 italic">&quot;Developing wrestlers with the fundamentals, work ethic, and mental toughness to succeed at any level.&quot;</p>
            </div>
            <div className="text-center">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 ring-2 ring-[#003366]/20">
                <Image src="/images/coach-macchiavello.png" alt="Michael Macchiavello" fill className="object-cover" sizes="128px" />
              </div>
              <h3 className="text-lg font-bold text-[#002147]">Michael Macchiavello</h3>
              <p className="text-sm text-gray-600 mb-3">NC United Coach & Co-Founder</p>
              <p className="text-sm mb-3">
                <a href="tel:+17048917436" className="text-[#003366] font-medium hover:underline">(704) 891-7436</a>
              </p>
              <ul className="text-left text-sm text-gray-700 space-y-1.5 max-w-xs mx-auto mb-3">
                <li>• 2018 NCAA Division I National Champion (NC State)</li>
                <li>• 5-year Team USA National Team member</li>
                <li>• Founder of NC United Wrestling</li>
                <li>• Multiple-time All-American</li>
              </ul>
              <p className="text-xs text-gray-600 italic">&quot;Building champions on and off the mat through elite competition and character development.&quot;</p>
            </div>
            <div className="text-center sm:col-span-2 lg:col-span-1">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100 ring-2 ring-[#003366]/20">
                <Image src="/images/coach-araad-fischer.png" alt="Araad Fischer" fill className="object-cover" sizes="128px" />
              </div>
              <h3 className="text-lg font-bold text-[#002147]">Araad Fischer</h3>
              <p className="text-sm text-gray-600 mb-3">NC United Coach</p>
              <p className="text-sm mb-3">
                <a href="tel:+19194508266" className="text-[#003366] font-medium hover:underline">(919) 450-8266</a>
              </p>
              <ul className="text-left text-sm text-gray-700 space-y-1.5 max-w-xs mx-auto mb-3">
                <li>• Former Duke wrestler, four-year starter</li>
                <li>• North Carolina state finalist</li>
                <li>• High School All-American</li>
              </ul>
              <p className="text-xs text-gray-600 italic">Bringing elite experience and technical depth to the corner.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="event-details">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#003366]" />
            Event at a glance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <p><strong>Event:</strong> NHSCA National Duals 2026</p>
          <p><strong>Dates:</strong> May 23–25, 2026 (Memorial Day Weekend)</p>
          <p className="flex items-start gap-2">
            <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-[#003366]" />
            <span><strong>Venue:</strong> Virginia Beach Sports Center</span>
          </p>
          <p><strong>Boys High School:</strong> 208 teams</p>
          <p className="text-[#003366] font-semibold">Each team is guaranteed a minimum of 6 matches.</p>
          <p className="pt-2 border-t border-gray-200">
            For full details, registration, hotels, and schedule:{" "}
            <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer" className="text-[#003366] font-medium hover:underline inline-flex items-center gap-1">
              nhsca-events.com/national-duals
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#003366]" />
            Virginia Beach Sports Center
          </CardTitle>
          <CardDescription>Host venue for the 27th Annual National Duals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
            <Image
              src="/images/nhsca-virginia-beach-arena.png"
              alt="Virginia Beach Sports Center – NHSCA National Duals venue"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#003366]" />
            Format
          </CardTitle>
          <CardDescription>Pool placement and bracket advancement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-gray-700 text-sm md:text-base">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Day 1</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each team is placed in a pool of 4 teams based on pre-tournament seeds.</li>
              <li>Each team wrestles three times on Day 1.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Day 2</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Each team is placed in a pool of 4 based on Day 1 results.</li>
              <li>Teams that place 1st or 2nd in their Day 1 pool advance to Day 2 Championship pools.</li>
              <li>Teams that place 3rd or 4th in their Day 1 pool go to Day 2 Consolation pools and do not advance to Day 3.</li>
              <li>Each team wrestles a minimum of three times on Day 2.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Day 3</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Teams that place 1st or 2nd in their Day 2 Championship pool advance to the Day 3 Championship Bracket.</li>
              <li>Day 3 Championship brackets are re-seeded based on on-site rosters and results.</li>
              <li>Each team wrestles a minimum of two times on Day 3.</li>
              <li>Pigtail round: winning teams = 3 matches (minimum); losing teams = 2 matches.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[#003366]" />
            Weight classes & weigh-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-700">
          <p>
            <strong>High School weights:</strong> 106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285
            <span className="text-gray-600"> (+3.0 lbs weight allowance)</span>
          </p>
          <p className="font-semibold text-gray-900">Wrestlers must weigh in wearing a singlet.</p>
          <p>
            At weigh-in, actual weight is used to determine eligible weight class. You are eligible for that weight and the weight above.
            <span className="block mt-1 text-gray-600">Example: A high school wrestler who weighs in at 116.0 is eligible for 113 lbs and 120 lbs.</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#003366]" />
            Match times
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700">
          <p><strong>High School division:</strong> 1:30 – 1:30 – 1:30</p>
        </CardContent>
      </Card>

      <Card id="schedule">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#003366]" />
            Schedule
          </CardTitle>
          <CardDescription className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            This tentative schedule is subject to change by the NHSCA and City of Virginia Beach.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-gray-700 text-sm md:text-base">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Friday, May 22</h4>
            <ul className="space-y-1.5">
              <li><strong>2:00 PM</strong> — Pre-purchased team early weigh-ins begin</li>
              <li><strong>3:00 PM</strong> — Onsite early weigh-ins sales begin (teams only; must be purchased by team organizer/contact)</li>
              <li><strong>4:00 PM</strong> — Early weigh-ins end; Virginia Beach Sports Center closed</li>
              <li><strong>6:00 PM</strong> — Regular team weigh-ins begin</li>
              <li><strong>7:30 PM</strong> — Regular team weigh-ins end; Virginia Beach Sports Center closed</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Saturday, May 23</h4>
            <p>Day 1 of competition</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Sunday, May 24</h4>
            <p>Day 2 of competition</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Monday, May 25</h4>
            <p>Day 3 of competition (championship bracket)</p>
          </div>
          <p className="text-gray-600 italic">* Team-specific and pool schedules will be announced prior to the event.</p>
        </CardContent>
      </Card>

      <Card className="border-[#003366]/20 bg-[#003366]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#003366]">
            <Scale className="h-5 w-5" />
            Early weigh-ins (NC United)
          </CardTitle>
          <CardDescription>We have purchased early weigh-ins for the team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-700 text-sm">
          <p>Teams must have <strong>7 wrestlers or more</strong> to participate in early weigh-ins.</p>
          <p><strong>How to pre-purchase:</strong> Team contacts can purchase when the team is registered, or add early weigh-ins after registration if spots are still available. <a href="https://nhsca-events.com/national-duals/" target="_blank" rel="noopener noreferrer" className="text-[#003366] font-medium hover:underline">Click here for directions</a> (official event page).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#003366]" />
            Team awards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-700 text-sm md:text-base">
          <p>The <strong>top 5 finishing teams</strong> in each division receive a team award.</p>
          <p>The top 5 teams receive <strong>medals for wrestlers and coaches</strong>.</p>
          <p>The <strong>1st place team</strong> in each division receives the championship bracket.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#003366]" />
            Competition rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-700 text-sm md:text-base">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Headgear is optional</li>
            <li>Mouth guards for braces are required</li>
            <li>If hair covers are used, they must be legal and attach to the headgear</li>
            <li>College out-of-bounds will be used for all divisions</li>
            <li>Two coaches per corner</li>
            <li>Wrestlers are not required to have a coach in their corner</li>
            <li>The only grooming standard will be fingernail length</li>
            <li>Overtime: :60, :30, :30 and ultimate :30</li>
            <li>Injury time starts once the trainer is on the mat (if the coach treats the wrestler before the trainer arrives, one second will be run off the injury time clock)</li>
            <li>Coaches are required to clean their athletes&apos; blood from the mat</li>
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
