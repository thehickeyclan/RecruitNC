"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { submitFundraisingActivationRequestAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { useToast } from "@/hooks/use-toast"

type Props = {
  fundraisingSlug: string
  athleteId: string | null
  variant?: "card" | "inlineLink"
  label?: string
}

export function FundraisingActivationRequestButton({
  fundraisingSlug,
  athleteId,
  variant = "card",
  label,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const cardClass =
    "mt-3 w-full touch-manipulation rounded-md bg-white/12 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white ring-1 ring-white/25 hover:bg-white/16 disabled:opacity-50 sm:w-auto"
  const inlineClass =
    "inline touch-manipulation rounded-none border-0 bg-transparent p-0 text-sm font-semibold text-[#C8A94A] underline underline-offset-2 hover:text-[#d4b55c] disabled:opacity-50"

  const defaultLabel = variant === "inlineLink" ? "Request activation →" : "Request activation"
  const buttonLabel = label ?? defaultLabel

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
      className={variant === "inlineLink" ? inlineClass : cardClass}
    >
      {isPending ? "Sending…" : buttonLabel}
    </button>
  )
}
