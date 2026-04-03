"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Trophy, Zap, TrendingUp, AlertCircle } from "lucide-react"

interface Insight {
  type: "big_win" | "upcoming" | "win" | "loss" | "seeded_loss"
  text: string
  wrestler: string
  weightClass: string
  result?: string
  seedInfo?: string | null // Add seed info for badge
}

export function AIInsightsFeed({ insights }: { insights: Insight[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (insights.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [insights.length])

  if (insights.length === 0) {
    return null
  }

  const currentInsight = insights[currentIndex]

  const getIcon = (type: string) => {
    switch (type) {
      case "big_win":
        return <Trophy className="h-5 w-5" />
      case "seeded_loss":
        return <AlertCircle className="h-5 w-5" />
      case "upcoming":
        return <Zap className="h-5 w-5" />
      case "win":
        return <TrendingUp className="h-5 w-5" />
      case "loss":
        return <TrendingUp className="h-5 w-5" />
      default:
        return <Trophy className="h-5 w-5" />
    }
  }

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/)
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  const getCardStyle = (type: string) => {
    if (type === "big_win") {
      return "bg-gradient-to-r from-green-600 to-green-700"
    }
    if (type === "seeded_loss") {
      return "bg-gradient-to-r from-orange-600 to-red-700"
    }
    return "bg-gradient-to-r from-[#CC0000] to-[#8B0000]"
  }

  return (
    <Card className={`${getCardStyle(currentInsight.type)} text-white p-4 sm:p-6 mb-6`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0 mt-1">{getIcon(currentInsight.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {currentInsight.result && (
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded ${
                  currentInsight.result === "win" ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {currentInsight.result === "win" ? "W" : "L"}
              </span>
            )}
            {currentInsight.seedInfo && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-500 text-black">
                {currentInsight.seedInfo}
              </span>
            )}
            <span className="text-xs sm:text-sm font-bold tracking-wider">NEWS ALERT</span>
            <span className="text-xs opacity-75 hidden sm:inline">•</span>
            <span className="text-xs opacity-75 hidden sm:inline">
              {currentInsight.wrestler} ({currentInsight.weightClass} lbs)
            </span>
          </div>
          <p className="text-base sm:text-lg font-medium leading-relaxed">{renderText(currentInsight.text)}</p>
          <div className="flex gap-1 mt-3">
            {insights.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all ${
                  idx === currentIndex ? "bg-white w-8" : "bg-white/30 w-1"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
