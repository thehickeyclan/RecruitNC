"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

const POOLS = {
  1: { day: 1, teams: [{ name: "NC United", id: "nc-united" }, { name: "Doughboy Black", id: "doughboy" }, { name: "Buffalo Valley Red", id: "buffalo" }, { name: "University Hawks", id: "hawks" }] },
  2: { day: 1, teams: [{ name: "NC United", id: "nc-united" }, { name: "TNWC Silver Fox", id: "tnwc" }, { name: "Lucky Duck Wrestling", id: "lucky-duck" }, { name: "Team Gotcha", id: "gotcha" }] }
}

export function NhscaResultsAdmin() {
  const [selectedPool, setSelectedPool] = useState("")
  const [selectedMatch, setSelectedMatch] = useState("")
  const [team1Score, setTeam1Score] = useState("")
  const [team2Score, setTeam2Score] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const handleSubmit = async () => {
    if (!selectedPool || !selectedMatch || !team1Score || !team2Score) {
      setMessage("Fill in all fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/nhsca-duals/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool: selectedPool,
          matchId: selectedMatch,
          team1Score: parseInt(team1Score),
          team2Score: parseInt(team2Score)
        })
      })

      if (res.ok) {
        setMessage("Saved!")
        setTeam1Score("")
        setTeam2Score("")
        setSelectedMatch("")
        setTimeout(() => setMessage(""), 2000)
      } else {
        setMessage("Error saving")
      }
    } catch (e) {
      setMessage("Error")
    } finally {
      setSubmitting(false)
    }
  }

  const pool = selectedPool ? POOLS[selectedPool as keyof typeof POOLS] : null

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Enter Results */}
      <Card className="border-[#1a3a5c] bg-[#0a1628]">
        <CardHeader>
          <CardTitle className="text-white">Enter Match Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Pool</label>
              <Select value={selectedPool} onValueChange={setSelectedPool}>
                <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
                  <SelectValue placeholder="Select pool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Pool 1 (Day 1)</SelectItem>
                  <SelectItem value="2">Pool 2 (Day 1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/70">Match</label>
              <Select value={selectedMatch} onValueChange={setSelectedMatch} disabled={!pool}>
                <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
                  <SelectValue placeholder="Select match" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Match 1</SelectItem>
                  <SelectItem value="2">Match 2</SelectItem>
                  <SelectItem value="3">Match 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {pool && (
            <div className="bg-[#0d1f38] p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(e.target.value)}
                  placeholder="Score"
                  className="w-16 bg-[#0a2040] border border-[#1a3a5c] text-white text-center rounded px-2 py-2 text-sm"
                />
                <span className="text-white/50 text-sm font-semibold">VS</span>
                <input
                  type="number"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(e.target.value)}
                  placeholder="Score"
                  className="w-16 bg-[#0a2040] border border-[#1a3a5c] text-white text-center rounded px-2 py-2 text-sm"
                />
              </div>
              <div className="text-xs text-white/60 space-y-1">
                <div>{pool.teams[0]?.name || "Team 1"} {team1Score ? `- ${team1Score}` : ""}</div>
                <div>{pool.teams[1]?.name || "Team 2"} {team2Score ? `- ${team2Score}` : ""}</div>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-center text-[#c9a227]">{message}</p>}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedPool || !selectedMatch}
            className="w-full bg-[#c9a227] text-[#002147] hover:bg-[#d4bc6a] font-bold"
          >
            {submitting ? "Saving..." : "Save Result"}
          </Button>
        </CardContent>
      </Card>

      {/* Standings Dashboard */}
      <Card className="border-[#1a3a5c] bg-[#0a1628]">
        <CardHeader>
          <CardTitle className="text-white">Team Standings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-[#0d1f38] p-3 rounded">
              <p className="text-white/60">NC United</p>
              <p className="text-lg font-bold text-[#c9a227]">0-0</p>
            </div>
            <div className="bg-[#0d1f38] p-3 rounded">
              <p className="text-white/60">Opponent</p>
              <p className="text-lg font-bold text-[#c9a227]">0-0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Athlete Records */}
      <Card className="border-[#1a3a5c] bg-[#0a1628]">
        <CardHeader>
          <CardTitle className="text-white text-sm">NC United Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-white/60">Matches will appear here as results are entered</p>
        </CardContent>
      </Card>
    </div>
  )
}
