"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface BreakingNews {
  id: string
  message: string
  severity: string
  created_at: string
}

export function BreakingNewsBanner() {
  const [news, setNews] = useState<BreakingNews | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    console.log("[v0] Breaking news banner mounted")

    // Fetch latest breaking news
    const fetchBreakingNews = async () => {
      try {
        console.log("[v0] Fetching breaking news...")
        const response = await fetch("/api/breaking-news")
        const data = await response.json()
        console.log("[v0] Breaking news data:", data)

        if (data && data.length > 0) {
          const latestNews = data[0]

          // Check if user has already seen this news
          const dismissedNews = JSON.parse(localStorage.getItem("dismissedBreakingNews") || "[]")
          console.log("[v0] Dismissed news:", dismissedNews)

          if (!dismissedNews.includes(latestNews.id)) {
            console.log("[v0] Setting news:", latestNews)
            setNews(latestNews)
          } else {
            console.log("[v0] News already dismissed")
          }
        } else {
          console.log("[v0] No active breaking news found")
        }
      } catch (error) {
        console.error("[v0] Error fetching breaking news:", error)
      }
    }

    fetchBreakingNews()
  }, [])

  useEffect(() => {
    // Show banner on first interaction
    const handleInteraction = () => {
      console.log("[v0] User interaction detected, showing banner")
      if (news && !hasInteracted) {
        setHasInteracted(true)
        setIsVisible(true)

        // Start progress bar animation
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev <= 0) {
              clearInterval(interval)
              handleDismiss()
              return 0
            }
            return prev - 2
          })
        }, 100)

        return () => clearInterval(interval)
      }
    }

    if (news) {
      console.log("[v0] Adding interaction listeners")
      window.addEventListener("click", handleInteraction, { once: true })
      window.addEventListener("touchstart", handleInteraction, { once: true })

      return () => {
        window.removeEventListener("click", handleInteraction)
        window.removeEventListener("touchstart", handleInteraction)
      }
    }
  }, [news, hasInteracted])

  const handleDismiss = () => {
    console.log("[v0] Dismissing banner")
    setIsVisible(false)

    // Mark as dismissed in localStorage
    if (news) {
      const dismissedNews = JSON.parse(localStorage.getItem("dismissedBreakingNews") || "[]")
      dismissedNews.push(news.id)
      localStorage.setItem("dismissedBreakingNews", JSON.stringify(dismissedNews))
      console.log("[v0] Saved dismissed news to localStorage")
    }
  }

  if (!news || !isVisible) {
    console.log("[v0] Banner not visible. News:", !!news, "Visible:", isVisible)
    return null
  }

  console.log("[v0] Rendering banner")

  const severityColors = {
    high: "from-red-600 to-orange-600",
    medium: "from-orange-500 to-yellow-500",
    low: "from-blue-600 to-indigo-600",
  }

  const bgColor = severityColors[news.severity as keyof typeof severityColors] || severityColors.high

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300" />

      {/* Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-500">
        <div className="max-w-4xl mx-auto m-4">
          <div className={`bg-gradient-to-r ${bgColor} rounded-lg shadow-2xl p-6 relative`}>
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="pr-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white text-red-600 font-bold text-xs px-2 py-1 rounded uppercase tracking-wide">
                  Breaking News
                </span>
              </div>

              <p className="text-white font-bold text-xl sm:text-2xl">{news.message}</p>
            </div>

            {/* Auto-dismiss progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-lg overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
