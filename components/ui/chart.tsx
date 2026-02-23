"use client"

import React from "react"
import {
  ResponsiveContainer as RechartsResponsiveContainer,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts"

export const Chart = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export const ChartSeries = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export const LineChart = RechartsLineChart
export const LineSeries = RechartsLine
export const ResponsiveContainer = RechartsResponsiveContainer
export const XAxis = RechartsXAxis
export const YAxis = RechartsYAxis
export const CartesianGrid = RechartsCartesianGrid
export const Legend = RechartsLegend

interface ChartTooltipContentProps {
  active?: boolean
  label?: string | number
  payload?: Array<{ value: unknown; name: string; color?: string }>
  formatter?: (value: unknown, name: string) => [unknown, string]
}

export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({
  active,
  label,
  payload,
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-md border bg-white p-2 shadow-sm">
      <div className="mb-1 text-xs font-medium">{label ?? ""}</div>
      {payload.map((item, index) => {
        const [value, name] = formatter ? formatter(item.value, item.name) : [item.value, item.name]
        return (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color || "#999" }}
            />
            <span className="opacity-60">{name}:</span>
            <span className="font-medium">{String(value)}</span>
          </div>
        )
      })}
    </div>
  )
}

export const ChartTooltip = RechartsTooltip

export type ChartConfig = Record<string, { label: string; color: string }>

interface ChartContainerProps {
  children: React.ReactNode
  config?: ChartConfig
  className?: string
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ children, config, className }) => {
  const style: React.CSSProperties = {
    ["--color-Total" as string]: config?.Total?.color ?? "#002147",
    ["--color-Freshman" as string]: config?.Freshman?.color ?? "#CBAF5D",
    ["--color-Sophomore" as string]: config?.Sophomore?.color ?? "#B31B1B",
    ["--color-Junior" as string]: config?.Junior?.color ?? "#4A7C59",
    ["--color-Senior" as string]: config?.Senior?.color ?? "#002147",
    ["--color-JuniorFreshman" as string]: config?.JuniorFreshman?.color ?? "#000000",
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
