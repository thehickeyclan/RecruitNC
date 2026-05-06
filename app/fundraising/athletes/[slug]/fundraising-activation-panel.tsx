"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { submitFundraisingActivationRequestAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

type LatestActivationStatus = "none" | "pending" | "approved" | "rejected"

type Props = {
  fundraisingSlug: string
  athleteId: string | null
  /** Logged-in user id — signed-out users see a compact sign-in prompt */
  userId: string | null
  playbookAcknowledgedAt: string | null
  latestActivationStatus: LatestActivationStatus
  isFundraisingManager: boolean
  viewerIsRecruitNcAdmin: boolean
}

function StatusDot({ tone }: { tone: "neutral" | "amber" | "emerald" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]"
      : tone === "amber"
        ? "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)] animate-pulse"
        : "bg-white/35"
  return <span className={`inline-flex h-3 w-3 shrink-0 rounded-full ${cls}`} aria-hidden />
}

export function FundraisingActivationPanel({
  fundraisingSlug,
  athleteId,
  userId,
  playbookAcknowledgedAt,
  latestActivationStatus,
  isFundraisingManager,
  viewerIsRecruitNcAdmin,
}: Props) {
  const router = useRouter()
  const [optimisticPending, setOptimisticPending] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (latestActivationStatus === "pending") {
      setOptimisticPending(false)
    }
  }, [latestActivationStatus])

  const pending = !isFundraisingManager && (optimisticPending || latestActivationStatus === "pending")
  const requestApproved = latestActivationStatus === "approved"
  const playbookDone = !!playbookAcknowledgedAt

  const headline = useMemo(() => {
    if (isFundraisingManager) {
      return {
        tone: "emerald" as const,
        label: "Connected",
        text: "You can manage this page from Profile → Fundraise.",
      }
    }
    if (pending) {
      return {
        tone: "amber" as const,
        label: "Waiting on staff",
        text: "Your request is in the queue — NC United will connect your account when reviewed.",
      }
    }
    if (requestApproved) {
      return {
        tone: "emerald" as const,
        label: "Approved",
        text: "Staff approved your request and linked your login to this wrestler. Refresh if needed, then use Profile → Fundraise for donor tools.",
      }
    }
    if (!playbookDone) {
      return {
        tone: "neutral" as const,
        label: "Playbook required",
        text: "Read and acknowledge the fundraising playbook before you can request activation.",
      }
    }
    if (latestActivationStatus === "rejected") {
      return {
        tone: "neutral" as const,
        label: "Previous request declined",
        text: "You can submit a new activation request after reviewing the playbook again if needed.",
      }
    }
    return {
      tone: "neutral" as const,
      label: "Not activated",
      text: "Request NC United staff to link your login so you can use donor tools for this athlete.",
    }
  }, [isFundraisingManager, latestActivationStatus, pending, playbookDone, requestApproved])

  if (viewerIsRecruitNcAdmin) return null

  const borderCls =
    headline.tone === "emerald"
      ? "border-emerald-500/35 bg-emerald-950/30"
      : pending
        ? "border-amber-500/35 bg-amber-950/25"
        : "border-white/12 bg-[#0B2545]/55"

  const submitRequest = async () => {
    if (!userId || !playbookDone || pending || isFundraisingManager || requestApproved) return
    setBusy(true)
    setOptimisticPending(true)
    try {
      const res = await submitFundraisingActivationRequestAction({
        fundraisingSlug,
        athleteId,
      })
      if (!res.ok) {
        setOptimisticPending(false)
        toast({
          title: "Request not sent",
          description: res.error ?? "Try again.",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Request submitted",
        description: "Status shows waiting until staff approves.",
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const playbookHref = "/fundraising/playbook/members#playbook-activation-ack"
  const returnToPath = `/fundraising/athletes/${encodeURIComponent(fundraisingSlug)}`

  if (!userId) {
    return (
      <section className="mt-6 rounded-xl border border-white/12 bg-[#0B2545]/55 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusDot tone="neutral" />
          <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.22em] text-[#C8A94A]">
            Family fundraising access
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/82">
          Sign in after reading the playbook to submit an activation request. Staff reviews requests before donor tools unlock.
        </p>
        <Button asChild className="mt-4 min-h-11 bg-[#C8A94A] font-semibold text-[#061224] hover:bg-[#b89740]">
          <HardLink href={`/auth/signin?returnTo=${encodeURIComponent(returnToPath)}`}>Sign in</HardLink>
        </Button>
      </section>
    )
  }

  const showRequestButton =
    playbookDone && !pending && !isFundraisingManager && !requestApproved

  return (
    <section className={`mt-6 rounded-xl border px-4 py-4 sm:px-5 sm:py-5 ${borderCls}`}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusDot tone={headline.tone === "emerald" ? "emerald" : pending ? "amber" : "neutral"} />
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.22em] text-[#C8A94A]">
          Family fundraising access
        </h2>
        <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
          {headline.label}
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/82">{headline.text}</p>

      {!playbookDone ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button asChild variant="outline" className="border-[#C8A94A]/50 text-[#C8A94A] hover:bg-[#C8A94A]/10">
            <HardLink href={playbookHref}>Open playbook &amp; acknowledge</HardLink>
          </Button>
        </div>
      ) : null}

      {showRequestButton ? (
        <div className="mt-4">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void submitRequest()}
            className="min-h-11 w-full bg-[#C8A94A] font-semibold text-[#061224] hover:bg-[#b89740] sm:w-auto"
          >
            {busy ? "Sending…" : "Request activation"}
          </Button>
        </div>
      ) : null}

      {pending ? (
        <p className="mt-3 text-xs leading-snug text-amber-100/75">
          Indicator stays <strong className="text-amber-200">amber</strong> until staff approves — then it turns{" "}
          <strong className="text-emerald-200">green</strong>.
        </p>
      ) : null}
    </section>
  )
}
