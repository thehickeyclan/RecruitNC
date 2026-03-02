"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createReview(formData: {
  productId: string
  rating: number
  title: string
  content: string
  userName: string
  userEmail: string
}) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("product_reviews").insert({
      product_id: formData.productId,
      user_id: user?.id ?? null,
      user_name: formData.userName,
      user_email: formData.userEmail,
      rating: formData.rating,
      title: formData.title,
      content: formData.content,
      verified_purchase: false,
    })

    if (error) {
      console.error("[reviews] Error creating review:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/store/product/${formData.productId}`)
    return { success: true }
  } catch (err) {
    console.error("[reviews] Error creating review:", err)
    return { success: false, error: "Failed to create review" }
  }
}

export async function getProductReviews(productId: string) {
  try {
    const supabase = await createClient()

    const { data: reviews, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[reviews] Error fetching reviews:", error)
      return { reviews: [], averageRating: 0, totalReviews: 0 }
    }

    const list = reviews ?? []
    const totalReviews = list.length
    const sum = list.reduce(
      (acc, r) => acc + (Number((r as { rating?: number }).rating) || 0),
      0
    )
    const averageRating = totalReviews > 0 ? sum / totalReviews : 0

    return {
      reviews: list,
      averageRating,
      totalReviews,
    }
  } catch (err) {
    console.error("[reviews] Error fetching reviews:", err)
    return { reviews: [], averageRating: 0, totalReviews: 0 }
  }
}

export async function markReviewHelpful(
  reviewId: number
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc("increment_review_helpful", {
      review_id: reviewId,
    })

    if (!error) return { success: true }

    const { data: row } = await supabase
      .from("product_reviews")
      .select("helpful_count")
      .eq("id", reviewId)
      .single()

    const current = Number(
      (row as { helpful_count?: number } | null)?.helpful_count ?? 0
    )
    const { error: updateError } = await supabase
      .from("product_reviews")
      .update({ helpful_count: current + 1 })
      .eq("id", reviewId)

    return { success: !updateError }
  } catch (err) {
    console.error("[reviews] Error marking review helpful:", err)
    return { success: false }
  }
}
