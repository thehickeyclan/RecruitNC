"use client"

import { useState } from "react"
import { Star, ThumbsUp, Flag, BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ReviewForm } from "@/components/review-form"
import { markReviewHelpful } from "@/app/actions/reviews"

interface Review {
  id: number
  user_name: string
  rating: number
  title: string
  content: string
  verified_purchase: boolean
  helpful_count: number
  created_at: string
}

interface CustomerReviewsProps {
  reviews: Array<{
    id?: string | number
    reviewer_name?: string | null
    user_name?: string | null
    rating?: number
    title?: string | null
    body?: string | null
    content?: string | null
    verified_purchase?: boolean
    helpful_count?: number
    created_at?: string
  }>
  averageRating: number
  productId: string
}

function normalizeReview(r: CustomerReviewsProps["reviews"][0], index: number): Review {
  const id = typeof r?.id === "number" ? r.id : typeof r?.id === "string" ? parseInt(r.id, 10) || index : index
  return {
    id,
    user_name: (r?.user_name ?? r?.reviewer_name ?? "Anonymous").toString(),
    rating: Math.min(5, Math.max(0, Number(r?.rating) || 0)),
    title: (r?.title ?? "").toString() || "Review",
    content: (r?.content ?? r?.body ?? "").toString(),
    verified_purchase: Boolean(r?.verified_purchase),
    helpful_count: Number(r?.helpful_count) || 0,
    created_at: (r?.created_at ?? new Date().toISOString()).toString(),
  }
}

export function CustomerReviews({
  reviews: rawReviews,
  averageRating,
  productId,
}: CustomerReviewsProps) {
  const [sortBy, setSortBy] = useState("helpful")
  const [helpfulClicks, setHelpfulClicks] = useState<Record<number, boolean>>({})
  const [showReviewForm, setShowReviewForm] = useState(false)

  const reviews = (rawReviews ?? []).map(normalizeReview)

  const handleHelpfulClick = async (reviewId: number) => {
    const result = await markReviewHelpful(reviewId)
    if (result.success) {
      setHelpfulClicks((prev) => ({ ...prev, [reviewId]: true }))
    }
  }

  const renderStars = (rating: number) => {
    const r = Math.min(5, Math.max(0, Math.floor(rating)))
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-4 h-4",
          i < r ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
      />
    ))
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case "highest":
        return b.rating - a.rating
      case "lowest":
        return a.rating - b.rating
      case "helpful":
      default:
        return b.helpful_count - a.helpful_count
    }
  })

  return (
    <div className="border-t pt-8 mb-12" id="reviews">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-[#003366]">
            Customer Reviews
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {renderStars(Math.floor(averageRating))}
            </div>
            <span className="text-lg font-semibold">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">
              ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="helpful">Most Helpful</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest">Highest Rated</SelectItem>
              <SelectItem value="lowest">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            {showReviewForm ? "Cancel" : "Write a Review"}
          </Button>
        </div>
      </div>

      {showReviewForm && (
        <div className="mb-8">
          <ReviewForm
            productId={productId}
            onSuccess={() => setShowReviewForm(false)}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      <div className="space-y-6">
        {sortedReviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">No reviews yet</p>
            <p>Be the first to review this product!</p>
          </div>
        ) : (
          sortedReviews.map((review) => (
            <div
              key={review.id}
              className="border rounded-lg p-6 space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {review.user_name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{review.user_name}</span>
                    {review.verified_purchase && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <BadgeCheck className="w-4 h-4" />
                        <span>Verified Purchase</span>
                      </div>
                    )}
                    <span className="text-muted-foreground text-sm">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>

                  <h3 className="font-semibold text-lg">{review.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {review.content}
                  </p>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ThumbsUp className="w-4 h-4" />
                      <span>
                        {review.helpful_count +
                          (helpfulClicks[review.id] ? 1 : 0)}{" "}
                        people found this helpful
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHelpfulClick(review.id)}
                      disabled={helpfulClicks[review.id]}
                    >
                      {helpfulClicks[review.id]
                        ? "Marked Helpful"
                        : "Helpful"}
                    </Button>
                    <Button variant="ghost" size="sm" type="button">
                      <Flag className="w-4 h-4 mr-1" />
                      Report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
