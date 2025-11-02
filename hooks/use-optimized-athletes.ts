"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface Athlete {
  id: string
  name: string
  highschool: string
  college: string
  division: string
  graduationyear: number
  photourl: string
  weightclass: string
  gender: string
}

interface UseOptimizedAthletesOptions {
  pageSize?: number
  enableInfiniteScroll?: boolean
}

export function useOptimizedAthletes(options: UseOptimizedAthletesOptions = {}) {
  const { pageSize = 20, enableInfiniteScroll = false } = options

  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const supabase = createClient()

  const loadAthletes = useCallback(
    async (pageNum = 0, append = false) => {
      try {
        setLoading(true)

        // Only select fields we actually need for the cards
        const { data, error } = await supabase
          .from("athletes")
          .select("id, name, highschool, college, division, graduationyear, photourl, weightclass, gender")
          .not("college", "is", null)
          .order("created_at", { ascending: false })
          .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1)

        if (error) throw error

        if (append) {
          setAthletes((prev) => [...prev, ...(data || [])])
        } else {
          setAthletes(data || [])
        }

        setHasMore((data?.length || 0) === pageSize)
      } catch (error) {
        console.error("Error loading athletes:", error)
      } finally {
        setLoading(false)
      }
    },
    [supabase, pageSize],
  )

  const loadMore = useCallback(() => {
    if (!loading && hasMore && enableInfiniteScroll) {
      const nextPage = page + 1
      setPage(nextPage)
      loadAthletes(nextPage, true)
    }
  }, [loading, hasMore, page, loadAthletes, enableInfiniteScroll])

  useEffect(() => {
    loadAthletes(0, false)
  }, [loadAthletes])

  const memoizedAthletes = useMemo(() => athletes, [athletes])

  return {
    athletes: memoizedAthletes,
    loading,
    hasMore,
    loadMore,
    refresh: () => {
      setPage(0)
      loadAthletes(0, false)
    },
  }
}
