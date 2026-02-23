"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Champion {
  athlete_name: string
  championship_count: number
  championships: Array<{
    year: number
    division: string
    weight: string
    placement: number
    high_school: string
  }>
  high_schools: string[]
  divisions: string[]
  weights: string[]
}

interface ChampionsByYear {
  [year: number]: Champion[]
}

export function NHSCAChampionsTabs() {
  const [fourXChampions, setFourXChampions] = useState<ChampionsByYear>({})
  const [threeXChampions, setThreeXChampions] = useState<ChampionsByYear>({})
  const [twoXChampions, setTwoXChampions] = useState<ChampionsByYear>({})
  const [fourXAllAmericans, setFourXAllAmericans] = useState<ChampionsByYear>({})
  const [threeXAllAmericans, setThreeXAllAmericans] = useState<ChampionsByYear>({})
  const [twoXAllAmericans, setTwoXAllAmericans] = useState<ChampionsByYear>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChampions() {
      try {
        // Fetch all NHSCA results (champions = placement 1, All-Americans = placement 1-8)
        const { data: allResults, error } = await supabase
          .from("wrestling_nhsca_results")
          .select("athlete_name, year, division, weight, placement, high_school")
          .gte("placement", 1)
          .lte("placement", 8)
          .not("high_school", "is", null)
          .neq("high_school", "")
          .not("high_school", "ilike", "unknown")
          .not("athlete_name", "is", null)
          .neq("athlete_name", "")
          .order("year", { ascending: false })
          .limit(100000)

        if (error) throw error

        // Normalize names and group by wrestler
        const normalize = (s: string) => s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
        const groups: Record<string, {
          name: string
          results: Array<{
            year: number
            division: string
            weight: string
            placement: number
            high_school: string
          }>
          high_schools: Set<string>
          divisions: Set<string>
          weights: Set<string>
        }> = {}

        allResults?.forEach((r: Record<string, unknown>) => {
          const norm = normalize((r.athlete_name as string) ?? "")
          if (!norm) return

          if (!groups[norm]) {
            groups[norm] = {
              name: (r.athlete_name as string) ?? "",
              results: [],
              high_schools: new Set(),
              divisions: new Set(),
              weights: new Set(),
            }
          }

          groups[norm].results.push({
            year: r.year as number,
            division: (r.division as string) ?? "",
            weight: (r.weight as string) ?? "",
            placement: r.placement as number,
            high_school: (r.high_school as string) ?? "",
          })
          if (r.high_school) groups[norm].high_schools.add(r.high_school as string)
          if (r.division) groups[norm].divisions.add(r.division as string)
          if (r.weight) groups[norm].weights.add(r.weight as string)
        })

        // Separate champions (placement = 1) and All-Americans (placement 1-8)
        const allChampions = Object.values(groups).map(g => ({
          athlete_name: g.name,
          championship_count: g.results.filter(r => r.placement === 1).length,
          championships: g.results.filter(r => r.placement === 1).sort((a, b) => b.year - a.year),
          high_schools: Array.from(g.high_schools),
          divisions: Array.from(g.divisions),
          weights: Array.from(g.weights),
        }))

        const allAllAmericans = Object.values(groups).map(g => ({
          athlete_name: g.name,
          championship_count: g.results.length, // All placements count for All-American status
          championships: g.results.sort((a, b) => b.year - a.year),
          high_schools: Array.from(g.high_schools),
          divisions: Array.from(g.divisions),
          weights: Array.from(g.weights),
        }))

        // Group by championship count
        const fourXChamps = allChampions.filter(r => r.championship_count === 4)
        const threeXChamps = allChampions.filter(r => r.championship_count === 3)
        const twoXChamps = allChampions.filter(r => r.championship_count === 2)

        const fourXAAs = allAllAmericans.filter(r => r.championship_count === 4)
        const threeXAAs = allAllAmericans.filter(r => r.championship_count === 3)
        const twoXAAs = allAllAmericans.filter(r => r.championship_count === 2)

        // Group by year (using the most recent year for grouping)
        const groupByYear = (champions: Champion[]): ChampionsByYear => {
          const grouped: ChampionsByYear = {}
          champions.forEach(champ => {
            const latestYear = Math.max(...champ.championships.map(c => c.year))
            if (!grouped[latestYear]) {
              grouped[latestYear] = []
            }
            grouped[latestYear].push(champ)
          })
          return grouped
        }

        setFourXChampions(groupByYear(fourXChamps))
        setThreeXChampions(groupByYear(threeXChamps))
        setTwoXChampions(groupByYear(twoXChamps))
        setFourXAllAmericans(groupByYear(fourXAAs))
        setThreeXAllAmericans(groupByYear(threeXAAs))
        setTwoXAllAmericans(groupByYear(twoXAAs))
        setLoading(false)
      } catch (error) {
        console.error("Error fetching NHSCA champions:", error)
        setLoading(false)
      }
    }

    fetchChampions()
  }, [])

  const renderChampionsList = (championsByYear: ChampionsByYear, isAllAmerican: boolean = false) => {
    const years = Object.keys(championsByYear)
      .map(Number)
      .sort((a, b) => b - a) // Most recent first

    if (years.length === 0) {
      return <p className="text-gray-500">No champions found.</p>
    }

    return (
      <div className="space-y-6">
        {years.map(year => {
          const champions = championsByYear[year]
          return (
            <div key={year} className="border-b border-gray-200 pb-6 last:border-b-0">
              <h3 className="text-xl font-bold text-[#002147] mb-4">{year}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {champions
                  .sort((a, b) => a.athlete_name.localeCompare(b.athlete_name))
                  .map((champ) => (
                    <Card key={champ.athlete_name} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="font-semibold text-[#002147] mb-2">
                          {champ.athlete_name}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">School:</span> {champ.high_schools.join(", ")}
                          </div>
                          <div>
                            <span className="font-medium">{isAllAmerican ? "All-American Placements" : "National Championships"}:</span>{" "}
                            {champ.championships
                              .sort((a, b) => b.year - a.year)
                              .map((c) => {
                                if (isAllAmerican) {
                                  return `${c.year} (${c.division} ${c.weight}, ${c.placement}${c.placement === 1 ? "st" : c.placement === 2 ? "nd" : c.placement === 3 ? "rd" : "th"} place)`
                                } else {
                                  return `${c.year} (${c.division} ${c.weight})`
                                }
                              })
                              .join(", ")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="border-2 border-[#002147]">
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Loading champions...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-[#002147]">
      <CardHeader className="bg-[#002147] text-white">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Multiple-Time NHSCA Champions & All-Americans
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="champions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="champions">National Champions</TabsTrigger>
            <TabsTrigger value="allamericans">All-Americans</TabsTrigger>
          </TabsList>

          <TabsContent value="champions">
            <Tabs defaultValue="4x" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="4x">4x Champions ({Object.values(fourXChampions).flat().length})</TabsTrigger>
                <TabsTrigger value="3x">3x Champions ({Object.values(threeXChampions).flat().length})</TabsTrigger>
                <TabsTrigger value="2x">2x Champions ({Object.values(twoXChampions).flat().length})</TabsTrigger>
              </TabsList>
              <TabsContent value="4x" className="mt-6">
                {renderChampionsList(fourXChampions)}
              </TabsContent>
              <TabsContent value="3x" className="mt-6">
                {renderChampionsList(threeXChampions)}
              </TabsContent>
              <TabsContent value="2x" className="mt-6">
                {renderChampionsList(twoXChampions)}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="allamericans">
            <Tabs defaultValue="4x" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="4x">4x All-Americans ({Object.values(fourXAllAmericans).flat().length})</TabsTrigger>
                <TabsTrigger value="3x">3x All-Americans ({Object.values(threeXAllAmericans).flat().length})</TabsTrigger>
                <TabsTrigger value="2x">2x All-Americans ({Object.values(twoXAllAmericans).flat().length})</TabsTrigger>
              </TabsList>
              <TabsContent value="4x" className="mt-6">
                {renderChampionsList(fourXAllAmericans, true)}
              </TabsContent>
              <TabsContent value="3x" className="mt-6">
                {renderChampionsList(threeXAllAmericans, true)}
              </TabsContent>
              <TabsContent value="2x" className="mt-6">
                {renderChampionsList(twoXAllAmericans, true)}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
