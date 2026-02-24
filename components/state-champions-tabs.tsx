"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

/** Canonical key so "First Last", "Last, First", "First M. Last" all group as one person. Matches lib/nchsaa-results name matching. */
function canonicalNameKey(name: string): string {
  const t = (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
  const tokens = t
    .split(/\s+/)
    .filter(Boolean)
    .filter((tok) => tok.length > 1 || !/^[a-z]$/.test(tok)) // drop single-letter (middle initial)
  return [...tokens].sort().join(" ")
}

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

export type StateChampionsDebug = {
  rawRowCount: number
  uniquePeopleCount: number
  fourXCount: number
  threeXCount: number
  twoXCount: number
  fourXNames: Array<{ name: string; key: string; count: number }>
  fetchError: string | null
}

export function StateChampionsTabs() {
  const [fourXChampions, setFourXChampions] = useState<ChampionsByYear>({})
  const [threeXChampions, setThreeXChampions] = useState<ChampionsByYear>({})
  const [twoXChampions, setTwoXChampions] = useState<ChampionsByYear>({})
  const [loading, setLoading] = useState(true)
  const [debug, setDebug] = useState<StateChampionsDebug | null>(null)

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

        // Group by canonical name so "First Last", "Last, First", "First M. Last" = one person (17 4x champs)
        const groups: Record<string, {
          name: string
          nameVariants: Set<string>
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
          const raw = (c.wrestler_name ?? "").trim()
          const key = canonicalNameKey(raw)
          if (!key) return

          if (!groups[key]) {
            groups[key] = {
              name: raw,
              nameVariants: new Set(),
              champs: [],
              schools: new Set(),
              classes: new Set(),
              weights: new Set(),
            }
          }
          const g = groups[key]
          g.nameVariants.add(raw)
          g.champs.push({
            year: c.year,
            classification: c.classification ?? "",
            weight_class: c.weight_class ?? "",
            school: c.school ?? "",
          })
          if (c.school) g.schools.add(c.school)
          if (c.classification) g.classes.add(c.classification)
          if (c.weight_class) g.weights.add(c.weight_class)
        })

        // Prefer "First Last" display name (no comma) when we have it
        Object.values(groups).forEach((g) => {
          const noComma = [...g.nameVariants].find((n) => !n.includes(","))
          if (noComma) g.name = noComma
          else if (g.name.includes(",")) {
            const [last, first] = g.name.split(",").map((s) => s.trim())
            if (first && last) g.name = `${first} ${last}`
          }
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

        const fourXList = fourX.map((r) => ({
          name: r.wrestler_name,
          key: canonicalNameKey(r.wrestler_name),
          count: r.championship_count,
        }))
        setDebug({
          rawRowCount: allChampions?.length ?? 0,
          uniquePeopleCount: Object.keys(groups).length,
          fourXCount: fourX.length,
          threeXCount: threeX.length,
          twoXCount: twoX.length,
          fourXNames: fourXList,
          fetchError: null,
        })
        console.debug("[StateChampionsTabs]", {
          rawRowCount: allChampions?.length ?? 0,
          uniquePeopleCount: Object.keys(groups).length,
          fourXCount: fourX.length,
          threeXCount: threeX.length,
          twoXCount: twoX.length,
          fourXNames: fourXList,
        })
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error("Error fetching champions:", error)
        setDebug({
          rawRowCount: 0,
          uniquePeopleCount: 0,
          fourXCount: 0,
          threeXCount: 0,
          twoXCount: 0,
          fourXNames: [],
          fetchError: msg,
        })
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
        {debug != null && (
          <details className="mt-6 border border-amber-200 bg-amber-50 rounded-md overflow-hidden">
            <summary className="px-4 py-2 cursor-pointer font-medium text-amber-900 bg-amber-100">
              Debug: 4x state champs (expected 17)
            </summary>
            <pre className="p-4 text-xs text-left overflow-auto max-h-60 bg-white border-t border-amber-200">
              {JSON.stringify(
                {
                  rawChampionRowsFromDb: debug.rawRowCount,
                  uniquePeopleAfterGrouping: debug.uniquePeopleCount,
                  fourXCount: debug.fourXCount,
                  threeXCount: debug.threeXCount,
                  twoXCount: debug.twoXCount,
                  fetchError: debug.fetchError ?? undefined,
                  fourXNames: debug.fourXNames,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
