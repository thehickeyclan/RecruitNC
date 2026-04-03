"use client"

import { useEffect, useState, useRef } from "react"
import { X, AlertCircle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface BreakingNews {
  id: string
  message: string
  severity: "info" | "warning" | "critical"
  published_at: string
}

function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      color: string
    }> = []

    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"]

    const createFirework = (x: number, y: number) => {
      const particleCount = 30
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount
        const velocity = 2 + Math.random() * 3
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
    }

    // Create initial fireworks
    const positions = [
      { x: canvas.width * 0.2, y: canvas.height * 0.3 },
      { x: canvas.width * 0.5, y: canvas.height * 0.2 },
      { x: canvas.width * 0.8, y: canvas.height * 0.3 },
    ]

    positions.forEach((pos, i) => {
      setTimeout(() => createFirework(pos.x, pos.y), i * 300)
    })

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.1 // gravity
        p.life -= 0.01

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.fill()
        ctx.globalAlpha = 1
      }

      if (particles.length > 0) {
        requestAnimationFrame(animate)
      }
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-40" />
}

export function BreakingNewsModal() {
  const [news, setNews] = useState<BreakingNews | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const checkForBreakingNews = async () => {
      const supabase = getSupabaseBrowserClient()

      const { data, error } = await supabase
        .from("breaking_news")
        .select("*")
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return

      // Check if user has already dismissed this news
      const dismissedNews = JSON.parse(localStorage.getItem("dismissedBreakingNews") || "[]")
      if (dismissedNews.includes(data.id)) return

      setNews(data)
      setVisible(true)

      setTimeout(() => {
        handleDismiss()
      }, 7000)
    }

    checkForBreakingNews()

    // Subscribe to new breaking news
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel("breaking-news-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "breaking_news" }, () => {
        checkForBreakingNews()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDismiss = () => {
    if (!news) return

    // Store dismissed news ID in localStorage
    const dismissedNews = JSON.parse(localStorage.getItem("dismissedBreakingNews") || "[]")
    dismissedNews.push(news.id)
    localStorage.setItem("dismissedBreakingNews", JSON.stringify(dismissedNews))

    setVisible(false)
  }

  if (!visible || !news) return null

  const severityColors = {
    info: "from-blue-600 to-blue-700",
    warning: "from-orange-600 to-orange-700",
    critical: "from-red-600 to-red-700",
  }

  return (
    <>
      <Fireworks />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleDismiss} />

        {/* Modal */}
        <div
          className={`relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br ${severityColors[news.severity]} rounded-xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-300`}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>

          {/* Content */}
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full bg-white/20 flex-shrink-0">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">🚨 BREAKING NEWS</h2>
              <p className="text-lg sm:text-xl text-white leading-relaxed break-words">{news.message}</p>
            </div>
          </div>

          {/* Auto-dismiss indicator */}
          <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-white/80 text-center">Click X or wait to dismiss</div>
        </div>
      </div>
    </>
  )
}
