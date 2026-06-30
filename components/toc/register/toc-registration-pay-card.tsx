"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { TocAthleteWithInvitation } from "@/lib/toc/invitation-service"
import {
  formatTocRegistrationFee,
  registrationPaymentDueDisplay,
  TOC_REGISTRATION_FEE_COVERS,
} from "@/lib/toc/registration-policy"

type Props = {
  data: TocAthleteWithInvitation
  onReset: () => void
}

export function TocRegistrationPayCard({ data, onReset }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invitation = data.invitation
  const isConfirmed = invitation?.status === "confirmed"
  const isPaid = invitation?.paymentStatus === "paid"

  const startCheckout = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/toc/register/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: data.athlete.id }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload.error || "Could not start checkout")
      }
      if (!payload.checkoutUrl) {
        throw new Error("Checkout URL missing")
      }
      window.location.href = payload.checkoutUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed")
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-sm border border-[#0B1D3A]/10 bg-[#f8f9fb] p-5 sm:p-6 space-y-5">
      <div className="flex gap-4 items-start">
        {data.athlete.photoUrl ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-white ring-1 ring-black/5">
            <Image src={data.athlete.photoUrl} alt="" fill className="object-cover" sizes="64px" unoptimized />
          </div>
        ) : null}
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[#0B1D3A]/50 font-semibold">Registration payment</p>
          <h2 className="text-xl font-semibold text-[#0B1D3A]">{data.athlete.name}</h2>
          <p className="text-sm text-[#0B1D3A]/65 mt-1">
            {[data.athlete.school, invitation?.weightClass ? `${invitation.weightClass} lbs` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {!invitation ? (
        <p className="text-sm text-red-600">
          No invitation on file. Confirm your spot first using the link in your invite email.
        </p>
      ) : null}

      {invitation && !isConfirmed ? (
        <p className="text-sm text-red-600">
          Your spot is not confirmed yet. Complete confirmation first, then return here to pay.
        </p>
      ) : null}

      {isConfirmed && !isPaid ? (
        <>
          <div className="border-l-4 border-[#CC0000] pl-4 space-y-2 text-sm text-[#0B1D3A]/80">
            <p>
              <strong>{formatTocRegistrationFee()}</strong> registration due by{" "}
              <strong>{registrationPaymentDueDisplay()}</strong>.
            </p>
            <p>
              Covers tournament entry, {TOC_REGISTRATION_FEE_COVERS}. Secure checkout via Stripe — tagged{" "}
              <strong>TOC Reg</strong> for NC United accounting.
            </p>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              className="bg-[#CC0000] hover:bg-[#a80000] text-white"
              disabled={submitting}
              onClick={() => void startCheckout()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pay {formatTocRegistrationFee()} — secure checkout
            </Button>
            <Button type="button" variant="outline" disabled={submitting} onClick={onReset}>
              Search another athlete
            </Button>
          </div>
        </>
      ) : null}

      {isPaid ? (
        <p className="text-sm text-green-700 font-medium">
          Registration is paid. You&apos;re all set for bracket entry.
        </p>
      ) : null}
    </div>
  )
}
