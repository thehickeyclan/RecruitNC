"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type MatchAlert = {
  id: string
  wrestler_name: string
  weight_class: string
  opponent_name: string
  opponent_seed: number | null
  win_type: string
  score: string
  is_seeded_win: boolean
  created_at: string
}

export function MatchAlertsBanner({ initialAlerts }: { initialAlerts: MatchAlert[] }) {
  const [alerts, setAlerts] = useState<MatchAlert[]>(initialAlerts)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("match_alerts_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_alerts" }, (payload) => {
        setAlerts((current) => [payload.new as MatchAlert, ...current])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Auto-rotate alerts
  useEffect(() => {
    if (alerts.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((current) => (current + 1) % alerts.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [alerts.length])

  if (alerts.length === 0) {
    return null
  }

  const currentAlert = alerts[currentIndex]
  const isSeededWin = currentAlert.is_seeded_win

  return (
    <Card
      className={`relative overflow-hidden border-0 ${
        isSeededWin ? "bg-gradient-to-r from-green-600 to-green-700" : "bg-gradient-to-r from-[#CC0000] to-[#8B0000]"
      }`}
    >
      <div className="flex items-center gap-4 p-6">
        <div className="flex-shrink-0">
          {isSeededWin ? <Trophy className="h-8 w-8 text-white" /> : <TrendingUp className="h-8 w-8 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
              {isSeededWin ? "BIG WIN" : "WIN"}
            </span>
            <span className="text-white/90 text-sm font-medium">
              {currentAlert.wrestler_name} ({currentAlert.weight_class} lbs)
            </span>
          </div>

          <p className="text-white text-lg font-bold">
            {isSeededWin && currentAlert.opponent_seed && (
              <span className="text-yellow-300">WINS OVER #{currentAlert.opponent_seed} SEED: </span>
            )}
            {currentAlert.wrestler_name} defeats {currentAlert.opponent_name} by {currentAlert.win_type} (
            {currentAlert.score})
          </p>
        </div>
      </div>

      {alerts.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {alerts.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? "w-8 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
