"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type Props = {
  athleteId: string
  athleteName?: string
  initiallyVerified?: boolean
  className?: string
  buttonLabel?: string
}

export default function ConfirmProfileButton({
  athleteId,
  athleteName,
  initiallyVerified = false,
  className,
  buttonLabel,
}: Props) {
  const [verified, setVerified] = useState<boolean>(initiallyVerified)
  const [loading, setLoading] = useState<boolean>(false)
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  async function onConfirm() {
    if (verified || loading) return
    setLoading(true)
    try {
      // New, explicit endpoint with the athlete ID in the route
      const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })

      if (res.status === 401) {
        // Not signed in — redirect to sign-in and return back to this profile
        const returnTo = encodeURIComponent(pathname || `/athletes/${athleteId}`)
        router.push(`/auth/signin?returnTo=${returnTo}`)
        return
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          data?.details?.updateError ||
          data?.details?.logError ||
          "Could not confirm the profile. Please try again."
        toast({ title: "Confirmation failed", description: String(msg), variant: "destructive" })
        return
      }

      setVerified(true)
      toast({
        title: "Profile confirmed",
        description: athleteName
          ? `Thanks! ${athleteName}'s profile is now marked as verified.`
          : "Thanks! This profile is now marked as verified.",
      })
      // Refresh to update any server-rendered status on the page
      router.refresh()
    } catch (e: any) {
      toast({
        title: "Network error",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (verified) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
        <Badge variant="default" className="bg-green-100 text-green-800">
          Verified
        </Badge>
      </div>
    )
  }

  // Neutral style (no green). Uses your shadcn Button.
  return (
    <Button
      onClick={onConfirm}
      disabled={loading}
      className={cn("bg-green-600 hover:bg-green-700 text-white", className)}
      aria-busy={loading}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Confirming…
        </span>
      ) : (
        (buttonLabel ?? "Good to Go")
      )}
    </Button>
  )
}
