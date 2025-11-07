"use client"

import { useEffect, useState } from "react"
import type { ElementType } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Target, PhoneCall, Handshake, ShieldCheck, Trophy } from "lucide-react"

interface FunnelStage {
  name: string
  count: number
  icon: ElementType
  description: string
}

interface SchoolBranding {
  primary_color: string
  secondary_color: string
}

interface RecruitingFunnelChartProps {
  stageCounts: Record<string, number>
  schoolBranding?: SchoolBranding | null
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return "128, 0, 0" // fallback to maroon RGB
  return `${Number.parseInt(result[1], 16)}, ${Number.parseInt(result[2], 16)}, ${Number.parseInt(result[3], 16)}`
}

function isLightColor(color: string): boolean {
  // Handle rgba colors
  if (color.startsWith("rgba(")) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
    if (match) {
      const r = Number.parseInt(match[1])
      const g = Number.parseInt(match[2])
      const b = Number.parseInt(match[3])
      const alpha = Number.parseFloat(match[4])
      // Calculate perceived brightness and account for opacity
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      const effectiveBrightness = brightness * alpha + (255 * (1 - alpha))
      return effectiveBrightness > 180 // Threshold for "light" color
    }
  }
  
  // Handle hex colors
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color)
  if (result) {
    const r = Number.parseInt(result[1], 16)
    const g = Number.parseInt(result[2], 16)
    const b = Number.parseInt(result[3], 16)
    // Calculate perceived brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 180 // Threshold for "light" color (white is 255)
  }
  
  // Handle rgb colors
  if (color.startsWith("rgb(")) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      const r = Number.parseInt(match[1])
      const g = Number.parseInt(match[2])
      const b = Number.parseInt(match[3])
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      return brightness > 180
    }
  }
  
  // Default to false if we can't parse the color
  return false
}

function normalizeHex(hex: string): string {
  if (!hex) return "#000000"
  let color = hex.replace("#", "")
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("")
  }
  return `#${color.padStart(6, "0")}`
}

