"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Loader2, Trophy, AlertTriangle, CheckCircle, Flame, Target, TrendingUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Classification = "Freshman" | "Sophomore" | "Junior" | "Senior"

interface Stats {
  totalWins: number
  totalLosses: number
  rankedWins: number
  rankedLosses: number
  seededWins: number
  seededLosses: number
  active: number
  eliminated: number
}

interface ProcessResult {
  success: number
  skipped: number
  errors: string[]
  rankedWins: number
  seededWins: number
}

type ImportMode = "roster" | "matches" | "brackets"

export default function NHSCAAdminPage() {
  const [mode, setMode] = useState<ImportMode>("roster")
  const [text, setText] = useState("")
  const [weightClass, setWeightClass] = useState("106")
  const [classification, setClassification] = useState<Classification>("Senior")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; message: string; details?: ProcessResult } | null>(null)
  const [stats, setStats] = useState<Record<Classification, Stats>>({
    Freshman: { totalWins: 0, totalLosses: 0, rankedWins: 0, rankedLosses: 0, seededWins: 0, seededLosses: 0, active: 0, eliminated: 0 },
    Sophomore: { totalWins: 0, totalLosses: 0, rankedWins: 0, rankedLosses: 0, seededWins: 0, seededLosses: 0, active: 0, eliminated: 0 },
    Junior: { totalWins: 0, totalLosses: 0, rankedWins: 0, rankedLosses: 0, seededWins: 0, seededLosses: 0, active: 0, eliminated: 0 },
    Senior: { totalWins: 0, totalLosses: 0, rankedWins: 0, rankedLosses: 0, seededWins: 0, seededLosses: 0, active: 0, eliminated: 0 }
  })
  const [recentAlerts, setRecentAlerts] = useState<any[]>([])
  const [rankedWrestlersMap, setRankedWrestlersMap] = useState<Map<string, number>>(new Map())

  const supabase = createClient()

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setRefreshing(true)
    await Promise.all([loadStats(), loadRecentAlerts(), loadRankedWrestlers()])
    setRefreshing(false)
  }

  async function loadRankedWrestlers() {
    const { data } = await supabase
      .from("nhsca_ranked_wrestlers")
      .select("name, weight_class, classification, national_rank")
    
    const map = new Map<string, number>()
    data?.forEach(r => {
      const key = `${r.name.toLowerCase().trim()}-${r.weight_class}-${r.classification}`
      map.set(key, r.national_rank)
    })
    setRankedWrestlersMap(map)
  }

  async function loadStats() {
    const classifications: Classification[] = ["Freshman", "Sophomore", "Junior", "Senior"]
    const newStats: Record<Classification, Stats> = {} as any

    for (const c of classifications) {
      const { data: roster } = await supabase
        .from("nhsca_roster")
        .select("wins, losses, bracket_status")
        .eq("classification", c)

      const { data: matches } = await supabase
        .from("nhsca_matches")
        .select("result, opponent_seed, is_notable")
        .eq("classification", c)

      const totalWins = roster?.reduce((sum, w) => sum + (w.wins || 0), 0) || 0
      const totalLosses = roster?.reduce((sum, w) => sum + (w.losses || 0), 0) || 0
      const active = roster?.filter(w => (w.losses || 0) < 2).length || 0
      const eliminated = roster?.filter(w => (w.losses || 0) >= 2).length || 0

      const seededWins = matches?.filter(m => m.result === "W" && m.opponent_seed && m.opponent_seed <= 16).length || 0
      const seededLosses = matches?.filter(m => m.result === "L" && m.opponent_seed && m.opponent_seed <= 16).length || 0
      const rankedWins = matches?.filter(m => m.result === "W" && m.is_notable).length || 0
      const rankedLosses = matches?.filter(m => m.result === "L" && m.is_notable).length || 0

      newStats[c] = { totalWins, totalLosses, rankedWins, rankedLosses, seededWins, seededLosses, active, eliminated }
    }

    setStats(newStats)
  }

  async function loadRecentAlerts() {
    const { data } = await supabase
      .from("nhsca_win_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
    setRecentAlerts(data || [])
  }

  function parseWinType(abbrev: string): string {
    const types: Record<string, string> = {
      "F": "fall", "TF": "tech_fall", "MD": "major", "DEC": "decision",
      "SV": "sudden_victory", "TB": "tiebreaker", "UTB": "ultimate_tiebreaker",
      "FF": "forfeit", "FOR": "forfeit", "DQ": "disqualification",
      "INJ": "injury", "DEF": "default", "BYE": "bye"
    }
    return types[abbrev.toUpperCase()] || "decision"
  }

  function parseMatchLine(line: string) {
    const trimmed = line.trim()
    if (!trimmed) return null

    const weightMatch = trimmed.match(/^(\d{2,3})/)
    if (!weightMatch) return null

    const weight_class = weightMatch[1]
    const rest = trimmed.slice(weightMatch[0].length)

    const winTypePattern = /\s+(F|TF|MD|DEC|SV|TB|UTB|FF|FOR|DQ|INJ|DEF|BYE)\s+/i
    const winTypeMatch = rest.match(winTypePattern)
    if (!winTypeMatch) return null

    const win_type = winTypeMatch[1].toUpperCase()
    const winTypeIndex = rest.indexOf(winTypeMatch[0])

    const winnerPart = rest.slice(0, winTypeIndex).trim()
    const loserAndScore = rest.slice(winTypeIndex + winTypeMatch[0].length).trim()

    // Pattern: "FirstName LastName City, ST (ST)" - extract state, take first 2 words as name
    const statePattern = /,\s*(\w{2})\s*\((\w{2})\)$/
    const winnerStateMatch = winnerPart.match(statePattern)
    if (!winnerStateMatch) return null
    
    const winner_state = winnerStateMatch[2].trim()
    // Everything before ", ST (ST)" - then take first 2 words as name
    const winnerBeforeState = winnerPart.slice(0, winnerPart.lastIndexOf(winnerStateMatch[0])).trim()
    // Take first 2 words only as wrestler name (rest is city) - updated 9:05am
    const winnerWords = winnerBeforeState.split(/\s+/)
    const winner_name = winnerWords.length >= 2 ? winnerWords[0] + " " + winnerWords[1] : winnerBeforeState

    const scorePattern = /,\s*(\d+-\d+)\s*(\d+:\d+)?(\s+\w+)?$/
    const scoreMatch = loserAndScore.match(scorePattern)
    if (!scoreMatch) return null

    const score = scoreMatch[1]
    const loserPart = loserAndScore.slice(0, loserAndScore.lastIndexOf(scoreMatch[0])).trim()
    const loserStateMatch = loserPart.match(statePattern)
    if (!loserStateMatch) return null

    const loser_state = loserStateMatch[2].trim()
    const loserBeforeState = loserPart.slice(0, loserPart.lastIndexOf(loserStateMatch[0])).trim()
    // Take first 2 words only as wrestler name (rest is city)
    const loserWords = loserBeforeState.split(/\s+/)
    const loser_name = loserWords.length >= 2 ? loserWords[0] + " " + loserWords[1] : loserBeforeState

    const nc_is_winner = winner_state === "NC"
    const nc_is_loser = loser_state === "NC"
    if (!nc_is_winner && !nc_is_loser) return null

    return {
      weight_class,
      winner_name, winner_state,
      loser_name, loser_state,
      win_type, score,
      nc_wrestler_name: nc_is_winner ? winner_name : loser_name,
      nc_is_winner,
      opponent_name: nc_is_winner ? loser_name : winner_name,
      opponent_state: nc_is_winner ? loser_state : winner_state
    }
  }

  async function processRoster() {
    setLoading(true)
    setResult(null)

    const lines = text.split("\n").map(l => l.trim()).filter(l => l)
    let processed = 0
    let skipped = 0
    const errors: string[] = []

    for (const line of lines) {
      // Skip round headers
      if (line.startsWith("Round of")) continue

      // Parse "M. Crooke — NC" or "M. Crooke - NC"
      const match = line.match(/^([A-Z]\.\s*[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*)\s*[—-]\s*NC$/i)
      if (!match) continue

      const name = match[1].trim()
      const lastName = name.split(/\s+/).pop() || name

      // Check duplicate by last name
      const { data: existing } = await supabase
        .from("nhsca_roster")
        .select("id")
        .eq("classification", classification)
        .eq("weight_class", weightClass)
        .ilike("name", `%${lastName}`)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Insert wrestler
      const { error } = await supabase.from("nhsca_roster").insert({
        name,
        school: "",
        weight_class: weightClass,
        classification,
        wins: 0,
        losses: 0,
        bracket_status: "active"
      })

      if (error) {
        errors.push(`Failed: ${name}`)
      } else {
        processed++
      }
    }

    await loadAll()
    setResult({
      type: processed > 0 ? "success" : "error",
      message: `Added ${processed} wrestlers. ${skipped} duplicates skipped.`,
      details: { success: processed, skipped, errors, rankedWins: 0, seededWins: 0 }
    })
    if (processed > 0) setText("")
    setLoading(false)
  }

  // Seed position maps - which bracket line each seed is placed on
  // Standard wrestling bracket seeding keeps top seeds apart until later rounds
  const SEED_POSITIONS: Record<number, Record<number, number>> = {
    // 32-man bracket: 8 seeds
    32: { 1: 1, 8: 2, 5: 3, 4: 4, 3: 5, 6: 6, 7: 7, 2: 8 },
    // 64-man bracket: 16 seeds  
    64: { 1: 1, 16: 2, 9: 3, 8: 4, 5: 5, 12: 6, 13: 7, 4: 8, 3: 9, 14: 10, 11: 11, 6: 12, 7: 13, 10: 14, 15: 15, 2: 16 },
    // 128-man bracket: 16 seeds (positions in first 64 lines = top half)
    128: { 1: 1, 16: 4, 9: 5, 8: 8, 5: 9, 12: 12, 13: 13, 4: 16, 3: 17, 14: 20, 11: 21, 6: 24, 7: 25, 10: 28, 15: 29, 2: 32 }
  }

  function getSeedFromPosition(position: number, bracketSize: number): number | null {
    const seedMap = SEED_POSITIONS[bracketSize]
    if (!seedMap) return null
    
    // Reverse lookup: find which seed is at this position
    for (const [seed, pos] of Object.entries(seedMap)) {
      if (pos === position) return parseInt(seed)
    }
    return null
  }

  async function processBrackets() {
    setLoading(true)
    setResult(null)

    const lines = text.split("\n").map(l => l.trim())
    let processed = 0
    let skipped = 0
    const errors: string[] = []
    const seededCount = 0
    
    // First pass: count total entries to determine bracket size
    let totalEntries = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const nextLine = lines[i + 1]?.trim()
      if (line && line.length > 2 && nextLine && nextLine.length === 2) {
        totalEntries++
        i++ // Skip state line
      }
    }
    
    // Determine bracket size (round up to nearest power of 2)
    let bracketSize = 32
    if (totalEntries > 32) bracketSize = 64
    if (totalEntries > 64) bracketSize = 128
    if (totalEntries > 128) bracketSize = 256

    let position = 0

    // Parse format: name on one line, state on next line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip round headers
      if (line.startsWith("Round of")) continue
      
      // Skip empty lines
      if (!line || line.length <= 2) continue
      
      // Check if next line is a state code (2 letters)
      const nextLine = lines[i + 1]?.trim()
      if (nextLine && nextLine.length === 2) {
        position++
        
        // Only process NC wrestlers
        if (nextLine === "NC") {
          const name = line
          // Extract last name - handle "Jr.", "III", etc.
          const parts = name.split(/[\s.]+/).filter(p => p.length > 0)
          let lastName = parts[parts.length - 1]
          // If last part is Jr, Sr, III, etc., use second to last
          if (lastName && /^(jr|sr|ii|iii|iv)$/i.test(lastName)) {
            lastName = parts[parts.length - 2] || lastName
          }
          
          // Check if this position is a seed
          const seed = getSeedFromPosition(position, bracketSize)
          
          // Find wrestler in roster by last name
          const { data: wrestlers } = await supabase
            .from("nhsca_roster")
            .select("id, name")
            .eq("classification", classification)
            .eq("weight_class", weightClass)
            .ilike("name", `%${lastName}%`)
          
          const wrestler = wrestlers?.[0]

          if (wrestler) {
            // Update seed only (bracket_side has check constraint)
            const { error } = await supabase
              .from("nhsca_roster")
              .update({ 
                seed: seed
              })
              .eq("id", wrestler.id)

            if (error) {
              errors.push(`${name} - DB error: ${error.message}`)
            } else {
              processed++
              errors.push(`OK: ${name} -> ${wrestler.name}${seed ? ' (#' + seed + ' seed)' : ''}`)
            }
          } else {
            skipped++
            errors.push(`MISS: ${name} (searching: ${lastName})`)
          }
        }
        
        i++ // Skip the state line
      }
    }

    await loadAll()
    setResult({
      type: processed > 0 ? "success" : "error",
      message: `Updated ${processed} NC wrestlers. ${skipped} not found. Bracket size: ${bracketSize}`,
      details: { success: processed, skipped, errors, rankedWins: 0, seededWins: 0 }
    })
    if (processed > 0) setText("")
    setLoading(false)
  }

  async function processMatches() {
    setLoading(true)
    setResult(null)

    const lines = text.split("\n").filter(line => line.trim())
    const results: ProcessResult = { success: 0, skipped: 0, errors: [], rankedWins: 0, seededWins: 0 }

    for (const line of lines) {
      try {
        const parsed = parseMatchLine(line)
        if (!parsed) { results.skipped++; continue }

        // Find NC wrestler by full name or last name
        const nameParts = parsed.nc_wrestler_name.split(" ").filter(p => p.length > 0)
        const lastName = nameParts[nameParts.length - 1]
        const firstName = nameParts[0] || ""

        const { data: wrestlers } = await supabase
          .from("nhsca_roster")
          .select("id, name, wins, losses, weight_class")
          .eq("classification", classification)
          .or(`name.ilike.%${lastName}%,name.ilike.${firstName}%${lastName}%`)
          .limit(5)
        
        // Pick best match - prefer exact last name match
        const wrestler = wrestlers?.find(w => w.name.toLowerCase().includes(lastName.toLowerCase())) || wrestlers?.[0]
        if (!wrestler) {
          results.errors.push(`Not found: ${parsed.nc_wrestler_name} (${parsed.weight_class} lbs)`)
          continue
        }

        // Delete existing match if re-importing (overwrite mode)
        await supabase
          .from("nhsca_matches")
          .delete()
          .eq("nc_wrestler_id", wrestler.id)
          .ilike("opponent_name", `%${parsed.opponent_name}%`)

        // Check if opponent is nationally ranked
        const opponentKey = `${parsed.opponent_name.toLowerCase().trim()}-${parsed.weight_class}-${classification}`
        const opponentRank = rankedWrestlersMap.get(opponentKey)
        const isRankedOpponent = !!opponentRank

        // Parse score
        const [winnerScore, loserScore] = parsed.score.split("-").map(Number)
        const ncScore = parsed.nc_is_winner ? winnerScore : loserScore
        const oppScore = parsed.nc_is_winner ? loserScore : winnerScore

        // Insert match
        await supabase.from("nhsca_matches").insert({
          nc_wrestler_id: wrestler.id,
          nc_wrestler_name: wrestler.name,
          opponent_name: parsed.opponent_name,
          opponent_state: parsed.opponent_state,
          weight_class: parsed.weight_class,
          classification,
          result: parsed.nc_is_winner ? "W" : "L",
          win_type: parseWinType(parsed.win_type),
          nc_score: ncScore,
          opponent_score: oppScore,
          round: "TBD",
          is_notable: isRankedOpponent
        })

        // Recalculate W/L from all matches for this wrestler
        const { data: allMatches } = await supabase
          .from("nhsca_matches")
          .select("result")
          .eq("nc_wrestler_id", wrestler.id)
        
        const newWins = (allMatches || []).filter(m => m.result === "W").length
        const newLosses = (allMatches || []).filter(m => m.result === "L").length

        await supabase.from("nhsca_roster").update({
          wins: newWins,
          losses: newLosses,
          bracket_status: newLosses >= 2 ? "eliminated" : "active"
        }).eq("id", wrestler.id)

        results.success++

        // Create win alert for ranked wins
        if (parsed.nc_is_winner && isRankedOpponent) {
          results.rankedWins++
          await supabase.from("nhsca_win_alerts").insert({
            wrestler_name: wrestler.name,
            opponent_name: parsed.opponent_name,
            opponent_state: parsed.opponent_state,
            weight_class: parsed.weight_class,
            classification,
            win_type: parseWinType(parsed.win_type),
            score: parsed.score,
            is_seeded_win: false,
            opponent_seed: opponentRank
          })
        }
      } catch (err: any) {
        results.errors.push(`Error: ${err.message}`)
      }
    }

    await loadAll()

    setResult({
      type: results.success > 0 ? "success" : "error",
      message: `${results.success} matches processed. ${results.skipped} skipped.${results.rankedWins > 0 ? ` ${results.rankedWins} RANKED WINS!` : ""}`,
      details: results
    })

    if (results.success > 0) setText("")
    setLoading(false)
  }

  const totalStats = {
    totalWins: Object.values(stats).reduce((sum, s) => sum + s.totalWins, 0),
    totalLosses: Object.values(stats).reduce((sum, s) => sum + s.totalLosses, 0),
    rankedWins: Object.values(stats).reduce((sum, s) => sum + s.rankedWins, 0),
    rankedLosses: Object.values(stats).reduce((sum, s) => sum + s.rankedLosses, 0),
    seededWins: Object.values(stats).reduce((sum, s) => sum + s.seededWins, 0),
    seededLosses: Object.values(stats).reduce((sum, s) => sum + s.seededLosses, 0),
    active: Object.values(stats).reduce((sum, s) => sum + s.active, 0)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#0D1A4D] text-white p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/nhsca/live">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Image src="/images/nc-united-logo-white.png" alt="NC United" width={36} height={36} className="object-contain" />
            <div>
              <h1 className="text-lg font-bold">NHSCA Admin</h1>
              <p className="text-xs text-white/70">Match Import</p>
            </div>
          </div>
          <Button onClick={loadAll} disabled={refreshing} variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-lg p-3 border-l-4 border-[#0D1A4D]">
            <div className="text-xs text-gray-500">NC Record</div>
            <div className="text-xl font-bold">{totalStats.totalWins}-{totalStats.totalLosses}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border-l-4 border-[#D3B574]">
            <div className="text-xs text-gray-500 flex items-center gap-1"><Flame className="w-3 h-3" />vs Ranked</div>
            <div className="text-xl font-bold">{totalStats.rankedWins}-{totalStats.rankedLosses}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border-l-4 border-[#B31B1B]">
            <div className="text-xs text-gray-500 flex items-center gap-1"><Target className="w-3 h-3" />vs Seeded</div>
            <div className="text-xl font-bold">{totalStats.seededWins}-{totalStats.seededLosses}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border-l-4 border-green-500">
            <div className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Active</div>
            <div className="text-xl font-bold">{totalStats.active}</div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 bg-white rounded-xl p-2">
          <button
            onClick={() => setMode("roster")}
            className={cn("flex-1 py-3 rounded-lg font-bold transition-all", mode === "roster" ? "bg-[#0D1A4D] text-white" : "text-gray-500")}
          >
            1. Roster
          </button>
          <button
            onClick={() => setMode("brackets")}
            className={cn("flex-1 py-3 rounded-lg font-bold transition-all", mode === "brackets" ? "bg-[#0D1A4D] text-white" : "text-gray-500")}
          >
            2. Brackets
          </button>
          <button
            onClick={() => setMode("matches")}
            className={cn("flex-1 py-3 rounded-lg font-bold transition-all", mode === "matches" ? "bg-[#0D1A4D] text-white" : "text-gray-500")}
          >
            3. Matches
          </button>
        </div>

        {/* Roster Import Card */}
        {mode === "roster" && (
          <div className="bg-[#0D1A4D] rounded-xl p-5 border-2 border-[#D3B574]">
            <h2 className="text-lg font-bold text-white mb-4">Import Roster</h2>
            
            {/* Classification */}
            <div className="flex gap-2 mb-3">
              {(["Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setClassification(c)}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold", classification === c ? "bg-[#B31B1B] text-white" : "bg-white/10 text-white/70")}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Weight Class */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-2">
              {["106","113","120","126","132","138","145","152","160","170","182","195","220","285"].map((w) => (
                <button
                  key={w}
                  onClick={() => setWeightClass(w)}
                  className={cn("px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap", weightClass === w ? "bg-[#D3B574] text-[#0D1A4D]" : "bg-white/10 text-white/70")}
                >
                  {w}
                </button>
              ))}
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="M. Crooke — NC
X. Bernthal — NC
J. Ybarra — NC
C. Raper — NC"
              rows={8}
              className="font-mono text-sm bg-white/10 border-white/20 text-white placeholder:text-white/30 mb-3"
            />

            {result && (
              <div className={cn("p-3 rounded-lg mb-3", result.type === "success" ? "bg-green-500/20" : "bg-red-500/20")}>
                <p className="text-white text-sm">{result.message}</p>
              </div>
            )}

            <Button onClick={processRoster} disabled={loading || !text.trim()} className="w-full bg-[#B31B1B] hover:bg-[#8B1515] text-white font-bold py-3">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {classification} {weightClass}lb Roster
            </Button>
          </div>
        )}

        {/* Brackets Import Card */}
        {mode === "brackets" && (
          <div className="bg-[#0D1A4D] rounded-xl p-5 border-2 border-[#D3B574]">
            <h2 className="text-lg font-bold text-white mb-4">Import Brackets</h2>
            
            {/* Classification */}
            <div className="flex gap-2 mb-3">
              {(["Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setClassification(c)}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold", classification === c ? "bg-[#B31B1B] text-white" : "bg-white/10 text-white/70")}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Weight Class */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-2">
              {["106","113","120","126","132","138","145","152","160","170","182","195","220","285"].map((w) => (
                <button
                  key={w}
                  onClick={() => setWeightClass(w)}
                  className={cn("px-3 py-1.5 rounded text-sm font-bold whitespace-nowrap", weightClass === w ? "bg-[#D3B574] text-[#0D1A4D]" : "bg-white/10 text-white/70")}
                >
                  {w}
                </button>
              ))}
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste bracket data here - wrestlers with seeds, positions, etc.

Example format from FloArena bracket view"
              rows={8}
              className="font-mono text-sm bg-white/10 border-white/20 text-white placeholder:text-white/30 mb-3"
            />

            {result && (
              <div className={cn("p-3 rounded-lg mb-3 max-h-48 overflow-y-auto", result.type === "success" ? "bg-green-500/20" : "bg-red-500/20")}>
                <p className="text-white text-sm font-bold mb-2">{result.message}</p>
                {result.details?.errors && result.details.errors.length > 0 && (
                  <div className="text-xs text-white/80 space-y-0.5 font-mono">
                    {result.details.errors.map((e, i) => (
                      <div key={i} className={e.startsWith('MISS') ? 'text-red-300' : e.startsWith('OK') ? 'text-green-300' : 'text-yellow-300'}>{e}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button onClick={processBrackets} disabled={loading || !text.trim()} className="w-full bg-[#B31B1B] hover:bg-[#8B1515] text-white font-bold py-3">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {classification} {weightClass}lb Brackets
            </Button>
          </div>
        )}

        {/* Match Import Card */}
        {mode === "matches" && (
        <div className="bg-[#0D1A4D] rounded-xl p-5 border-2 border-[#D3B574]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#D3B574] rounded-lg">
              <Trophy className="w-5 h-5 text-[#0D1A4D]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Matches</h2>
              <p className="text-xs text-gray-300">Paste from FloArena "By Team" view</p>
            </div>
          </div>

          {/* Classification Selector */}
          <div className="flex gap-2 mb-4">
            {(["Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
              <button
                key={c}
                onClick={() => setClassification(c)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all",
                  classification === c ? "bg-[#B31B1B] text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                {c.slice(0, 2)}
                <span className="hidden sm:inline">{c.slice(2)}</span>
                <span className="ml-1 text-xs opacity-60">{stats[c].totalWins}-{stats[c].totalLosses}</span>
              </button>
            ))}
          </div>

          {/* Text Input */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="106Charlie Fogle statesville, NC (NC) TF Bentley Alcantara Moncks Corner, SC (SC), 17-0 3:19
106Bodhi Nickerson Blossburg, PA (PA) F Gavin Spell Parkton, NC (NC), 2:57
113Aj White Julian, NC (NC) TF Benjamin Seifert Garden City, NY (NY), 16-0 2:38"
            rows={8}
            className="font-mono text-sm bg-white/10 border-white/20 text-white placeholder:text-white/30 mb-3"
          />

          {/* Result */}
          {result && (
            <div className={cn(
              "p-3 rounded-lg mb-3 flex items-start gap-2",
              result.type === "success" ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"
            )}>
              {result.type === "success" ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              <div>
                <p className="text-white font-medium text-sm">{result.message}</p>
                {result.details?.errors && result.details.errors.length > 0 && (
                  <ul className="mt-1 text-xs text-red-300 space-y-0.5">
                    {result.details.errors.slice(0, 3).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={processMatches}
            disabled={loading || !text.trim()}
            className="w-full bg-[#B31B1B] hover:bg-[#8B1515] text-white font-bold py-3"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Process {classification} Matches
          </Button>
        </div>
        )}

        {/* Division Stats */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-bold text-[#0D1A4D] mb-3">By Division</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
              <div key={c} className={cn("p-3 rounded-lg border-2", classification === c ? "border-[#B31B1B] bg-red-50" : "border-gray-200")}>
                <h4 className="font-bold text-[#0D1A4D] text-sm mb-2">{c}</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Record</span><span className="font-bold">{stats[c].totalWins}-{stats[c].totalLosses}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">vs Ranked</span><span className="font-bold text-[#D3B574]">{stats[c].rankedWins}-{stats[c].rankedLosses}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">vs Seeded</span><span className="font-bold text-[#B31B1B]">{stats[c].seededWins}-{stats[c].seededLosses}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Active</span><span className="font-bold text-green-600">{stats[c].active}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        {recentAlerts.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h3 className="font-bold text-[#0D1A4D] mb-3">Recent Win Alerts</h3>
            <div className="space-y-2">
              {recentAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">W</span>
                  <span className="font-bold text-[#0D1A4D]">{alert.wrestler_name}</span>
                  <span className="text-gray-400">def</span>
                  <span>{alert.opponent_name}</span>
                  {alert.opponent_seed && (
                    <span className="px-1.5 py-0.5 bg-[#D3B574] text-[#0D1A4D] text-xs font-bold rounded">#{alert.opponent_seed}</span>
                  )}
                  <span className="ml-auto text-gray-400 text-xs">{alert.weight_class} lbs</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
