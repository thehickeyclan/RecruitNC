"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"

interface SchoolBranding {
  primary_color: string
  secondary_color: string
  primary_color_rgb?: string
  secondary_color_rgb?: string
}

interface PipelineStats {
  totalAthletes: number
  needsFollowup: number
  activeThisWeek: number
  offersOut: number
  committed: number
  byClass: {
    [year: number]: number
  }
}

interface StatsSummaryBarProps {
  schoolBranding?: SchoolBranding | null
  stats: PipelineStats
  onFilterClick?: (filter: string) => void
}

export const StatsSummaryBar: React.FC<StatsSummaryBarProps> = ({ schoolBranding, stats, onFilterClick }) => {
  const primaryColor = schoolBranding?.primary_color || "#3B82F6"
  const secondaryColor = schoolBranding?.secondary_color || "#10B981"

  return (
    <div
      className="overflow-x-auto pb-2"
      style={
        {
          "--school-primary": primaryColor,
          "--school-secondary": secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="flex gap-4 min-w-max px-4 py-4">
        {/* Total Pipeline */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 backdrop-blur-sm rounded-xl border-2 min-w-[160px] transition-all"
          style={{ borderColor: primaryColor }}
        >
          <div className="text-2xl">👥</div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">{stats.totalAthletes}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total in Pipeline</div>
          </div>
        </div>

        {/* Needs Follow-up */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-red-950/30 backdrop-blur-sm rounded-xl border-2 border-red-500/50 min-w-[140px] cursor-pointer hover:-translate-y-0.5 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/20 transition-all"
          onClick={() => onFilterClick?.("needsFollowup")}
        >
          <div className="text-2xl">🔔</div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-red-400">{stats.needsFollowup}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Need Follow-up</div>
          </div>
        </div>

        {/* Active This Week */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 backdrop-blur-sm rounded-xl border-2 border-gray-700 min-w-[140px] transition-all">
          <div className="text-2xl">📈</div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">{stats.activeThisWeek}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Active This Week</div>
          </div>
        </div>

        {/* Offers Out */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 backdrop-blur-sm rounded-xl border-2 border-gray-700 min-w-[140px] cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
          style={{
            borderColor: `${primaryColor}40`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = primaryColor
            e.currentTarget.style.boxShadow = `0 10px 25px -5px ${primaryColor}30`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${primaryColor}40`
            e.currentTarget.style.boxShadow = "none"
          }}
          onClick={() => onFilterClick?.("offered")}
        >
          <div className="text-2xl">🎯</div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">{stats.offersOut}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Offers Out</div>
          </div>
        </div>

        {/* Committed */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-green-950/30 backdrop-blur-sm rounded-xl border-2 border-green-500/50 min-w-[140px] cursor-pointer hover:-translate-y-0.5 hover:border-green-400 hover:shadow-lg hover:shadow-green-500/20 transition-all"
          onClick={() => onFilterClick?.("committed")}
        >
          <div className="text-2xl">✅</div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-green-400">{stats.committed}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Committed</div>
          </div>
        </div>

        {/* Class Breakdown */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 backdrop-blur-sm rounded-xl border-2 border-gray-700 min-w-[280px] transition-all">
          <div className="text-2xl">🎓</div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(stats.byClass)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, count]) => (
                  <Badge
                    key={year}
                    variant="outline"
                    className="text-[10px] font-semibold px-2 py-0.5 bg-gray-900/50 border-gray-600 text-gray-300"
                  >
                    {year}: {count}
                  </Badge>
                ))}
            </div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">By Class Year</div>
          </div>
        </div>
      </div>
    </div>
  )
}
