"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown } from "lucide-react"

const POOLS = {
  hsb_26: {
    name: "HS Boys Pool 26",
    matchups: [
      { id: "hsb26-1", round: 1, team1: "NC United Select - HSB", team2: "Doughboy Black - HSB" },
      { id: "hsb26-2", round: 2, team1: "NC United Select - HSB", team2: "University Hawks Wrestling" },
      { id: "hsb26-3", round: 3, team1: "Doughboy Black - HSB", team2: "Buffalo Valley Red - HSB" },
    ]
  },
  hsb_27: {
    name: "HS Boys Pool 27",
    matchups: [
      { id: "hsb27-1", round: 1, team1: "NC United Select - HSB", team2: "Buffalo Valley Red - HSB" },
      { id: "hsb27-2", round: 2, team1: "NC United Select - HSB", team2: "University Hawks Wrestling" },
      { id: "hsb27-3", round: 3, team1: "Buffalo Valley Red - HSB", team2: "Doughboy Black - HSB" },
    ]
  },
  hsb_28: {
    name: "HS Boys Pool 28",
    matchups: [
      { id: "hsb28-1", round: 1, team1: "NC United Select - HSB", team2: "Buffalo Valley Red - HSB" },
      { id: "hsb28-2", round: 2, team1: "NC United Select - HSB", team2: "Doughboy Black - HSB" },
      { id: "hsb28-3", round: 3, team1: "Buffalo Valley Red - HSB", team2: "University Hawks Wrestling" },
    ]
  },
  hsb_6: {
    name: "HS Boys Pool 6",
    matchups: [
      { id: "hsb6-1", round: 1, team1: "NC United - HSB", team2: "TNWC Silver Fox - HSB" },
      { id: "hsb6-2", round: 2, team1: "NC United - HSB", team2: "Lucky Duck Wrestling Club" },
      { id: "hsb6-3", round: 3, team1: "TNWC Silver Fox - HSB", team2: "Lucky Duck Wrestling Club" },
    ]
  },
  hsb_7: {
    name: "HS Boys Pool 7",
    matchups: [
      { id: "hsb7-1", round: 1, team1: "NC United - HSB", team2: "Lucky Duck Wrestling Club" },
      { id: "hsb7-2", round: 2, team1: "NC United - HSB", team2: "Team Gotcha - HSB" },
      { id: "hsb7-3", round: 3, team1: "Lucky Duck Wrestling Club", team2: "Team Gotcha - HSB" },
    ]
  },
  hsb_8: {
    name: "HS Boys Pool 8",
    matchups: [
      { id: "hsb8-1", round: 1, team1: "TNWC Silver Fox - HSB", team2: "Lucky Duck Wrestling Club" },
      { id: "hsb8-2", round: 2, team1: "TNWC Silver Fox - HSB", team2: "NC United - HSB" },
      { id: "hsb8-3", round: 3, team1: "Lucky Duck Wrestling Club", team2: "NC United - HSB" },
    ]
  },
}

type Result = {
  matchupId: string
  team1Score: string
  team2Score: string
}

export function NhscaResultsAdmin() {
  const [selectedPool, setSelectedPool] = useState<keyof typeof POOLS>("hsb_26")
  const [results, setResults] = useState<Record<string, Result>>({})
  const [saving, setSaving] = useState(false)

  const pool = POOLS[selectedPool]

  const handleScoreChange = (matchupId: string, team: "team1" | "team2", score: string) => {
    setResults(prev => ({
      ...prev,
      [matchupId]: {
        ...prev[matchupId],
        matchupId,
        [team === "team1" ? "team1Score" : "team2Score"]: score
      }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/nhsca-duals/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool: selectedPool,
          results: Object.values(results)
        })
      })
      if (response.ok) {
        alert("Results saved!")
        setResults({})
      }
    } catch (e) {
      console.error("Error saving results:", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Pool Selector */}
      <Card className="border-[#1a3a5c] bg-[#0a1628] sticky top-0 z-10">
        <CardContent className="pt-4">
          <Select value={selectedPool} onValueChange={(v: any) => setSelectedPool(v)}>
            <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(POOLS).map(([key, pool]) => (
                <SelectItem key={key} value={key}>{pool.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Results Entry */}
      <div className="space-y-3">
        {pool.matchups.map(matchup => (
          <Card key={matchup.id} className="border-[#1a3a5c] bg-[#0a1628]">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                {/* Team 1 */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white/60">Round {matchup.round}</p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <p className="text-sm text-white/80 mb-1">{matchup.team1}</p>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Score"
                        value={results[matchup.id]?.team1Score || ""}
                        onChange={(e) => handleScoreChange(matchup.id, "team1", e.target.value)}
                        className="bg-[#0d1f38] border-[#1a3a5c] text-white text-center text-lg font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* vs */}
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/40">VS</p>
                </div>

                {/* Team 2 */}
                <div className="space-y-1">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <p className="text-sm text-white/80 mb-1">{matchup.team2}</p>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Score"
                        value={results[matchup.id]?.team2Score || ""}
                        onChange={(e) => handleScoreChange(matchup.id, "team2", e.target.value)}
                        className="bg-[#0d1f38] border-[#1a3a5c] text-white text-center text-lg font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-[#001428] pt-4 pb-4">
        <Button
          onClick={handleSave}
          disabled={saving || Object.keys(results).length === 0}
          className="w-full bg-[#c9a227] hover:bg-[#d4bc6a] text-[#002147] font-bold py-6 text-lg"
        >
          {saving ? "Saving..." : "Save Results"}
        </Button>
      </div>
    </div>
  )
}
