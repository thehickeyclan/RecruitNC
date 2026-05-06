"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { reviewFundraisingActivationRequestAdminAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

export function ActivationRequestReviewButtons({
  requestId,
  fundraisingSlug,
}: {
  requestId: string
  fundraisingSlug: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)

  const run = async (next: "approved" | "rejected") => {
    setBusy(next === "approved" ? "approve" : "reject")
    try {
      const res = await reviewFundraisingActivationRequestAdminAction(requestId, next)
      if (!res.ok) {
        toast({
          title: "Update failed",
          description: res.error ?? "Try again.",
          variant: "destructive",
        })
        return
      }
      toast({
        title: next === "approved" ? "Approved" : "Rejected",
        description: `${fundraisingSlug} · request updated.`,
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        className="bg-emerald-600 text-white hover:bg-emerald-700"
        disabled={busy !== null}
        onClick={() => void run("approved")}
      >
        {busy === "approve" ? "Saving…" : "Approve"}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("rejected")}>
        {busy === "reject" ? "Saving…" : "Reject"}
      </Button>
    </div>
  )
}
