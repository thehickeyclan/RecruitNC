"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Search, Target, Gift, MapPin, CheckCircle } from "lucide-react"

interface FunnelStage {
  name: string
  count: number
  icon: React.ReactNode
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

export function RecruitingFunnelChart({ stageCounts, schoolBranding }: RecruitingFunnelChartProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

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

  if (!isMounted) {
    return (
      <Card className="border-2 border-border bg-card/95 dark:bg-slate-900/85 dark:border-slate-800/80 backdrop-blur-sm transition-colors">
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

  const stages: FunnelStage[] = [
    {
      name: "Prospect",
      count: stageCounts["Prospect"] || 0,
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Contacted",
      count: stageCounts["Contacted"] || 0,
      icon: <Search className="h-5 w-5" />,
    },
    {
      name: "Recruiting",
      count: stageCounts["Recruiting"] || 0,
      icon: <Target className="h-5 w-5" />,
    },
  {
    name: "Visited",
    count: stageCounts["Visited"] || 0,
    icon: <MapPin className="h-5 w-5" />,
  },
    {
      name: "Offered",
      count: stageCounts["Offered"] || 0,
      icon: <Gift className="h-5 w-5" />,
    },
    {
      name: "Committed",
      count: stageCounts["Committed"] || 0,
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      name: "Signed",
      count: stageCounts["Signed"] || 0,
      icon: <CheckCircle className="h-5 w-5" />,
    },
  ]

  const totalAthletes = stages.reduce((sum, stage) => sum + stage.count, 0)

  const funnelHeight = isMobile ? 500 : 400
  const funnelWidth = isMobile ? 320 : 600
  const stageHeight = funnelHeight / stages.length
  const topWidth = funnelWidth * 0.95
  const bottomWidth = funnelWidth * 0.4

  const getStageColor = (index: number, isCommitted: boolean, isSigned: boolean): string => {
    // For Committed and Signed, use dark colors for better contrast
    if (isSigned && schoolBranding?.primary_color) {
      // Use primary color at high opacity for "Signed"
      const primaryRgb = hexToRgb(schoolBranding.primary_color)
      return `rgba(${primaryRgb}, 0.95)`
    }
    
    if (isCommitted && schoolBranding?.primary_color) {
      // Use primary color at high opacity for "Committed"
      const primaryRgb = hexToRgb(schoolBranding.primary_color)
      return `rgba(${primaryRgb}, 0.85)`
    }
    
    // For other stages, use gradient from light to medium
    if (schoolBranding?.primary_color) {
      const primaryRgb = hexToRgb(schoolBranding.primary_color)
      const opacity = 0.3 + index * 0.12 // Start light (0.3) and get darker
      return `rgba(${primaryRgb}, ${opacity})`
    }
    
    // Fallback colors if no branding
    const fallbackColors = [
      "#c76e7f", // Light pink (Prospect)
      "#a95463", // Lighter maroon (Contacted)
      "#9a4755", // Light maroon (Recruiting)
      "#8f424e", // Mid-tone maroon (Visited)
      "#8b3a47", // Medium maroon (Offered)
      "#7c2d3a", // Dark maroon (Committed)
      "#6d2628", // Darker maroon (Signed)
    ]
    return fallbackColors[index]
  }

  return (
    <Card className="border-2 border-border bg-card/95 dark:bg-slate-900/85 dark:border-slate-800/80 backdrop-blur-sm transition-colors">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">Recruiting Pipeline Funnel</CardTitle>
        <p className="text-muted-foreground text-sm">{totalAthletes} total athletes in pipeline</p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center overflow-x-auto">
          <svg
            width={funnelWidth}
            height={funnelHeight}
            className="mx-auto"
            viewBox={`0 0 ${funnelWidth} ${funnelHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {stages.map((stage, index) => {
              const y = index * stageHeight
              const topWidthAtStage = topWidth - (index * (topWidth - bottomWidth)) / stages.length
              const bottomWidthAtStage = topWidth - ((index + 1) * (topWidth - bottomWidth)) / stages.length
              const leftX = (funnelWidth - topWidthAtStage) / 2
              const rightX = (funnelWidth + topWidthAtStage) / 2
              const nextLeftX = (funnelWidth - bottomWidthAtStage) / 2
              const nextRightX = (funnelWidth + bottomWidthAtStage) / 2

              const conversionRate = totalAthletes > 0 ? ((stage.count / totalAthletes) * 100).toFixed(1) : "0"
              const isCommitted = stage.name === "Committed"
              const isSigned = stage.name === "Signed"
              const stageColor = getStageColor(index, isCommitted, isSigned)

              // Determine text color based on background brightness
              const isLightBg = isLightColor(stageColor)
              const textColor = "#FFFFFF"
              const strokeColor = isLightBg ? "rgba(255,255,255,0.45)" : "white"
              const textShadow = isLightBg
                ? "0 1px 3px rgba(0,0,0,0.45)"
                : "0 1px 3px rgba(0,0,0,0.65)"

              return (
                <g key={stage.name}>
                  <path
                    d={`M ${leftX} ${y} L ${rightX} ${y} L ${nextRightX} ${y + stageHeight} L ${nextLeftX} ${y + stageHeight} Z`}
                    fill={stageColor}
                    stroke={strokeColor}
                    strokeWidth="2"
                    className="transition-all hover:opacity-90 cursor-pointer"
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                    }}
                  />
                  <text
                    x={funnelWidth / 2}
                    y={y + stageHeight / 2 - 15}
                    textAnchor="middle"
                    fill={textColor}
                    className={`font-semibold uppercase tracking-wide ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{ textShadow }}
                  >
                    {stage.name}
                  </text>
                  <text
                    x={funnelWidth / 2}
                    y={y + stageHeight / 2 + 5}
                    textAnchor="middle"
                    fill={textColor}
                    className={`font-bold ${isMobile ? "text-xl" : "text-lg"}`}
                    style={{ textShadow }}
                  >
                    {stage.count}
                  </text>
                  <text
                    x={funnelWidth / 2}
                    y={y + stageHeight / 2 + 25}
                    textAnchor="middle"
                    fill={textColor}
                    className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                    style={{ textShadow, opacity: 0.9 }}
                  >
                    ({conversionRate}%)
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
