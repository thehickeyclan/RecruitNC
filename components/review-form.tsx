"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createReview } from "@/app/actions/reviews"

interface ReviewFormProps {
  productId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ReviewForm({
  productId,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (
      rating < 1 ||
      !title.trim() ||
      !content.trim() ||
      !userName.trim() ||
      !userEmail.trim()
    ) {
      setError("Please fill in all fields and select a rating.")
      return
    }
    setLoading(true)
    const result = await createReview({
      productId,
      rating,
      title: title.trim(),
      content: content.trim(),
      userName: userName.trim(),
      userEmail: userEmail.trim(),
    })
    setLoading(false)
    if (result.success) onSuccess()
    else setError(result.error ?? "Failed to submit review.")
  }

  const displayRating = hoverRating || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border rounded-lg p-6 bg-muted/30">
      <h3 className="text-lg font-semibold">Write a Review</h3>

      <div>
        <Label>Rating *</Label>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1"
              aria-label={`${value} stars`}
            >
              <Star
                className={cn(
                  "w-8 h-8 transition-colors",
                  value <= displayRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="reviewer-name">Your name *</Label>
        <Input
          id="reviewer-name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name"
          className="mt-2"
          maxLength={100}
        />
      </div>

      <div>
        <Label htmlFor="reviewer-email">Your email *</Label>
        <Input
          id="reviewer-email"
          type="email"
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="your@email.com"
          className="mt-2"
          maxLength={255}
        />
      </div>

      <div>
        <Label htmlFor="review-title">Review title *</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience"
          className="mt-2"
          maxLength={200}
        />
      </div>

      <div>
        <Label htmlFor="review-content">Your review *</Label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you think of the product?"
          className="mt-2 min-h-[120px]"
          maxLength={2000}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="bg-[#003366] hover:bg-[#003366]/90">
          {loading ? "Submitting…" : "Submit Review"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
