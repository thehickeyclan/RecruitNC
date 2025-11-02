"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, GraduationCap, Target, Users, Zap, Dumbbell } from "lucide-react"

export function RankingCriteria() {
  const criteria = [
    {
      rank: 1,
      title: "College Readiness",
      icon: <GraduationCap className="h-5 w-5" />,
      description: "Academic performance, maturity, work ethic, and preparedness for collegiate wrestling demands",
      details: [
        "GPA and academic standing",
        "Mental maturity and coachability",
        "Work ethic and dedication",
        "Leadership qualities",
        "Ability to handle pressure",
      ],
      color: "bg-[#0a1e50] text-white", // Navy
    },
    {
      rank: 2,
      title: "National Tournament Results and College Opens",
      icon: <Trophy className="h-5 w-5" />,
      description:
        "Performance at national-level competitions including Fargo, Super 32, FloNationals, Beast of the East, and college opens",
      details: [
        "Fargo Nationals placement",
        "Super 32 performance",
        "FloNationals results",
        "Beast of the East showing",
        "College open tournament results",
      ],
      color: "bg-[#c8102e] text-white", // Red
    },
    {
      rank: 3,
      title: "State Tournament Performance",
      icon: <Target className="h-5 w-5" />,
      description: "Consistency and performance at NCHSAA state championships across multiple years",
      details: [
        "State championship titles",
        "State tournament placements",
        "Year-over-year improvement",
        "Performance under pressure",
        "Clutch match victories",
      ],
      color: "bg-[#f1c400] text-black", // Gold
    },
    {
      rank: 4,
      title: "Head-to-Head Competition",
      icon: <Users className="h-5 w-5" />,
      description: "Direct competition results against other ranked wrestlers and quality opponents",
      details: [
        "Wins vs. ranked opponents",
        "Quality of competition faced",
        "Dual meet performance",
        "Tournament bracket advancement",
        "Consistency against top competition",
      ],
      color: "bg-gray-600 text-white",
    },
    {
      rank: 5,
      title: "Technical Skill Development",
      icon: <Zap className="h-5 w-5" />,
      description: "Wrestling technique, tactical awareness, and skill progression throughout high school career",
      details: [
        "Technical wrestling ability",
        "Tactical match awareness",
        "Skill development trajectory",
        "Adaptability in matches",
        "Wrestling IQ demonstration",
      ],
      color: "bg-gray-500 text-white",
    },
    {
      rank: 6,
      title: "Physical Attributes",
      icon: <Dumbbell className="h-5 w-5" />,
      description: "Strength, speed, conditioning, and physical development relative to competition level",
      details: [
        "Strength relative to weight class",
        "Speed and agility",
        "Cardiovascular conditioning",
        "Physical development potential",
        "Injury history and durability",
      ],
      color: "bg-gray-400 text-white",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#0a1e50] mb-4">NC Wrestling Prospect Ranking Criteria</h2>
        <p className="text-lg text-gray-600 max-w-4xl mx-auto">
          Our rankings prioritize <span className="font-semibold text-[#c8102e]">college readiness</span> above all
          else, recognizing that successful collegiate wrestlers must excel both on the mat and in the classroom.
          National-level competition results provide the most accurate assessment of competitive ability.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {criteria.map((criterion) => (
          <Card key={criterion.rank} className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Badge className={`${criterion.color} text-lg px-3 py-1`}>#{criterion.rank}</Badge>
                <div className={`p-2 rounded-lg ${criterion.color}`}>{criterion.icon}</div>
                <div>
                  <CardTitle className="text-xl text-[#0a1e50]">{criterion.title}</CardTitle>
                </div>
              </div>
              <CardDescription className="text-base mt-2">{criterion.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {criterion.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-[#c8102e] mt-1">•</span>
                    <span className="text-gray-700">{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-[#0a1e50] text-white p-6 rounded-lg mt-8">
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Why College Readiness Comes First
        </h3>
        <p className="text-lg leading-relaxed">
          While wrestling ability is crucial, the most successful college wrestlers are those who can handle the
          academic demands, time management challenges, and mental pressures of collegiate athletics. A wrestler who
          excels in the classroom and demonstrates maturity will have more opportunities and greater long-term success
          than one who relies solely on athletic ability.
        </p>
      </div>
    </div>
  )
}
