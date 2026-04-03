"use client"

import { useEffect, useState, useRef } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

type Classification = "Freshman" | "Sophomore" | "Junior" | "Senior"

interface NHSCARoster {
  id: string
  name: string
  weight_class: string
  classification: Classification
  school: string
  wins: number
  losses: number
  seed: number | null
  placement: number | null
  bracket_status: string
  bracket_side: string | null
  current_round: string | null
  furthest_consi_round: string | null
}

export default function StillAlivePage() {
  const [roster, setRoster] = useState<NHSCARoster[]>([])
  const [loading, setLoading] = useState(true)
  const [classification, setClassification] = useState<Classification>("Freshman")
  const cardRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    
    // Get wrestlers who are still alive (have an active current_round like QF, SF, Consi8, etc.)
    const { data } = await supabase
      .from("nhsca_roster")
      .select("*")
      .eq("classification", classification)
      .in("current_round", ["QF", "SF", "F", "Consi8", "Consi4", "Consi-SF", "Consi-F", "R16", "R32"])
      .order("wins", { ascending: false })
    
    setRoster((data as NHSCARoster[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [classification])

  // Sort by wins desc, then losses asc
  const sortedRoster = [...roster].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    if (a.losses !== b.losses) return a.losses - b.losses
    return parseInt(a.weight_class) - parseInt(b.weight_class)
  })

  const getNextRound = (wrestler: NHSCARoster) => {
    // If they have a loss, they're in consolations
    if (wrestler.losses === 1) {
      // Return furthest consi round or current round
      return wrestler.furthest_consi_round || wrestler.current_round || "-"
    }
    // No losses = championship bracket
    return wrestler.current_round || "QF"
  }

  const getSeededInto = (wrestler: NHSCARoster) => {
    // If no losses and has furthest_consi_round, that's where they'd be seeded
    if (wrestler.losses === 0 && wrestler.furthest_consi_round) {
      return wrestler.furthest_consi_round
    }
    return "-"
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#0D1A4D] text-white p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/nhsca/live" className="flex items-center gap-2 text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <h1 className="text-xl font-bold">Still Alive / Competing</h1>
          <Button onClick={fetchData} variant="ghost" size="sm" className="text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Classification Tabs */}
        <div className="flex gap-2 mb-6 justify-center">
          {(["Freshman", "Sophomore", "Junior", "Senior"] as Classification[]).map((c) => (
            <Button
              key={c}
              onClick={() => setClassification(c)}
              variant={classification === c ? "default" : "outline"}
              className={classification === c ? "bg-[#0D1A4D]" : ""}
            >
              {c}
            </Button>
          ))}
        </div>

        {/* Shareable Card */}
        <div 
          ref={cardRef}
          className="relative rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #0a1128 0%, #1a2744 50%, #0D1A4D 100%)",
          }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#B31B1B]/20 to-transparent" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#D3B574]/5 rounded-full blur-3xl" />
          
          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-lg flex items-center justify-center border border-[#D3B574]/30">
                  <span className="text-white font-bold text-xs text-center leading-tight">NC<br/>UNITED</span>
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    {classification.toUpperCase()}
                  </h1>
                  <p className="text-[#D3B574] font-semibold tracking-wide">
                    STILL ALIVE / COMPETING
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black">
                  <span className="text-[#B31B1B]">RECRUIT</span>
                  <span className="text-white">NC</span>
                </div>
                <p className="text-white/60 text-sm">NHSCA Nationals 2026</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="relative px-6 pb-6">
            <div className="bg-white/5 backdrop-blur rounded-lg overflow-hidden border border-white/10">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 border-b border-white/10 text-xs font-bold text-white/70 uppercase tracking-wider">
                <div className="col-span-4">Wrestler</div>
                <div className="col-span-2 text-center">WT</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-2 text-center">Seeded</div>
                <div className="col-span-2 text-center">Next</div>
              </div>

              {/* Table Body */}
              {loading ? (
                <div className="p-8 text-center text-white/60">Loading...</div>
              ) : sortedRoster.length === 0 ? (
                <div className="p-8 text-center text-white/60">No wrestlers still competing</div>
              ) : (
                sortedRoster.map((wrestler, index) => {
                  const nextRound = getNextRound(wrestler)
                  const seededInto = getSeededInto(wrestler)
                  const inConsi = wrestler.losses === 1
                  
                  return (
                    <div 
                      key={wrestler.id}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                        index % 2 === 0 ? "bg-white/[0.02]" : ""
                      } ${index !== sortedRoster.length - 1 ? "border-b border-white/5" : ""}`}
                    >
                      <div className="col-span-4">
                        <span className="font-bold text-white text-sm">{wrestler.name}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-[#B31B1B]/80 text-white font-bold text-xs">
                          {wrestler.weight_class}
                        </span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="font-bold text-white text-sm">
                          {wrestler.wins}-{wrestler.losses}
                        </span>
                      </div>
                      <div className="col-span-2 text-center">
                        {seededInto !== "-" ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-[#D3B574]/20 text-[#D3B574] font-semibold text-xs border border-[#D3B574]/30">
                            {seededInto}
                          </span>
                        ) : (
                          <span className="text-white/40 text-sm">-</span>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-bold text-xs ${
                          inConsi 
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" 
                            : "bg-[#D3B574] text-[#0D1A4D]"
                        }`}>
                          {nextRound}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between text-white/40 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-[#D3B574]" /> Championship
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-orange-500/50 border border-orange-500/50" /> Consolation
                </span>
              </div>
              <div>
                {sortedRoster.length} wrestlers still competing
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Screenshot the card above to save and share on social media
        </p>
      </div>
    </div>
  )
}
