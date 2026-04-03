"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, Trophy } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

type WinAlert = {
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

export function WinAlertsBanner({
  initialAlerts,
  genderFilter,
}: {
  initialAlerts: WinAlert[]
  genderFilter: "Male" | "Female"
}) {
  const [alerts, setAlerts] = useState<WinAlert[]>(initialAlerts)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setAlerts(initialAlerts)
    setCurrentIndex(0)
  }, [initialAlerts, genderFilter])

  useEffect(() => {
    const supabase = createBrowserClient()

    // Subscribe to new alerts
    const channel = supabase
      .channel("win_alerts_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "win_alerts" }, async () => {
        const { data: allAlerts } = await supabase
          .from("win_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)

        if (allAlerts) {
          // Filter by gender using roster lookup
          const { data: roster } = await supabase.from("nc_roster").select("name, gender").eq("gender", genderFilter)

          if (roster) {
            const wrestlerNames = new Set(roster.map((w) => w.name))
            const filteredAlerts = allAlerts.filter((alert) => wrestlerNames.has(alert.wrestler_name)).slice(0, 10)
            setAlerts(filteredAlerts)
            setCurrentIndex(0)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [genderFilter])

  useEffect(() => {
    if (alerts.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [alerts.length])

  if (alerts.length === 0) {
    return null
  }

  const currentAlert = alerts[currentIndex]

  return (
    <Card
      className={`relative overflow-hidden border-0 ${
        currentAlert.is_seeded_win
          ? "bg-gradient-to-r from-green-600 to-green-700"
          : "bg-gradient-to-r from-[#CC0000] to-[#8B0000]"
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0">
          {currentAlert.is_seeded_win ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Trophy className="h-6 w-6 text-white" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-md bg-white/20 px-2 py-1 text-xs font-bold text-white">
              {currentAlert.is_seeded_win ? "🏆 BIG WIN" : "W"}
            </span>
            <span className="text-sm font-medium text-white/90">NEWS ALERT</span>
            <span className="text-sm text-white/70">•</span>
            <span className="text-sm text-white/90">
              {currentAlert.wrestler_name} ({currentAlert.weight_class} lbs)
            </span>
          </div>

          <p className="text-lg font-bold text-white">
            {currentAlert.wrestler_name} wins by {currentAlert.win_type} over {currentAlert.opponent_name}
            {currentAlert.opponent_seed && ` (#${currentAlert.opponent_seed} seed)`} ({currentAlert.score})
          </p>
        </div>
      </div>

      {alerts.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {alerts.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
