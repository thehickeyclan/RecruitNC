"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Trophy, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"

// This would ideally come from a database or CMS
// For now, we'll use a simple structure that can be easily updated
interface RankingUpdate {
  id: string
  date: string
  year: string
  title: string
  summary: string
  changes: {
    type: "movement" | "new" | "commitment" | "achievement"
    description: string
  }[]
  highlights?: string[]
}

// Example updates - in production, this would come from a database
const rankingUpdates: RankingUpdate[] = [
  {
    id: "2025-01-15-2026",
    date: "2025-01-15",
    year: "2026",
    title: "Class of 2026 Rankings Update - January 2025",
    summary: "Major updates following post-season tournament results and new college commitments.",
    changes: [
      {
        type: "movement",
        description: "Lorenzo Alston moves to #1 after strong NHSCA performance",
      },
      {
        type: "new",
        description: "3 new athletes enter the top 30 rankings",
      },
      {
        type: "commitment",
        description: "Bentley Sly commits to NC State, maintaining #2 ranking",
      },
      {
        type: "achievement",
        description: "8 athletes achieve All-American status at NHSCA Nationals",
      },
    ],
    highlights: [
      "Top 10 remains stable with minor adjustments",
      "Increased depth in 150-165 weight classes",
      "Strong showing from NC United Blue program athletes",
    ],
  },
  {
    id: "2025-01-15-2027",
    date: "2025-01-15",
    year: "2027",
    title: "Class of 2027 Rankings Update - January 2025",
    summary: "First major update of 2025 season with new tournament results and achievements.",
    changes: [
      {
        type: "movement",
        description: "Significant movement in top 20 after state qualifiers",
      },
      {
        type: "new",
        description: "5 new athletes debut in top 30",
      },
      {
        type: "achievement",
        description: "Multiple state championship performances impact rankings",
      },
    ],
    highlights: [
      "Emerging talent in lower weight classes",
      "Strong academic profiles across the board",
      "Early recruiting interest from D1 programs",
    ],
  },
]

function getChangeIcon(type: RankingUpdate["changes"][0]["type"]) {
  switch (type) {
    case "movement":
      return <TrendingUp className="h-4 w-4" />
    case "new":
      return <Users className="h-4 w-4" />
    case "commitment":
      return <Trophy className="h-4 w-4" />
    case "achievement":
      return <Trophy className="h-4 w-4" />
    default:
      return null
  }
}

function getChangeColor(type: RankingUpdate["changes"][0]["type"]) {
  switch (type) {
    case "movement":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "new":
      return "bg-green-100 text-green-800 border-green-200"
    case "commitment":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "achievement":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function RankingUpdatesPage() {
  const searchParams = useSearchParams()
  const yearParam = searchParams.get("year")
  const dateParam = searchParams.get("date")

  // Filter updates based on query parameters
  const filteredUpdates = useMemo(() => {
    let filtered = rankingUpdates

    if (yearParam) {
      filtered = filtered.filter((update) => update.year === yearParam)
    }

    if (dateParam) {
      filtered = filtered.filter((update) => update.date === dateParam)
    }

    // Sort by date descending (most recent first)
    return filtered.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [yearParam, dateParam])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/public-rankings">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rankings
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Rankings Updates</h1>
            <p className="text-lg text-gray-600">
              Stay informed about changes to our prospect rankings, including movements, new entries, commitments, and achievements.
            </p>
            {(yearParam || dateParam) && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {yearParam && (
                  <Badge className="bg-[#03154C] text-white">
                    Class of {yearParam}
                  </Badge>
                )}
                {dateParam && (
                  <Badge variant="outline">
                    {new Date(dateParam).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Badge>
                )}
                <Link href="/rankings/updates">
                  <Button variant="ghost" size="sm">
                    Clear filters
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Updates List */}
          <div className="space-y-6">
            {filteredUpdates.map((update) => (
              <Card key={update.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-[#B31B1B] text-white">
                          Class of {update.year}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {new Date(update.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <CardTitle className="text-2xl mb-2">{update.title}</CardTitle>
                      <CardDescription className="text-base">{update.summary}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Changes */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-3 text-gray-900">Key Changes</h3>
                    <div className="space-y-2">
                      {update.changes.map((change, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${getChangeColor(change.type)}`}
                        >
                          <div className="mt-0.5">{getChangeIcon(change.type)}</div>
                          <p className="flex-1 text-sm">{change.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Highlights */}
                  {update.highlights && update.highlights.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-3 text-gray-900">Highlights</h3>
                      <ul className="space-y-2">
                        {update.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-[#D3B574] mt-1">•</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* View Rankings Link */}
                  <div className="pt-4 border-t">
                    <Button
                      asChild
                      className="w-full sm:w-auto bg-[#03154C] hover:bg-[#1e3a8a] text-white"
                    >
                      <Link href={`/public-rankings/${update.year}`}>
                        View {update.year} Rankings
                        <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State (if no updates) */}
          {filteredUpdates.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Updates Yet</h3>
                <p className="text-gray-600">
                  Ranking updates will appear here when rankings are updated.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
  )
}
