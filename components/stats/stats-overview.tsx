import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Calendar, Award } from "lucide-react"

type StatsOverviewProps = {
  totalCommitments: number
  classOf2025: number
  classOf2026: number
  divisionBreakdown: {
    D1: number
    D2: number
    D3: number
    NAIA: number
    JuCo: number
    Unknown?: number
  }
}

export function StatsOverview({
  totalCommitments = 0,
  classOf2025 = 0,
  classOf2026 = 0,
  divisionBreakdown = { D1: 0, D2: 0, D3: 0, NAIA: 0, JuCo: 0 },
}: StatsOverviewProps) {
  // Ensure all values are numbers and not undefined
  const ensureNumber = (value: any): number => {
    return typeof value === "number" ? value : 0
  }

  // Log the props for debugging
  console.log("StatsOverview props:", { totalCommitments, classOf2025, classOf2026, divisionBreakdown })

  const stats = [
    {
      title: "Total Commitments",
      value: ensureNumber(totalCommitments),
      icon: Trophy,
      description: "NC wrestlers committed to colleges",
      color: "bg-[#0a1e50] text-white", // Blue
    },
    {
      title: "Class of 2025",
      value: ensureNumber(classOf2025),
      icon: Calendar,
      description: "Current year commitments",
      color: "bg-[#c8102e] text-white", // Red
    },
    {
      title: "Class of 2026",
      value: ensureNumber(classOf2026),
      icon: Calendar,
      description: "Next year commitments",
      color: "bg-[#0a1e50] text-white", // Blue
    },
    {
      title: "Division Breakdown",
      icon: Award,
      color: "bg-[#c8102e] text-white", // Red
      isDivisionBreakdown: true,
      divisions: [
        { name: "D1", value: ensureNumber(divisionBreakdown?.D1) },
        { name: "D2", value: ensureNumber(divisionBreakdown?.D2) },
        { name: "D3", value: ensureNumber(divisionBreakdown?.D3) },
        { name: "NAIA", value: ensureNumber(divisionBreakdown?.NAIA) },
        { name: "JuCo", value: ensureNumber(divisionBreakdown?.JuCo) },
      ],
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className={`border-0 ${stat.color}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 opacity-75" />
          </CardHeader>
          <CardContent>
            {stat.isDivisionBreakdown ? (
              <div className="flex flex-wrap gap-2">
                {stat.divisions.map((div, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="text-lg font-bold">{div.value.toString()}</div>
                    <p className="text-xs opacity-75">{div.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stat.value.toString()}</div>
                <p className="text-xs opacity-75">{stat.description}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