function adjustHexColor(hex: string, amount: number): string {
  const normalized = normalizeHex(hex)
  const num = Number.parseInt(normalized.slice(1), 16)

  let r = (num >> 16) + amount
  let g = ((num >> 8) & 0x00ff) + amount
  let b = (num & 0x0000ff) + amount

  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function hexToRgba(hex: string, alpha = 1): string {
  const rgb = hexToRgb(hex)
  return `rgba(${rgb}, ${alpha})`
}

export function RecruitingFunnelChart({ stageCounts, schoolBranding }: RecruitingFunnelChartProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [activeStage, setActiveStage] = useState<number | null>(null)

  useEffect(() => {
    setIsMounted(true)

    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }
      checkMobile()
      window.addEventListener("resize", checkMobile)
      return () => window.removeEventListener("resize", checkMobile)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== "undefined" && isMounted) {
      if (schoolBranding?.primary_color) {
        const primaryRgb = hexToRgb(schoolBranding.primary_color)
        document.documentElement.style.setProperty("--school-primary", schoolBranding.primary_color)
        document.documentElement.style.setProperty("--school-primary-rgb", primaryRgb)
      }
      if (schoolBranding?.secondary_color) {
        document.documentElement.style.setProperty("--school-secondary", schoolBranding.secondary_color)
      }
    }
  }, [schoolBranding, isMounted])

  const stages: FunnelStage[] = [
    {
      name: "Prospect",
      count: stageCounts["Prospect"] || 0,
      icon: Users,
      description: "New leads entering your radar",
    },
    {
      name: "Contacted",
      count: stageCounts["Contacted"] || 0,
      icon: PhoneCall,
      description: "First touch points with coaches",
    },
    {
      name: "Recruiting",
      count: stageCounts["Recruiting"] || 0,
      icon: Target,
      description: "Active evaluations and conversations",
    },
    {
      name: "Offered",
      count: stageCounts["Offered"] || 0,
      icon: Handshake,
      description: "Scholarship or roster spots extended",
    },
    {
      name: "Committed",
      count: stageCounts["Committed"] || 0,
      icon: ShieldCheck,
      description: "Verbal commitments secured",
    },
    {
      name: "Signed",
      count: stageCounts["Signed"] || 0,
      icon: Trophy,
      description: "Signed LOI / officially joining",
    },
  ]

  useEffect(() => {
    if (stages.length === 0) return
    let bestIndex = 0
    stages.forEach((stage, index) => {
      if (stage.count > stages[bestIndex].count) {
        bestIndex = index
      }
    })
    setActiveStage(bestIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCounts.Prospect, stageCounts.Contacted, stageCounts.Recruiting, stageCounts.Offered, stageCounts.Committed, stageCounts.Signed])

  if (!isMounted) {
    return (
      <Card className="border-2 bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Recruiting Pipeline Funnel</CardTitle>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-[400px]">
            <div className="animate-pulse text-muted-foreground">Loading funnel...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalAthletes = stages.reduce((sum, stage) => sum + stage.count, 0)

  const funnelHeight = isMobile ? 500 : 400
  const funnelWidth = isMobile ? 320 : 600
  const stageHeight = funnelHeight / stages.length
  const topWidth = funnelWidth * 0.95
  const bottomWidth = funnelWidth * 0.4

  const fallbackPalette = ["#c76e7f", "#a95463", "#9a4755", "#8b3a47", "#7c2d3a", "#6d2628"]
  const basePrimaryColor = schoolBranding?.primary_color ? normalizeHex(schoolBranding.primary_color) : null
  const baseSecondaryColor = schoolBranding?.secondary_color ? normalizeHex(schoolBranding.secondary_color) : null

  const stageVisuals = stages.map((stage, index) => {
    const baseColor = basePrimaryColor ? adjustHexColor(basePrimaryColor, index * -8) : fallbackPalette[index % fallbackPalette.length]
    const gradientStart = adjustHexColor(baseColor, 35)
    const gradientEnd = adjustHexColor(baseColor, -28)
    const accentColor = baseSecondaryColor ? adjustHexColor(baseSecondaryColor, index * -6) : adjustHexColor(baseColor, -18)
    const textColor = isLightColor(gradientEnd) ? adjustHexColor(baseColor, -160) : "#FFFFFF"
    const strokeColor = isLightColor(gradientEnd) ? adjustHexColor(baseColor, -90) : adjustHexColor(baseColor, -130)
    const glowColor = hexToRgba(adjustHexColor(baseColor, -30), 0.35)
    const percentage = totalAthletes > 0 ? Number(((stage.count / totalAthletes) * 100).toFixed(1)) : 0

    return {
      baseColor,
      gradientStart,
      gradientEnd,
      accentColor,
      textColor,
      strokeColor,
      glowColor,
      percentage,
    }
  })

  const peakStageShare = stageVisuals.reduce((max, visual) => Math.max(max, visual.percentage), 0)
  const activeStageLabel = activeStage != null ? stages[activeStage]?.name : null
  const heroPrimaryTint = hexToRgba(basePrimaryColor ?? fallbackPalette[0], 0.45)
  const heroSecondaryTint = hexToRgba(baseSecondaryColor ?? fallbackPalette[3], 0.35)

  return (
    <Card className="relative overflow-hidden border border-white/30 bg-gradient-to-br from-white/80 via-white/60 to-white/30 shadow-xl backdrop-blur-xl">
      <div
        className="pointer-events-none absolute -top-32 right-[-10%] h-64 w-64 rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${heroPrimaryTint}, transparent 70%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-[-20%] h-80 w-80 rounded-full"
        style={{
          background: `radial-gradient(circle at center, ${heroSecondaryTint}, transparent 75%)`,
        }}
      />
      <CardHeader className="relative z-10 flex flex-col gap-4 pb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Recruiting Pipeline</CardTitle>
            <p className="text-sm text-slate-600 md:text-base">Live snapshot of where every athlete sits today</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-white/40 bg-white/70 text-slate-900 shadow-sm">
              {totalAthletes} total athletes
            </Badge>
            <Badge variant="outline" className="border-white/50 bg-white/30 text-slate-700">
              Peak stage {peakStageShare.toFixed(1)}%
            </Badge>
            {activeStageLabel && (
              <Badge variant="secondary" className="border-white/40 bg-[var(--school-primary,#c76e7f)]/20 text-slate-800">
                Focus: {activeStageLabel}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex justify-center overflow-x-auto">
          <svg
            width={funnelWidth}
            height={funnelHeight}
            className="mx-auto"
            viewBox={`0 0 ${funnelWidth} ${funnelHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {stageVisuals.map((visual, index) => (
                <linearGradient key={`gradient-${index}`} id={`funnel-stage-gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={hexToRgba(visual.gradientStart, 0.95)} />
                  <stop offset="100%" stopColor={hexToRgba(visual.gradientEnd, 0.85)} />
                </linearGradient>
              ))}
            </defs>
            {stages.map((stage, index) => {
              const y = index * stageHeight
              const topWidthAtStage = topWidth - (index * (topWidth - bottomWidth)) / stages.length
              const bottomWidthAtStage = topWidth - ((index + 1) * (topWidth - bottomWidth)) / stages.length
              const leftX = (funnelWidth - topWidthAtStage) / 2
              const rightX = (funnelWidth + topWidthAtStage) / 2
              const nextLeftX = (funnelWidth - bottomWidthAtStage) / 2
              const nextRightX = (funnelWidth + bottomWidthAtStage) / 2
              const visual = stageVisuals[index]
              const Icon = stage.icon
              const isActive = activeStage === index
              const conversionRate = visual.percentage
              const iconColor = isLightColor(visual.gradientStart) ? adjustHexColor(visual.baseColor, -140) : "#FFFFFF"
              const dropShadow = `drop-shadow(0 ${isActive ? 14 : 8}px ${isActive ? 28 : 16}px ${hexToRgba(adjustHexColor(visual.baseColor, -35), isActive ? 0.45 : 0.28)})`

              return (
                <g
                  key={stage.name}
                  role="listitem"
                  tabIndex={0}
                  onMouseEnter={() => setActiveStage(index)}
                  onFocus={() => setActiveStage(index)}
                  onMouseLeave={() => setActiveStage(null)}
                  onBlur={() => setActiveStage(null)}
                >
                  <path
                    d={`M ${leftX} ${y} L ${rightX} ${y} L ${nextRightX} ${y + stageHeight} L ${nextLeftX} ${y + stageHeight} Z`}
                    fill={`url(#funnel-stage-gradient-${index})`}
                    stroke={visual.strokeColor}
                    strokeWidth={isActive ? 3 : 2}
                    className="cursor-pointer"
                    style={{
                      transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), filter 0.35s ease, stroke-width 0.35s ease",
                      transformOrigin: "50% 50%",
                      transformBox: "fill-box",
                      transform: isActive ? "translateY(-6px) scale(1.01)" : "translateY(0px) scale(1)",
                      filter: dropShadow,
                      opacity: isActive ? 1 : 0.92,
                    }}
                  />
                  <foreignObject
                    x={funnelWidth / 2 - (isMobile ? 90 : 120)}
                    y={y + stageHeight / 2 - (isMobile ? 44 : 55)}
                    width={isMobile ? 180 : 240}
                    height={isMobile ? 88 : 110}
                    pointerEvents="none"
                  >
                    <div
                      className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-2 text-center"
                      style={{ color: visual.textColor }}
                    >
                      <div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 backdrop-blur-sm shadow-sm">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/30 shadow-sm">
                          <Icon className="h-4 w-4" style={{ color: iconColor }} />
                        </span>
                        <span
                          className={`font-semibold uppercase tracking-[0.18em] ${isMobile ? "text-[10px]" : "text-xs"}`}
                          style={{ color: iconColor }}
                        >
                          {stage.name}
                        </span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className={isMobile ? "text-2xl font-extrabold" : "text-3xl font-extrabold"}>{stage.count}</span>
                        <span className="text-[10px] uppercase tracking-[0.35em]" style={{ opacity: 0.7 }}>
                          athletes
                        </span>
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.2em]" style={{ opacity: 0.75 }}>
                        {conversionRate}% of pipeline
                      </div>
                    </div>
                  </foreignObject>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stages.map((stage, index) => {
            const visual = stageVisuals[index]
            const Icon = stage.icon
            const isActive = activeStage === index
            const shareWidth =
              visual.percentage === 0 ? 4 : Math.min(100, Math.max(8, visual.percentage))
            const summaryGlow = hexToRgba(adjustHexColor(visual.baseColor, -25), isActive ? 0.45 : 0.28)
            const summaryIconColor = adjustHexColor(visual.baseColor, -140)

            return (
              <div
                key={`${stage.name}-summary`}
                className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl focus-visible:-translate-y-1 focus-visible:shadow-xl"
                onMouseEnter={() => setActiveStage(index)}
                onFocus={() => setActiveStage(index)}
                onMouseLeave={() => setActiveStage(null)}
                onBlur={() => setActiveStage(null)}
                tabIndex={0}
                role="presentation"
              >
                <div
                  className="absolute inset-0 opacity-80 transition-opacity group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${hexToRgba(visual.gradientStart, 0.35)}, ${hexToRgba(visual.gradientEnd, 0.55)})`,
                  }}
                />
                <div className="relative z-10 flex items-center justify-between gap-4 px-4 pt-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/40 shadow"
                      style={{ boxShadow: `0 12px 24px ${summaryGlow}` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: summaryIconColor }} />
                    </span>
                    <div className="text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
                        {stage.name}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {stage.count} <span className="text-sm font-medium text-slate-600">athletes</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600">share</p>
                    <p className="text-base font-semibold text-slate-900">{visual.percentage}%</p>
                  </div>
                </div>
                <div className="relative z-10 px-4 pb-5 pt-3">
                  <p className="text-xs text-slate-600">{stage.description}</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-white/40">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${shareWidth}%`,
                        background: `linear-gradient(90deg, ${hexToRgba(visual.gradientStart, 0.9)}, ${hexToRgba(visual.gradientEnd, 0.9)})`,
                        boxShadow: `0 6px 18px ${summaryGlow}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
