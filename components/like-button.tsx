"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface LikeButtonProps {
  athleteId: string
  initialLikeCount?: number
  initialLiked?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LikeButton({
  athleteId,
  initialLikeCount = 0,
  initialLiked = false,
  size = "md",
  className = "",
}: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isLoading: authLoading } = useAuth()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const isAuthenticated = !!user

  // Size mappings
  const sizeClasses = {
    sm: "h-8 w-8 p-0",
    md: "h-10 w-10 p-0",
    lg: "h-12 w-12 p-0",
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  // Check if user has liked this athlete
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (user) {
        try {
          const { data: likeData } = await supabase
            .from("likes")
            .select("id")
            .eq("athlete_id", athleteId)
            .eq("user_id", user.id)
            .single()

          setIsLiked(!!likeData)
        } catch (error) {
          // Ignore error if likes table doesn't exist or user hasn't liked
          console.log("Like status check failed:", error)
        }
      }
    }

    if (!authLoading && user) {
      checkLikeStatus()
    }
  }, [supabase, athleteId, user, authLoading])

  // Handle like/unlike
  const handleLike = async () => {
    if (isLoading) return

    // If not authenticated, show login prompt
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like this commitment",
        variant: "default",
      })
      return
    }

    setIsLoading(true)

    try {
      if (!user) {
        toast({
          title: "Authentication error",
          description: "Please sign in to like this commitment",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (isLiked) {
        // Unlike
        const { error } = await supabase.from("likes").delete().eq("athlete_id", athleteId).eq("user_id", user.id)

        if (error) {
          console.error("Supabase unlike error:", error)
          throw error
        }

        setIsLiked(false)
        setLikeCount((prev) => Math.max(prev - 1, 0))
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

        setIsLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (error: any) {
      console.error("Error toggling like:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to update like status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLike}
        disabled={isLoading}
        className={`rounded-full hover:bg-pink-100 ${sizeClasses[size]} ${isLiked ? "text-pink-500" : "text-gray-400 hover:text-pink-500"}`}
        aria-label={isLiked ? "Unlike" : "Like"}
      >
        <Heart
          className={`${iconSizes[size]} ${isLiked ? "fill-current" : ""} transition-all duration-300 ${isLoading ? "animate-pulse" : ""}`}
        />
      </Button>
      {likeCount > 0 && <span className="text-xs font-medium text-gray-500 mt-1">{likeCount}</span>}
    </div>
  )
}
