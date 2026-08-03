"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react"

/**
 * Lets a coach or owner ask for control of their club listing.
 *
 * Submitting only ever creates a pending request — an admin approves it by hand, so the
 * copy here promises a review rather than access.
 */
export function ClubClaimButton({ clubId, clubName }: { clubId: string; clubName: string }) {
  const [claims, setClaims] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState("")
  const [evidence, setEvidence] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/clubs/claims", { credentials: "include", cache: "no-store" })
      .then((response) => {
        if (active) setSignedIn(response.ok)
        return response.json()
      })
      .then((data: { claims?: Array<{ clubId: string; status: string }> }) => {
        if (!active) return
        const map: Record<string, string> = {}
        for (const claim of data.claims ?? []) map[claim.clubId] = claim.status
        setClaims(map)
      })
      .catch(() => {
        if (active) setSignedIn(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Reset when the visitor moves to a different club.
  useEffect(() => {
    setOpen(false)
    setSent(false)
    setError(null)
    setRole("")
    setEvidence("")
  }, [clubId])

  const status = sent ? "pending" : claims[clubId]

  if (status === "approved") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
        <span className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" />
          You manage this club
        </span>
        <Button asChild size="sm" className="rounded-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400">
          <Link href="/clubs/manage">Edit details</Link>
        </Button>
      </div>
    )
  }

  if (status === "pending") {
    return (
      <div className="rounded-sm border border-[#d7b968]/25 bg-[#d7b968]/10 p-3 text-sm text-[#f5e7bd]">
        Claim sent — we&apos;ll review it and be in touch. Listings stay as they are until it&apos;s approved.
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <span className="inline-flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#d7b968]" />
          Coach or owner at {clubName}? Claim this listing.
        </span>
      </button>
    )
  }

  if (signedIn === false) {
    return (
      <div className="rounded-sm border border-white/15 bg-white/5 p-4 text-sm text-white/70">
        <p className="font-bold text-white">Sign in to claim this club</p>
        <p className="mt-1">A free RecruitNC account tells us who is asking so we can check it.</p>
        <div className="mt-3 flex gap-2">
          <Button asChild size="sm" className="rounded-sm bg-[#cc0000] text-white hover:bg-[#a80000]">
            <Link href="/auth/signin?returnTo=/clubs">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-sm border-white/20 bg-transparent text-white hover:bg-white/10">
            <Link href="/auth/signup?returnTo=/clubs">Create account</Link>
          </Button>
        </div>
      </div>
    )
  }

  async function submit() {
    setPending(true)
    setError(null)
    const response = await fetch("/api/clubs/claims", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, claimedRole: role, evidence }),
    })
    const data = await response.json().catch(() => ({}))
    setPending(false)
    if (!response.ok) {
      setError(data.error ?? "Could not send that request.")
      return
    }
    setSent(true)
  }

  return (
    <div className="space-y-3 rounded-sm border border-white/15 bg-white/5 p-4">
      <div>
        <p className="font-bold text-white">Claim {clubName}</p>
        <p className="mt-1 text-xs leading-5 text-white/55">
          We check every claim by hand before granting access. Nothing changes on the listing until then.
        </p>
      </div>

      <div>
        <label htmlFor="claim-role" className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
          Your role
        </label>
        <Input
          id="claim-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          placeholder="Head coach, club owner, team manager…"
          className="mt-1 rounded-sm border-white/15 bg-[#020b18] text-white placeholder:text-white/30"
        />
      </div>

      <div>
        <label htmlFor="claim-evidence" className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
          How can we check?
        </label>
        <Textarea
          id="claim-evidence"
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          rows={3}
          placeholder="A club email address, a page that lists you as coach, or a number we can call."
          className="mt-1 rounded-sm border-white/15 bg-[#020b18] text-white placeholder:text-white/30"
        />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex gap-2">
        <Button onClick={() => void submit()} disabled={pending} className="rounded-sm bg-[#cc0000] text-white hover:bg-[#a80000]">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send claim
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm border-white/20 bg-transparent text-white hover:bg-white/10">
          Cancel
        </Button>
      </div>
    </div>
  )
}
