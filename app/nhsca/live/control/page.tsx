"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Trophy, Target, Users, GitBranch } from "lucide-react"
import Link from "next/link"

type Classification = "Freshman" | "Sophomore" | "Junior" | "Senior"
type ImportMode = "roster" | "matches" | "brackets"

interface ParsedMatch {
  weight_class: string
  winner_name: string
  winner_state: string
  loser_name: string
  loser_state: string
  win_type: string
  score: string
  nc_wrestler: "winner" | "loser"
  is_ranked_opponent: boolean
  opponent_rank?: number
  is_seeded_opponent: boolean
  opponent_seed?: number
}

interface BracketEntry {
  wrestler_name: string
  state: string
  seed: number
  weight_class: string
}

interface RankedWrestler {
  name: string
  weight_class: string
  classification: Classification
  national_rank: number
}

export default function AdminPage() {
  const [classification, setClassification] = useState<Classification>("Freshman")
  const [importMode, setImportMode] = useState<ImportMode>("roster")
  const [rosterText, setRosterText] = useState("")
  const [matchText, setMatchText] = useState("")
  const [bracketText, setBracketText] = useState("")
  const [weightClass, setWeightClass] = useState("106")
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string[] } | null>(null)
  const [rankedWrestlers, setRankedWrestlers] = useState<RankedWrestler[]>([])
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, rankedWins: 0, seededWins: 0, active: 0 })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [classification])

  async function loadData() {
    // Load ranked wrestlers
    const { data: ranked } = await supabase
      .from("nhsca_ranked_wrestlers")
      .select("name, weight_class, classification, national_rank")
    setRankedWrestlers(ranked || [])

    // Load stats for current classification
    const { data: roster } = await supabase
      .from("nhsca_roster")
      .select("wins, losses, bracket_status")
      .eq("classification", classification)

    const { data: matches } = await supabase
      .from("nhsca_matches")
      .select("result, opponent_seed")
      .eq("classification", classification)

    if (roster && matches) {
      const totalWins = roster.reduce((sum, w) => sum + w.wins, 0)
      const totalLosses = roster.reduce((sum, w) => sum + w.losses, 0)
      const rankedWins = matches.filter(m => m.result === "W" && m.opponent_seed && m.opponent_seed <= 5).length
      const seededWins = matches.filter(m => m.result === "W" && m.opponent_seed && m.opponent_seed <= 16).length
      const active = roster.filter(w => w.bracket_status === "active" || w.losses < 2).length

      setStats({
        total: roster.length,
        wins: totalWins,
        losses: totalLosses,
        rankedWins,
        seededWins,
        active
      })
    }
  }

  function parseMatchLine(line: string): ParsedMatch | null {
    // Format: 106Charlie Fogle statesville, NC (NC) TF Bentley Alcantara Moncks Corner, SC (SC), 17-0 3:19
    const cleanLine = line.trim()
    if (!cleanLine) return null

    // Extract weight class (first 2-3 digits)
    const weightMatch = cleanLine.match(/^(\d{2,3})/)
    if (!weightMatch) return null
    const weight_class = weightMatch[1]

    // Remove weight from line
    const rest = cleanLine.slice(weight_class.length)

    // Win types to look for
    const winTypes = ["TF", "MD", "DEC", "SV", "TB", "FOR", "DQ", "INJ", "F"]
    let win_type = ""
    let splitIndex = -1

    for (const wt of winTypes) {
      const pattern = new RegExp(` ${wt} `)
      const match = rest.match(pattern)
      if (match && match.index !== undefined) {
        win_type = wt
        splitIndex = match.index
        break
      }
    }

    if (!win_type || splitIndex === -1) return null

    const winnerPart = rest.slice(0, splitIndex).trim()
    const loserPart = rest.slice(splitIndex + win_type.length + 2).trim()

    // Parse winner: "Charlie Fogle statesville, NC (NC)"
    // Name is everything before the city (which comes before state abbreviation)
    // Pattern: "FirstName LastName City, ST (ST)"
    const winnerMatch = winnerPart.match(/^(.+?)\s+([A-Za-z\s]+),\s*(\w{2})\s*\((\w{2})\)$/)
    if (!winnerMatch) return null

    // Parse loser: "Bentley Alcantara Moncks Corner, SC (SC), 17-0 3:19"
    const loserMatch = loserPart.match(/^(.+?)\s+([A-Za-z\s]+),\s*(\w{2})\s*\((\w{2})\),?\s*([\d-]+)?/)
    if (!loserMatch) return null

    // Extract names by finding where city starts (last word before comma that looks like a city)
    // Winner: group 1 + part of group 2 might be the name
    // For "Charlie Fogle statesville, NC" - we need "Charlie Fogle"
    const winnerWords = (winnerMatch[1] + " " + winnerMatch[2]).trim().split(/\s+/)
    const loserWords = (loserMatch[1] + " " + loserMatch[2]).trim().split(/\s+/)
    
    // Assume name is first 2 words, rest is city
    const winner_name = winnerWords.slice(0, 2).join(" ")
    const winner_state = winnerMatch[4]
    const loser_name = loserWords.slice(0, 2).join(" ")
    const loser_state = loserMatch[4]
    const score = loserMatch[5] || ""

    // Determine which is NC wrestler
    const nc_wrestler = winner_state === "NC" ? "winner" : loser_state === "NC" ? "loser" : null
    if (!nc_wrestler) return null

    // Check if opponent is nationally ranked
    const opponentName = nc_wrestler === "winner" ? loser_name : winner_name
    const rankedOpponent = rankedWrestlers.find(
      r => r.name.toLowerCase() === opponentName.toLowerCase() && 
           r.weight_class === weight_class &&
           r.classification === classification
    )

    return {
      weight_class,
      winner_name,
      winner_state,
      loser_name,
      loser_state,
      win_type,
      score,
      nc_wrestler,
      is_ranked_opponent: !!rankedOpponent,
      opponent_rank: rankedOpponent?.national_rank,
      is_seeded_opponent: false, // Will be set from bracket data
      opponent_seed: undefined
    }
  }

  async function processMatches() {
    setProcessing(true)
    setResult(null)

    const lines = matchText.split("\n").filter(l => l.trim())
    const parsed: ParsedMatch[] = []
    const errors: string[] = []
    const details: string[] = []

    // Parse all lines
    for (const line of lines) {
      const match = parseMatchLine(line)
      if (match) {
        parsed.push(match)
      } else if (line.trim()) {
        errors.push(`Could not parse: ${line.slice(0, 50)}...`)
      }
    }

    if (parsed.length === 0) {
      setResult({ success: false, message: "No valid matches found", details: errors })
      setProcessing(false)
      return
    }

    // Process each match
    let processed = 0
    let skipped = 0
    let rankedWins = 0
    let seededWins = 0

    for (const match of parsed) {
      const nc_wrestler_name = match.nc_wrestler === "winner" ? match.winner_name : match.loser_name
      const opponent_name = match.nc_wrestler === "winner" ? match.loser_name : match.winner_name
      const opponent_state = match.nc_wrestler === "winner" ? match.loser_state : match.winner_state
      const result = match.nc_wrestler === "winner" ? "W" : "L"

      // Parse score
      let nc_score = 0, opponent_score = 0
      if (match.score) {
        const scores = match.score.split("-").map(Number)
        if (result === "W") {
          nc_score = Math.max(...scores)
          opponent_score = Math.min(...scores)
        } else {
          nc_score = Math.min(...scores)
          opponent_score = Math.max(...scores)
        }
      }

      // Check for duplicate
      const { data: existing } = await supabase
        .from("nhsca_matches")
        .select("id")
        .eq("nc_wrestler_name", nc_wrestler_name)
        .eq("opponent_name", opponent_name)
        .eq("weight_class", match.weight_class)
        .eq("classification", classification)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Find roster entry - match by last name since roster may have initials (M. Crooke)
      const lastName = nc_wrestler_name.split(' ').pop() || nc_wrestler_name
      let { data: wrestler } = await supabase
        .from("nhsca_roster")
        .select("id, name, wins, losses, bracket_side")
        .eq("classification", classification)
        .eq("weight_class", match.weight_class)
        .ilike("name", `%${lastName}`)
        .single()

      if (!wrestler) {
        // Try full name match as fallback
        const { data: fullNameMatch } = await supabase
          .from("nhsca_roster")
          .select("id, name, wins, losses, bracket_side")
          .eq("classification", classification)
          .eq("weight_class", match.weight_class)
          .ilike("name", `%${nc_wrestler_name}%`)
          .single()
        
        wrestler = fullNameMatch
      }

      if (!wrestler) {
        // Auto-create wrestler with full name
        const { data: newWrestler, error: createError } = await supabase
          .from("nhsca_roster")
          .insert({
            name: nc_wrestler_name,
            school: "",
            weight_class: match.weight_class,
            classification,
            wins: 0,
            losses: 0,
            bracket_status: "active"
          })
          .select("id, name, wins, losses, bracket_side")
          .single()

        if (createError || !newWrestler) {
          errors.push(`Could not create wrestler: ${nc_wrestler_name}`)
          continue
        }
        wrestler = newWrestler
        details.push(`Added new wrestler: ${nc_wrestler_name} (${match.weight_class} lbs)`)
      } else if (wrestler.name.includes('.')) {
        // Update roster with full name if we only had initials
        await supabase
          .from("nhsca_roster")
          .update({ name: nc_wrestler_name })
          .eq("id", wrestler.id)
        details.push(`Updated name: ${wrestler.name} → ${nc_wrestler_name}`)
      }

      // Insert match
      const { error: matchError } = await supabase.from("nhsca_matches").insert({
        nc_wrestler_id: wrestler.id,
        nc_wrestler_name,
        opponent_name,
        opponent_state,
        opponent_school: "",
        opponent_seed: match.opponent_seed || null,
        weight_class: match.weight_class,
        classification,
        result,
        win_type: match.win_type,
        nc_score,
        opponent_score,
        round: "R32",
        status: "completed"
      })

      if (matchError) {
        errors.push(`DB error for ${nc_wrestler_name}: ${matchError.message}`)
        continue
      }

      // Update wrestler record with double elimination logic
      const newWins = result === "W" ? wrestler.wins + 1 : wrestler.wins
      const newLosses = result === "L" ? wrestler.losses + 1 : wrestler.losses
      
      // Double elimination bracket progression
      // Note: In placement rounds (3rd, 5th, 7th place), wrestlers can have 2+ losses and still compete
      let bracketStatus = wrestler.bracket_status || "active"
      let bracketSide = wrestler.bracket_side || "championship"
      
      if (result === "L") {
        if (bracketSide === "championship" && newLosses === 1) {
          // First loss in championship - move to consolation
          bracketSide = "consolation"
          bracketStatus = "active"
        } else if (bracketSide === "consolation" && newLosses === 2) {
          // Second loss in consolation - check if they're in placement rounds
          // If they made it to consi semis/finals, they go to placement rounds
          bracketStatus = "placement"
        } else if (bracketStatus === "placement") {
          // Loss in placement round - they got their final placement, now done
          bracketStatus = "placed"
        }
      }
      
      // Win in placement rounds keeps them in placement
      if (result === "W" && bracketStatus === "placement") {
        bracketStatus = "placement"
      }

      await supabase
        .from("nhsca_roster")
        .update({ 
          wins: newWins, 
          losses: newLosses, 
          bracket_status: bracketStatus,
          bracket_side: bracketSide
        })
        .eq("id", wrestler.id)

      processed++

      // Track notable wins
      if (result === "W") {
        if (match.is_ranked_opponent) {
          rankedWins++
          details.push(`RANKED WIN: ${nc_wrestler_name} beat #${match.opponent_rank} ${opponent_name}`)
        }
        if (match.is_seeded_opponent) {
          seededWins++
          details.push(`SEEDED WIN: ${nc_wrestler_name} beat #${match.opponent_seed} seed ${opponent_name}`)
        }
      }
    }

    // Build result message
    let message = `Processed ${processed} matches`
    if (skipped > 0) message += `, ${skipped} duplicates skipped`
    if (rankedWins > 0) message += `, ${rankedWins} ranked wins`
    if (seededWins > 0) message += `, ${seededWins} seeded wins`

    setResult({
      success: processed > 0,
      message,
      details: [...details, ...errors]
    })

    setMatchText("")
    setProcessing(false)
    loadData()
  }

  async function processRoster() {
    setProcessing(true)
    setResult(null)

    const lines = rosterText.split("\n").map(l => l.trim()).filter(l => l)
    const details: string[] = []
    const errors: string[] = []
    let processed = 0
    let skipped = 0

    // Parse multiple formats:
    // 1. "138\nLBSAaron Ellison" - FloArena roster format
    // 2. "M. Crooke — NC" - Bracket initial format
    // 3. "Round of 256" / "Round of 128" - Round headers (contain weight context)
    let currentWeight = ""
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip round headers
      if (line.startsWith("Round of")) continue
      
      // Check if this is just a weight class number
      if (/^\d{2,3}$/.test(line)) {
        currentWeight = line
        continue
      }

      // Format 2: Bracket initial format "M. Crooke — NC" or "M. Crooke - NC"
      const bracketMatch = line.match(/^([A-Z]\.\s*[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*)\s*[—-]\s*NC$/i)
      if (bracketMatch) {
        const name = bracketMatch[1].trim()
        if (!currentWeight) {
          errors.push(`No weight class for: ${name}`)
          continue
        }

        // Extract last name for duplicate check (since we only have initial)
        const lastName = name.split(/\s+/).pop() || name

        // Check for duplicate by last name
        const { data: existing } = await supabase
          .from("nhsca_roster")
          .select("id")
          .eq("classification", classification)
          .eq("weight_class", currentWeight)
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
          weight_class: currentWeight,
          classification,
          wins: 0,
          losses: 0,
          bracket_status: "active"
        })

        if (error) {
          errors.push(`Failed to add ${name}: ${error.message}`)
        } else {
          processed++
          details.push(`Added: ${name} (${currentWeight} lbs)`)
        }
        continue
      }

      // Format 1: FloArena format "LBSAaron Ellison4th Place" or "LBSAj White113"
      const match = line.match(/^LBS(.+?)(?:(\d+)(?:st|nd|rd|th)\s*Place)?(\d{2,3})?$/i)
      if (!match) {
        // Try simpler format: just "LBSName"
        const simpleMatch = line.match(/^LBS(.+)$/i)
        if (simpleMatch) {
          const name = simpleMatch[1].trim()
          if (!currentWeight) {
            errors.push(`No weight class for: ${name}`)
            continue
          }

          // Check for duplicate
          const { data: existing } = await supabase
            .from("nhsca_roster")
            .select("id")
            .eq("name", name)
            .eq("classification", classification)
            .eq("weight_class", currentWeight)
            .single()

          if (existing) {
            skipped++
            continue
          }

          // Insert wrestler
          const { error } = await supabase.from("nhsca_roster").insert({
            name,
            school: "",
            weight_class: currentWeight,
            classification,
            wins: 0,
            losses: 0,
            bracket_status: "active"
          })

          if (error) {
            errors.push(`Failed to add ${name}: ${error.message}`)
          } else {
            processed++
            details.push(`Added: ${name} (${currentWeight} lbs)`)
          }
        }
        continue
      }

      const name = match[1].trim()
      const placement = match[2] ? `${match[2]}${match[2] === '1' ? 'st' : match[2] === '2' ? 'nd' : match[2] === '3' ? 'rd' : 'th'} Place` : null
      const weight = match[3] || currentWeight

      if (!weight) {
        errors.push(`No weight class for: ${name}`)
        continue
      }

      // Check for duplicate
      const { data: existing } = await supabase
        .from("nhsca_roster")
        .select("id")
        .eq("name", name)
        .eq("classification", classification)
        .eq("weight_class", weight)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Insert wrestler
      const { error } = await supabase.from("nhsca_roster").insert({
        name,
        school: "",
        weight_class: weight,
        classification,
        wins: 0,
        losses: 0,
        bracket_status: "active"
      })

      if (error) {
        errors.push(`Failed to add ${name}: ${error.message}`)
      } else {
        processed++
        details.push(`Added: ${name} (${weight} lbs)`)
      }
    }

    setResult({
      success: processed > 0,
      message: `Added ${processed} wrestlers${skipped > 0 ? `, ${skipped} duplicates skipped` : ''}`,
      details: [...details.slice(0, 10), ...(details.length > 10 ? [`... and ${details.length - 10} more`] : []), ...errors]
    })

    setRosterText("")
    setProcessing(false)
    loadData()
  }

  async function processBrackets() {
    setProcessing(true)
    setResult(null)

    const lines = bracketText.split("\n").map(l => l.trim()).filter(l => l)
    const details: string[] = []
    let processed = 0
    let ncWrestlers: string[] = []
    let currentRound = ""
    let seedCounter = 1

    // Parse bracket format
    // Pattern: Name, State, Score pairs with win type between
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check for round headers
      if (line.includes("Round of") || line.includes("Quarter") || line.includes("Semi") || line.includes("Final") || line.includes("Places")) {
        currentRound = line
        if (line === "Round of 32") seedCounter = 1
        continue
      }

      // Skip match IDs
      if (line.startsWith("#")) continue

      // Check if this is a state abbreviation (2 letters)
      if (/^[A-Z]{2}$/.test(line)) {
        const prevLine = lines[i - 1]
        if (prevLine && !/^\d+$/.test(prevLine) && !prevLine.startsWith("#")) {
          // This is wrestler name + state
          const wrestlerName = prevLine
          const state = line
          
          if (state === "NC") {
            ncWrestlers.push(wrestlerName)
            
            // Update seed in roster if in Round of 32
            if (currentRound === "Round of 32") {
              const seed = Math.ceil(seedCounter / 2)
              const { data: wrestler } = await supabase
                .from("nhsca_roster")
                .select("id, name")
                .eq("classification", classification)
                .eq("weight_class", weightClass)
                .ilike("name", `%${wrestlerName}%`)
                .single()

              if (wrestler) {
                await supabase
                  .from("nhsca_roster")
                  .update({ seed })
                  .eq("id", wrestler.id)
                details.push(`Set ${wrestlerName} as #${seed} seed at ${weightClass} lbs`)
                processed++
              }
            }
          }
          seedCounter++
        }
      }
    }

    if (processed === 0 && ncWrestlers.length === 0) {
      setResult({ success: false, message: "No NC wrestlers found in bracket", details: ["Check format matches FloArena bracket export"] })
    } else {
      setResult({
        success: true,
        message: `Found ${ncWrestlers.length} NC wrestlers, updated ${processed} seeds`,
        details
      })
    }

    setBracketText("")
    setProcessing(false)
    loadData()
  }

  const classifications: Classification[] = ["Freshman", "Sophomore", "Junior", "Senior"]
  const weightClasses = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0D1A4D] text-white p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/nhsca/live">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">NHSCA Admin</h1>
            <p className="text-white/70 text-sm">Match Import</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/nhsca/live/social">
              <Button variant="ghost" className="text-white hover:bg-white/10 text-sm">
                Social Cards
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/10"
              onClick={loadData}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-[#B31B1B] text-white p-3">
        <div className="max-w-4xl mx-auto grid grid-cols-4 gap-2 text-center text-sm">
          <div>
            <div className="text-xl font-bold">{stats.wins}-{stats.losses}</div>
            <div className="text-white/70 text-xs">Record</div>
          </div>
          <div>
            <div className="text-xl font-bold">{stats.rankedWins}</div>
            <div className="text-white/70 text-xs">vs Ranked</div>
          </div>
          <div>
            <div className="text-xl font-bold">{stats.seededWins}</div>
            <div className="text-white/70 text-xs">vs Seeded</div>
          </div>
          <div>
            <div className="text-xl font-bold">{stats.active}</div>
            <div className="text-white/70 text-xs">Active</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Import Mode Toggle */}
        <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-gray-200">
          <button
            onClick={() => setImportMode("roster")}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
              importMode === "roster"
                ? "bg-[#0D1A4D] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            1. Roster
          </button>
          <button
            onClick={() => setImportMode("matches")}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
              importMode === "matches"
                ? "bg-[#0D1A4D] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Trophy className="w-4 h-4" />
            2. Matches
          </button>
          <button
            onClick={() => setImportMode("brackets")}
            className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
              importMode === "brackets"
                ? "bg-[#0D1A4D] text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <GitBranch className="w-4 h-4" />
            3. Seeds
          </button>
        </div>

        {/* Classification Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {classifications.map(c => (
            <button
              key={c}
              onClick={() => setClassification(c)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                classification === c
                  ? "bg-[#0D1A4D] text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-[#0D1A4D]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Roster Input */}
        {importMode === "roster" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#D3B574]" />
              <h2 className="font-bold text-[#0D1A4D]">Import {classification} Roster</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-3">
              Copy wrestler list from FloArena (Teams & Competitors view) and paste below
            </p>

            <textarea
              value={rosterText}
              onChange={(e) => setRosterText(e.target.value)}
              placeholder={`138
LBSAaron Ellison
220
LBSAaron Ruiz-angel5th Place
113
LBSAj White
182
LBSAlexander Mitchell`}
              className="w-full h-48 p-3 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D1A4D] focus:border-transparent"
            />

            <Button
              onClick={processRoster}
              disabled={processing || !rosterText.trim()}
              className="w-full mt-3 bg-[#0D1A4D] hover:bg-[#0D1A4D]/90 text-white py-3"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Import {classification} Roster
                </>
              )}
            </Button>
          </div>
        )}

        {/* Match Input */}
        {importMode === "matches" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-[#D3B574]" />
              <h2 className="font-bold text-[#0D1A4D]">Import {classification} Matches</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-3">
              Copy results from FloArena (By Team view) and paste below
            </p>

            <textarea
              value={matchText}
              onChange={(e) => setMatchText(e.target.value)}
              placeholder={`106Charlie Fogle statesville, NC (NC) TF Bentley Alcantara Moncks Corner, SC (SC), 17-0 3:19
113Aj White Julian, NC (NC) F Benjamin Seifert Garden City, NY (NY), 1:21`}
              className="w-full h-48 p-3 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D1A4D] focus:border-transparent"
            />

            <Button
              onClick={processMatches}
              disabled={processing || !matchText.trim()}
              className="w-full mt-3 bg-[#0D1A4D] hover:bg-[#0D1A4D]/90 text-white py-3"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Process {classification} Matches
                </>
              )}
            </Button>
          </div>
        )}

        {/* Bracket Import */}
        {importMode === "brackets" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-5 h-5 text-[#D3B574]" />
              <h2 className="font-bold text-[#0D1A4D]">Import {classification} Bracket</h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-3">
              Select weight class and paste bracket from FloArena
            </p>

            {/* Weight Class Selector */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {weightClasses.map(w => (
                <button
                  key={w}
                  onClick={() => setWeightClass(w)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    weightClass === w
                      ? "bg-[#B31B1B] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            <textarea
              value={bracketText}
              onChange={(e) => setBracketText(e.target.value)}
              placeholder={`Round of 32
O. Tounkara
NY
3
G. Dooley
FL
0
F
0:23
#7001
C. Foster
NC
...`}
              className="w-full h-48 p-3 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0D1A4D] focus:border-transparent"
            />

            <Button
              onClick={processBrackets}
              disabled={processing || !bracketText.trim()}
              className="w-full mt-3 bg-[#B31B1B] hover:bg-[#B31B1B]/90 text-white py-3"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Import {weightClass} lb Bracket
                </>
              )}
            </Button>
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div className={`rounded-xl p-4 mb-4 ${
            result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-bold ${result.success ? "text-green-800" : "text-red-800"}`}>
                {result.message}
              </span>
            </div>
            {result.details && result.details.length > 0 && (
              <div className="mt-2 space-y-1">
                {result.details.map((d, i) => (
                  <div key={i} className={`text-sm ${
                    d.startsWith("RANKED") ? "text-[#D3B574] font-bold" :
                    d.startsWith("SEEDED") ? "text-[#B31B1B] font-bold" :
                    "text-gray-600"
                  }`}>
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/nhsca/live" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-[#0D1A4D] transition-colors">
            <Users className="w-6 h-6 text-[#0D1A4D]" />
            <div>
              <div className="font-bold text-[#0D1A4D]">View Dashboard</div>
              <div className="text-xs text-gray-500">Live results</div>
            </div>
          </Link>
          <Link href="/nhsca/live/roster" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-[#0D1A4D] transition-colors">
            <Target className="w-6 h-6 text-[#B31B1B]" />
            <div>
              <div className="font-bold text-[#0D1A4D]">Manage Roster</div>
              <div className="text-xs text-gray-500">Add wrestlers</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
