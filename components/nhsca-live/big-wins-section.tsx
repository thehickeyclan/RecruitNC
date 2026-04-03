"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, ChevronDown, ChevronUp } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

type BigWin = {
  id: string
  wrestler_name: string
  weight_class: string
  opponent_name: string
  opponent_seed: number
  opponent_state: string
  win_type: string
  score: string
  round: string
  bout_number: string
  created_at: string
}

export function BigWinsSection({ genderFilter }: { genderFilter: "Male" | "Female" }) {
  const [bigWins, setBigWins] = useState<BigWin[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)

  const fetchBigWins = async () => {
    const supabase = createBrowserClient()

    const { data } = await supabase
      .from("win_alerts")
      .select("*")
      .eq("is_seeded_win", true)
      .eq("gender", genderFilter)
      .order("opponent_seed", { ascending: true })
      .order("weight_class", { ascending: true })

    if (data) {
      setBigWins(data as BigWin[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBigWins()

    const supabase = createBrowserClient()
    const channel = supabase
      .channel("big_wins_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "win_alerts" }, () => {
        fetchBigWins()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [genderFilter])

  if (loading) {
    return null
  }

  if (bigWins.length === 0) {
    return (
      <div className="mb-6">
        <Card className="border-2 border-[#D3B574] bg-gradient-to-br from-white to-[#D3B574]/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D3B574]">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold text-[#0D1A4D]">Big Wins</CardTitle>
                <p className="text-sm text-gray-600">NC wrestlers defeating seeded opponents</p>
              </div>
              <Badge variant="secondary" className="text-lg font-bold">
                0
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="ml-2">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </CardHeader>
          {isExpanded && (
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No big wins recorded yet</p>
                <p className="text-sm mt-1">Seeded victories will appear here as bracket data is added</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  const getSeedColor = (seed: number) => {
    if (seed <= 8) return "bg-yellow-500 text-white"
    if (seed <= 16) return "bg-orange-500 text-white"
    return "bg-blue-500 text-white"
  }

  const getSeedIcon = (seed: number) => {
    if (seed <= 8) return <Trophy className="w-4 h-4" />
    return <Medal className="w-4 h-4" />
  }

  return (
    <div className="mb-6">
      <Card className="border-2 border-[#D3B574] bg-gradient-to-br from-white to-[#D3B574]/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D3B574]">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-[#0D1A4D]">Big Wins</CardTitle>
              <p className="text-sm text-gray-600">NC wrestlers defeating seeded opponents</p>
            </div>
            <Badge variant="secondary" className="text-lg font-bold">
              {bigWins.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="ml-2">
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bigWins.map((win) => (
                <Card key={win.id} className="border-l-4 border-l-green-600 bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-[#0D1A4D] text-lg">{win.wrestler_name}</div>
                        <div className="text-sm text-gray-600">{win.weight_class} lbs</div>
                      </div>
                      <Badge className={`${getSeedColor(win.opponent_seed)} flex items-center gap-1`}>
                        {getSeedIcon(win.opponent_seed)}
                        <span className="font-bold">#{win.opponent_seed}</span>
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Defeated:</span>
                        <span className="font-semibold text-[#0D1A4D]">
                          {win.opponent_name} ({win.opponent_state})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Decision:</span>
                        <span className="font-semibold text-green-600">
                          {win.win_type} {win.score}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Round:</span>
                        <span className="font-medium text-gray-700">{win.round}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
