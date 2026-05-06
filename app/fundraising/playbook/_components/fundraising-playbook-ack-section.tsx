"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { acknowledgeFundraisingPlaybookAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { HardLink } from "@/components/hard-link"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

type Props = {
  /** ISO timestamp when already acknowledged (server-fetched). */
  initialAcknowledgedAt: string | null
  userSignedIn: boolean
  /** Optional anchor id for skip links */
  id?: string
}

export function FundraisingPlaybookAckSection({ initialAcknowledgedAt, userSignedIn, id }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState(initialAcknowledgedAt)

  useEffect(() => {
    setAcknowledgedAt(initialAcknowledgedAt)
  }, [initialAcknowledgedAt])

  const handleAcknowledge = async () => {
    if (!confirmed) {
      toast({
        title: "Confirm first",
        description: "Check the box to confirm you’ve read the playbook on this page.",
      })
      return
    }
    setBusy(true)
    try {
      const res = await acknowledgeFundraisingPlaybookAction()
      if (!res.ok) {
        toast({
          title: "Could not save",
          description: res.error ?? "Try again.",
          variant: "destructive",
        })
        return
      }
      const ts = new Date().toISOString()
      setAcknowledgedAt(ts)
      toast({
        title: "Recorded",
        description: "You can request fundraising activation on athlete pages.",
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!userSignedIn) {
    const returnTo = "/fundraising/playbook/members"
    return (
      <section
        id={id}
        className="mx-auto mt-16 max-w-3xl rounded-xl border border-white/15 bg-[#0B2545]/55 px-4 py-5 sm:px-6"
      >
        <p className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Activation gate
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Sign in to record that you&apos;ve read this playbook. That acknowledgment is required before you can submit an
          activation request on an athlete fundraising page.
        </p>
        <Button asChild className="mt-4 bg-[#C8A94A] text-[#061224] hover:bg-[#b89740]">
          <HardLink href={`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`}>Sign in</HardLink>
        </Button>
      </section>
    )
  }

  if (acknowledgedAt) {
    return (
      <section
        id={id}
        className="mx-auto mt-16 max-w-3xl rounded-xl border border-emerald-500/35 bg-emerald-950/35 px-4 py-5 sm:px-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]" />
          <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-emerald-200/95">
            Playbook acknowledged
          </p>
        </div>
        <p className="mt-2 text-sm text-white/75">
          Recorded{" "}
          {new Date(acknowledgedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          . You may request activation on athlete pages when you&apos;re ready.
        </p>
      </section>
    )
  }

  return (
    <section
      id={id}
      className="mx-auto mt-16 max-w-3xl rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-5 sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]" />
        <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-amber-100/95">
          Finish to unlock activation
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/82">
        Scroll through the playbook above, then confirm below. NC United uses this so families see the 501(c)(3) model and Venmo
        alternatives before requesting staff to wire{" "}
        <strong className="text-white/95">Profile → Fundraise</strong> access.
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm leading-snug text-white/88">
        <Checkbox
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          className="mt-0.5 border-white/35 data-[state=checked]:border-[#C8A94A] data-[state=checked]:bg-[#C8A94A]"
        />
        <span>
          I have read the playbook on this page and understand that{" "}
          <strong className="text-white/95">tax-deductible NC United checkout</strong> is the supported path for gifts credited to
          athletes—not informal apps as the primary system.
        </span>
      </label>
      <Button
        type="button"
        disabled={busy || !confirmed}
        onClick={() => void handleAcknowledge()}
        className="mt-4 min-h-11 w-full bg-[#C8A94A] font-semibold text-[#061224] hover:bg-[#b89740] sm:w-auto"
      >
        {busy ? "Saving…" : "Record acknowledgment"}
      </Button>
    </section>
  )
}
