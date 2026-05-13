"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { submitFundraisingActivationRequestAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { useToast } from "@/hooks/use-toast"

type Props = {
  fundraisingSlug: string
  athleteId: string | null
}

export function FundraisingActivationRequestButton({ fundraisingSlug, athleteId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await submitFundraisingActivationRequestAction({
            fundraisingSlug: fundraisingSlug.trim().toLowerCase(),
            athleteId,
          })
          if (res.ok) {
            toast({
              title: "Request sent",
              description: "NC United will review using your signed-in email, then link your account if we approve.",
            })
            router.refresh()
            return
          }
          toast({
            title: "Could not submit",
            description: res.error ?? "Try again or contact info@ncwrestlingunited.com.",
            variant: "destructive",
          })
        })
      }}
      className="mt-3 w-full touch-manipulation rounded-md bg-white/12 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white ring-1 ring-white/25 hover:bg-white/16 disabled:opacity-50 sm:w-auto"
    >
      {isPending ? "Sending…" : "Request activation"}
    </button>
  )
}
