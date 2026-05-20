"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const POOLS = {
  day1: [
    { id: "26", name: "HS Boys Pool 26", matches: [
      { id: "1", team1: "NC United Select", team2: "Doughboy Black" },
      { id: "2", team1: "NC United Select", team2: "University Hawks" },
      { id: "3", team1: "Doughboy Black", team2: "University Hawks" }
    ]},
    { id: "6", name: "HS Boys Pool 6", matches: [
      { id: "1", team1: "NC United", team2: "TNWC Silver Fox" },
      { id: "2", team1: "NC United", team2: "Lucky Duck Wrestling" },
      { id: "3", team1: "TNWC Silver Fox", team2: "Lucky Duck Wrestling" }
    ]}
  ]
}

export function NhscaResultsAdmin() {
  const [selectedPool, setSelectedPool] = useState("")
  const [selectedMatch, setSelectedMatch] = useState("")
  const [team1Score, setTeam1Score] = useState("")
  const [team2Score, setTeam2Score] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [results, setResults] = useState<any[]>([])

  const pool = selectedPool ? POOLS.day1.find(p => p.id === selectedPool) : null
  const match = pool && selectedMatch ? pool.matches.find(m => m.id === selectedMatch) : null

  // Load results on mount
  useEffect(() => {
    async function loadResults() {
      try {
        const res = await fetch("/api/nhsca-duals/results")
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch (err) {
        console.error("Failed to load results:", err)
      }
    }
    loadResults()
  }, [])

  async function handleSaveScore(e: React.FormEvent) {
    e.preventDefault()
    if (!pool || !match || !team1Score || !team2Score) {
      setMessage("Please fill all fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/nhsca-duals/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool: pool.id,
          match_id: match.id,
          team1_name: match.team1,
          team2_name: match.team2,
          team1_score: parseInt(team1Score),
          team2_score: parseInt(team2Score)
        })
      })

      if (res.ok) {
        setMessage(`✓ Score saved: ${match.team1} ${team1Score} vs ${match.team2} ${team2Score}`)
        setTeam1Score("")
        setTeam2Score("")
        setSelectedMatch("")
        
        // Reload results
        const resLoad = await fetch("/api/nhsca-duals/results")
        if (resLoad.ok) {
          const data = await resLoad.json()
          setResults(data.results || [])
        }
        
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("Failed to save score")
      }
    } catch (err) {
      setMessage("Error: " + String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Entry Form */}
      <Card className="bg-[#0a1628] border-[#1a3a5c]">
        <CardHeader>
          <CardTitle className="text-white">Enter Match Results</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveScore} className="space-y-4">
            {/* Pool Selection */}
            <div className="space-y-2">
              <Label className="text-white/80">Pool</Label>
              <Select value={selectedPool} onValueChange={setSelectedPool}>
                <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
                  <SelectValue placeholder="Select pool..." />
                </SelectTrigger>
                <SelectContent>
                  {POOLS.day1.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Match Selection */}
            {pool && (
              <div className="space-y-2">
                <Label className="text-white/80">Match</Label>
                <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                  <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
                    <SelectValue placeholder="Select match..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pool.matches.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        Round {m.id}: {m.team1} vs {m.team2}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Score Entry */}
            {match && (
              <div className="space-y-3">
                <div className="bg-[#0d1f38] p-3 rounded text-white text-sm">
                  <strong>{match.team1}</strong> vs <strong>{match.team2}</strong>
                </div>
                
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">{match.team1}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={team1Score}
                      onChange={(e) => setTeam1Score(e.target.value)}
                      className="bg-[#0d1f38] border-[#1a3a5c] text-white text-center text-lg font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div className="text-center text-white/60 font-semibold">VS</div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">{match.team2}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={team2Score}
                      onChange={(e) => setTeam2Score(e.target.value)}
                      className="bg-[#0d1f38] border-[#1a3a5c] text-white text-center text-lg font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#c9a227] hover:bg-[#b89a1f] text-[#002147] font-bold"
                >
                  {submitting ? "Saving..." : "Save Score"}
                </Button>
              </div>
            )}

            {message && (
              <div className={`p-3 rounded text-sm ${message.includes("✓") ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                {message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results Display */}
      <Card className="bg-[#0a1628] border-[#1a3a5c]">
        <CardHeader>
          <CardTitle className="text-white">Results & Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="text-white/60 text-sm">No results entered yet.</div>
            ) : (
              <div className="space-y-2">
                {results.map((r, idx) => (
                  <div key={idx} className="bg-[#0d1f38] p-3 rounded text-sm">
                    <div className="flex justify-between text-white">
                      <span className="font-semibold">{r.team1_name}</span>
                      <span className="text-[#c9a227] font-bold">{r.team1_score}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span className="font-semibold">{r.team2_name}</span>
                      <span className="text-[#c9a227] font-bold">{r.team2_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[#0d1f38] p-4 rounded">
                <div className="text-white/60 text-xs mb-1">Total Matches</div>
                <div className="text-2xl font-bold text-[#c9a227]">{results.length}</div>
              </div>
              <div className="bg-[#0d1f38] p-4 rounded">
                <div className="text-white/60 text-xs mb-1">NC United Wins</div>
                <div className="text-2xl font-bold text-white">
                  {results.filter(r => 
                    (r.team1_name.includes("NC United") && r.team1_score > r.team2_score) ||
                    (r.team2_name.includes("NC United") && r.team2_score > r.team1_score)
                  ).length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
