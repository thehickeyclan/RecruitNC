"use client"

import { useState } from "react"
import type { ProspectRanking } from "@/services/rankings-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AthleteImage } from "@/components/athlete-image"
import { Trophy, Medal, Award, GraduationCap } from "lucide-react"

interface ProspectRankingsTableProps {
  rankings: ProspectRanking[]
  selectedYear?: number
  selectedWeightClass?: string
}

export function ProspectRankingsTable({ rankings, selectedYear, selectedWeightClass }: ProspectRankingsTableProps) {
  const [filterWeightClass, setFilterWeightClass] = useState<string>(selectedWeightClass || "all")

  // Get unique weight classes from rankings
  const weightClasses = [...new Set(rankings.map((r) => r.weight_class))].sort()

  // Filter rankings by weight class if selected
  const filteredRankings =
    filterWeightClass === "all" ? rankings : rankings.filter((r) => r.weight_class === filterWeightClass)

  if (rankings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No rankings available for the selected criteria.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedYear ? `Class of ${selectedYear}` : "All Classes"}</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="weight-filter" className="text-sm font-medium">
            Weight Class:
          </label>
          <Select value={filterWeightClass} onValueChange={setFilterWeightClass}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {weightClasses.map((weight) => (
                <SelectItem key={weight} value={weight}>
                  {weight}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rankings Grid */}
      <div className="grid gap-4">
        {filteredRankings.map((ranking, index) => (
          <Card key={ranking.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  <Badge
                    variant={ranking.overall_rank <= 3 ? "default" : "secondary"}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      ranking.overall_rank === 1
                        ? "bg-yellow-500 text-black"
                        : ranking.overall_rank === 2
                          ? "bg-gray-400 text-white"
                          : ranking.overall_rank === 3
                            ? "bg-amber-600 text-white"
                            : ""
                    }`}
                  >
                    {ranking.overall_rank <= 3 ? (
                      ranking.overall_rank === 1 ? (
                        <Trophy className="h-6 w-6" />
                      ) : ranking.overall_rank === 2 ? (
                        <Medal className="h-6 w-6" />
                      ) : (
                        <Award className="h-6 w-6" />
                      )
                    ) : (
                      ranking.overall_rank
                    )}
                  </Badge>
                </div>

                {/* Athlete Photo */}
                <div className="flex-shrink-0">
                  <AthleteImage
                    src={ranking.photo_url}
                    alt={ranking.athlete_name || "Athlete"}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                </div>

                {/* Athlete Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold truncate">{ranking.athlete_name || "Unknown Athlete"}</h3>
                      <p className="text-sm text-muted-foreground">{ranking.high_school}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {ranking.weight_class}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Class of {ranking.graduation_year}
                        </Badge>
                        {ranking.verified && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Rankings */}
                  {(ranking.folkstyle_rank || ranking.freestyle_rank || ranking.greco_rank) && (
                    <div className="flex gap-2 mt-3">
                      {ranking.folkstyle_rank && (
                        <Badge variant="secondary" className="text-xs">
                          Folkstyle #{ranking.folkstyle_rank}
                        </Badge>
                      )}
                      {ranking.freestyle_rank && (
                        <Badge variant="secondary" className="text-xs">
                          Freestyle #{ranking.freestyle_rank}
                        </Badge>
                      )}
                      {ranking.greco_rank && (
                        <Badge variant="secondary" className="text-xs">
                          Greco #{ranking.greco_rank}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Ranking Notes */}
                  {ranking.ranking_notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{ranking.ranking_notes}</p>
                  )}

                  {/* Achievements */}
                  {ranking.achievements && ranking.achievements.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        Key Achievements: {ranking.achievements.slice(0, 2).join(", ")}
                        {ranking.achievements.length > 2 && "..."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* College Readiness Emphasis */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            College Readiness Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Our #1 ranking factor is <strong>college readiness</strong> - evaluating each prospect's academic
            performance, maturity, work ethic, and overall preparedness for collegiate wrestling. National tournament
            results and college opens provide the most accurate competitive assessment.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
