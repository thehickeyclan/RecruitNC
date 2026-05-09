"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Wallet } from "lucide-react"
import { submitFundraisingActivationRequestAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { HardLink } from "@/components/hard-link"
import { toast } from "@/hooks/use-toast"

type LatestActivationStatus = "none" | "pending" | "approved" | "rejected"

type Props = {
  fundraisingSlug: string
  athleteId: string | null
  userId: string | null
  latestActivationStatus: LatestActivationStatus
  isFundraisingManager: boolean
  viewerIsRecruitNcAdmin: boolean
}

/** Traffic-light control — terminology matches the fundraising playbook (“digital wallet”). */
export function FundraisingActivationPanel({
  fundraisingSlug,
  athleteId,
  userId,
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
  /** Staff approved link but client profile row not refreshed yet — yellow until refresh unlocks tools. */
  const approvedAwaitingRefresh = requestApproved && !isFundraisingManager && !pending

  if (viewerIsRecruitNcAdmin) return null

  const returnToPath = `/fundraising/athletes/${encodeURIComponent(fundraisingSlug)}`
  const signInHref = `/auth/signin?returnTo=${encodeURIComponent(returnToPath)}`

  const submitRequest = async () => {
    if (!userId || pending || isFundraisingManager || requestApproved) return
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
        description: "Staff will review and connect your account.",
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const btnBase =
    "relative flex min-h-12 w-full max-w-md items-center justify-center gap-2.5 rounded-xl border px-4 py-3 font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-[0.12em] shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"

  // —— Signed out: red → sign in ——
  if (!userId) {
    return (
      <section className="mt-6" aria-label="Family fundraising access">
        <HardLink
          href={signInHref}
          className={`${btnBase} border-red-600/55 bg-[#7f1d1d] text-white hover:bg-[#991b1b] focus-visible:outline-red-300`}
          aria-describedby="wallet-connect-hint-signed-out"
        >
          <span className="absolute left-3 flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]" aria-hidden />
          <Wallet className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
          <span>Connect digital wallet</span>
        </HardLink>
        <p id="wallet-connect-hint-signed-out" className="sr-only">
          Sign in to your RecruitNC account to request access to family fundraising and donor tools for this athlete.
        </p>
      </section>
    )
  }

  // —— Green: donor tools connected ——
  if (isFundraisingManager) {
    return (
      <section className="mt-6" aria-label="Digital wallet">
        <HardLink
          href="/profile"
          className={`${btnBase} border-emerald-500/45 bg-[#064e3b] text-emerald-50 hover:bg-[#065f46] focus-visible:outline-emerald-300`}
        >
          <span className="absolute left-3 flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]" aria-hidden />
          <Wallet className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
          <span>Connected</span>
        </HardLink>
      </section>
    )
  }

  // —— Yellow: waiting on staff ——
  if (pending) {
    return (
      <section className="mt-6" aria-label="Digital wallet">
        <button
          type="button"
          disabled
          className={`${btnBase} cursor-not-allowed border-amber-600/50 bg-[#78350f] text-amber-100 opacity-95`}
          aria-label="Requested, awaiting staff"
        >
          <span className="absolute left-3 flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.65)]" aria-hidden />
          <Wallet className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
          <span>Requested</span>
        </button>
      </section>
    )
  }

  // —— Yellow: approved, refresh to pick up parent link ——
  if (approvedAwaitingRefresh) {
    return (
      <section className="mt-6" aria-label="Digital wallet">
        <button
          type="button"
          className={`${btnBase} border-amber-500/45 bg-[#713f12] text-amber-50 hover:bg-[#854d0e]`}
          onClick={() => router.refresh()}
        >
          <span className="absolute left-3 flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)]" aria-hidden />
          <Wallet className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
          <span>Refresh to activate</span>
        </button>
      </section>
    )
  }

  // —— Red: can submit request (includes declined prior request) ——
  const canSubmit = !pending && !requestApproved

  return (
    <section className="mt-6" aria-label="Digital wallet">
      <button
        type="button"
        disabled={busy || !canSubmit}
        className={`${btnBase} border-red-600/55 bg-[#7f1d1d] text-white hover:bg-[#991b1b] disabled:pointer-events-none disabled:opacity-50`}
        onClick={() => void submitRequest()}
      >
        <span className="absolute left-3 flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]" aria-hidden />
        <Wallet className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
        <span>{busy ? "Sending…" : "Connect digital wallet"}</span>
      </button>
    </section>
  )
}
