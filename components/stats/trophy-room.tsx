"use client"
import { useState } from "react"
import { LeaderboardCard } from "./leaderboard-card"
import { Button } from "@/components/ui/button"
import { mockColleges, mockHighSchools, mockWrestlingClubs } from "@/lib/mock-data"

export function TrophyRoom() {
  const [activeCategory, setActiveCategory] = useState<string>("colleges")

  const getLeaderboardData = () => {
    switch (activeCategory) {
      case "colleges":
        return mockColleges.slice(0, 5)
      case "highSchools":
        return mockHighSchools.slice(0, 5)
      case "clubs":
        return mockWrestlingClubs.slice(0, 5)
      default:
        return []
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === "colleges" ? "default" : "outline"}
          onClick={() => setActiveCategory("colleges")}
        >
          Top Colleges
        </Button>
        <Button
          variant={activeCategory === "highSchools" ? "default" : "outline"}
          onClick={() => setActiveCategory("highSchools")}
        >
          Top High Schools
        </Button>
        <Button variant={activeCategory === "clubs" ? "default" : "outline"} onClick={() => setActiveCategory("clubs")}>
          Top Wrestling Clubs
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {getLeaderboardData().map((entity, index) => (
          <LeaderboardCard
            key={entity.id || index}
            rank={index + 1}
            name={entity.name}
            entityType={
              activeCategory === "colleges"
                ? "college"
                : activeCategory === "highSchools"
                  ? "highSchool"
                  : "wrestlingClub"
            }
            commitmentCount={entity.athleteCount || 0}
          />
        ))}
      </div>
    </div>
  )
}
