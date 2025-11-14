"use client"

import { memo, useMemo } from "react"
import { ProfessionalCommitmentCard } from "./professional-commitment-card"

interface PerformanceOptimizedGridProps {
  athletes: any[]
  loading?: boolean
  className?: string
}

// Memoized grid component
const PerformanceOptimizedGrid = memo(function PerformanceOptimizedGrid({
  athletes,
  loading = false,
  className = "",
}: PerformanceOptimizedGridProps) {
  // Memoize the grid items to prevent unnecessary re-renders
  const gridItems = useMemo(() => {
    return athletes.map((athlete, index) => <ProfessionalCommitmentCard key={athlete.id} athlete={athlete} />)
  }, [athletes])

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-96" />
        ))}
      </div>
    )
  }

  return <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>{gridItems}</div>
})

export default PerformanceOptimizedGrid
