"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/contexts/auth-context"

export function useLikes() {
  const [likedAthleteIds, setLikedAthleteIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, loading: authLoading } = useAuth()
  const supabase = createClientComponentClient()
  const isAuthenticated = !!user

  // Fetch user's liked athletes
  const fetchLikedAthletes = useCallback(async () => {
    setIsLoading(true)

    try {
      if (!user) {
        setLikedAthleteIds([])
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase.from("likes").select("athlete_id").eq("user_id", user.id)

      if (error) throw error

      setLikedAthleteIds(data.map((like) => like.athlete_id))
    } catch (error) {
      console.error("Error fetching liked athletes:", error)
      setLikedAthleteIds([])
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user])

  // Toggle like status for an athlete
  const toggleLike = useCallback(
    async (athleteId: string) => {
      if (!isAuthenticated || !user) return false

      try {
        const isLiked = likedAthleteIds.includes(athleteId)

        if (isLiked) {
          // Unlike
          const { error } = await supabase.from("likes").delete().eq("athlete_id", athleteId).eq("user_id", user.id)

          if (error) {
            console.error("Supabase unlike error:", error)
            throw error
          }

          setLikedAthleteIds((prev) => prev.filter((id) => id !== athleteId))
        } else {
          // Like
          const { error } = await supabase.from("likes").insert({
            athlete_id: athleteId,
            user_id: user.id,
            created_at: new Date().toISOString(),
          })

          if (error) {
            console.error("Supabase like error:", error)
            throw error
          }

          setLikedAthleteIds((prev) => [...prev, athleteId])
        }

        return true
      } catch (error) {
        console.error("Error toggling like:", error)
        return false
      }
    },
    [supabase, likedAthleteIds, isAuthenticated, user],
  )

  // Check if an athlete is liked
  const isLiked = useCallback(
    (athleteId: string) => {
      return likedAthleteIds.includes(athleteId)
    },
    [likedAthleteIds],
  )

  // Initialize on mount
  useEffect(() => {
    if (!authLoading) {
      fetchLikedAthletes()
    }
  }, [fetchLikedAthletes, authLoading])

  return {
    likedAthleteIds,
    isLoading,
    isAuthenticated,
    toggleLike,
    isLiked,
    refreshLikes: fetchLikedAthletes,
  }
}
