"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number | null // 1-5 or null for unrated
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
}

export function StarRating({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = "md",
  showLabel = false 
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5]
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  const handleClick = (star: number) => {
    if (!readonly && onRatingChange) {
      // If clicking the same rating, unrate (set to null)
      onRatingChange(rating === star ? 0 : star)
    }
  }

  const getRatingLabel = (rating: number | null): string => {
    if (!rating || rating === 0) return "Not Rated"
    switch (rating) {
      case 5: return "Dream Recruit"
      case 4: return "Excellent Fit"
      case 3: return "Solid Prospect"
      case 2: return "Backup Option"
      case 1: return "Low Priority"
      default: return "Not Rated"
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {stars.map((star) => {
          const isFilled = rating !== null && rating >= star
          
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              disabled={readonly}
              className={cn(
                "transition-all",
                readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
                !readonly && "active:scale-95"
              )}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-colors",
                  isFilled
                    ? "fill-[#FFD700] text-[#FFD700]" // Gold for filled
                    : "fill-none text-gray-300", // Gray outline for empty
                  !readonly && "hover:text-[#FFD700]"
                )}
              />
            </button>
          )
        })}
      </div>
      {showLabel && (
        <span className="text-sm text-gray-600 ml-2">
          {getRatingLabel(rating)}
        </span>
      )}
    </div>
  )
}
