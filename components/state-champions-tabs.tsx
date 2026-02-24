"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Champion {
  wrestler_name: string
  championship_count: number
  championships: Array<{
    year: number
    classification: string
    weight_class: string
    school: string
  }>
  schools: string[]
  classifications: string[]
  weight_classes: string[]
}

interface ChampionsByYear {
  [year: number]: Champion[]
}

export function StateChampionsTabs() {
  const [fourXChampions, setFourXChampions] = useState<ChampionsByYear>({})
  const [threeXChampions, setThreeXChampions] = useState<ChampionsByYear>({})
  const [twoXChampions, setTwoXChampions] = useState<ChampionsByYear>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChampions() {
      try {
        // Fetch all state champions (no school filter — include everyone so we get all 17 4x champs)
        const { data: allChampions, error } = await supabase
          .from("wrestling_nchsaa_results")
          .select("wrestler_name, year, classification, weight_class, school, place")
          .eq("place", 1)
          .not("wrestler_name", "is", null)
          .neq("wrestler_name", "")
          .order("year", { ascending: false })
          .limit(100000)

        if (error) throw error

        // Normalize names so same person isn't split: strip middle initials, collapse spaces
        const normalize = (s: string) => {
          const t = (s?.trim().replace(/\s+/g, " ") ?? "").toUpperCase()
          if (!t) return ""
          return t.replace(/\s+[A-Z]\.?\s+/g, " ").replace(/\s+/g, " ").trim() || t
        }
        const groups: Record<string, {
          name: string
          champs: Array<{
            year: number
            classification: string
            weight_class: string
            school: string
          }>
          schools: Set<string>
          classes: Set<string>
          weights: Set<string>
        }> = {}

        allChampions?.forEach((c: { wrestler_name?: string; year: number; classification?: string; weight_class?: string; school?: string }) => {
          const norm = normalize(c.wrestler_name ?? "")
          if (!norm) return

          if (!groups[norm]) {
            groups[norm] = {
              name: c.wrestler_name ?? "",
              champs: [],
              schools: new Set(),
              classes: new Set(),
              weights: new Set(),
            }
          }

          groups[norm].champs.push({
            year: c.year,
            classification: c.classification ?? "",
            weight_class: c.weight_class ?? "",
            school: c.school ?? "",
          })
          if (c.school) groups[norm].schools.add(c.school)
          if (c.classification) groups[norm].classes.add(c.classification)
          if (c.weight_class) groups[norm].weights.add(c.weight_class)
        })

        // Convert to champion objects and group by count
        const allResults = Object.values(groups).map((g) => ({
          wrestler_name: g.name,
          championship_count: g.champs.length,
          championships: g.champs.sort((a, b) => b.year - a.year),
          schools: Array.from(g.schools),
          classifications: Array.from(g.classes),
          weight_classes: Array.from(g.weights),
        }))

        // Group by championship count and then by year
        const fourX = allResults.filter((r) => r.championship_count === 4)
        const threeX = allResults.filter((r) => r.championship_count === 3)
        const twoX = allResults.filter((r) => r.championship_count === 2)

        // Group by year (using the most recent championship year for grouping)
        const groupByYear = (champions: Champion[]): ChampionsByYear => {
          const grouped: ChampionsByYear = {}
          champions.forEach((champ) => {
            const latestYear = Math.max(...champ.championships.map((c) => c.year))
            if (!grouped[latestYear]) {
              grouped[latestYear] = []
            }
            grouped[latestYear].push(champ)
          })
          return grouped
        }

        setFourXChampions(groupByYear(fourX))
        setThreeXChampions(groupByYear(threeX))
        setTwoXChampions(groupByYear(twoX))
      } catch (error) {
        console.error("Error fetching champions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChampions()
  }, [])

  const renderChampionsList = (championsByYear: ChampionsByYear) => {
    const years = Object.keys(championsByYear)
      .map(Number)
      .sort((a, b) => b - a)

    if (years.length === 0) {
      return <p className="text-gray-500">No champions found.</p>
    }

    return (
      <div className="space-y-6">
        {years.map((year) => {
          const champions = championsByYear[year]
          return (
            <div key={year} className="border-b border-gray-200 pb-6 last:border-b-0">
              <h3 className="text-xl font-bold text-[#002147] mb-4">{year}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {champions
                  .sort((a, b) => a.wrestler_name.localeCompare(b.wrestler_name))
                  .map((champ) => (
                    <Card key={champ.wrestler_name} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="font-semibold text-[#002147] mb-2">
                          {champ.wrestler_name}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">School:</span> {champ.schools.filter(Boolean).length ? champ.schools.filter(Boolean).join(", ") : "—"}
                          </div>
                          <div>
                            <span className="font-medium">Championships:</span>{" "}
                            {champ.championships
                              .sort((a, b) => b.year - a.year)
                              .map((c) => `${c.year} (${c.classification} ${c.weight_class})`)
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
          <Crown className="w-6 h-6" />
          Multiple-Time State Champions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
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
      </CardContent>
    </Card>
  )
}
