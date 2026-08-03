"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck, X, Check } from "lucide-react"

type Claim = {
  id: string
  clubId: string
  clubName: string
  clubCity: string | null
  userName: string | null
  userEmail: string | null
  claimedRole: string | null
  evidence: string | null
  status: string
  createdAt: string | null
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-200",
  approved: "bg-emerald-500/15 text-emerald-200",
  rejected: "bg-red-500/15 text-red-200",
  revoked: "bg-white/10 text-white/60",
}

/**
 * Review queue for club claims. Approving here is the only thing that grants a coach edit
 * rights, so every row shows the evidence they gave and who they say they are.
 */
export function AdminClubClaims() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/clubs/claims", { credentials: "include", cache: "no-store" })
    const data = await response.json().catch(() => ({}))
    setLoading(false)
    if (data.setupNeeded) {
      setNotice(data.error ?? "Club claims are not enabled yet.")
      setClaims([])
      return
    }
    if (!response.ok) {
      setNotice(data.error ?? "Unable to load claims.")
      return
    }
    setNotice(null)
    setClaims(data.claims ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function decide(claim: Claim, status: "approved" | "rejected" | "revoked") {
    setBusyId(claim.id)
    const response = await fetch("/api/admin/clubs/claims", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: claim.id, status }),
    })
    setBusyId(null)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setNotice(data.error ?? "Could not update that claim.")
      return
    }
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading claims…
      </div>
    )
  }

  if (notice) {
    return (
      <div className="rounded-sm border border-[#D7B968]/40 bg-[#D7B968]/10 p-5 text-[#F5E7BD]">
        <h3 className="font-black text-white">Club claims</h3>
        <p className="mt-1 text-sm leading-6">{notice}</p>
      </div>
    )
  }

  if (!claims.length) {
    return (
      <div className="rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-center text-white/50">
        No claims yet. Coaches can request a club from its card on the public map.
      </div>
    )
  }

  const pending = claims.filter((claim) => claim.status === "pending")

  return (
    <div className="space-y-3">
      {pending.length ? (
        <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {pending.length} {pending.length === 1 ? "claim is" : "claims are"} waiting on you. Approving grants edit
          rights to that club — check the evidence first.
        </div>
      ) : null}

      {claims.map((claim) => (
        <div key={claim.id} className="rounded-sm border border-white/10 bg-[#071427]/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">{claim.clubName}</span>
                {claim.clubCity ? <span className="text-sm text-white/45">{claim.clubCity}</span> : null}
                <Badge className={`rounded-sm ${STATUS_STYLE[claim.status] ?? "bg-white/10 text-white/60"}`}>
                  {claim.status}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-white/70">
                {claim.userName ?? "Unknown"} · {claim.claimedRole ?? "role not given"}
              </div>
              {claim.userEmail ? (
                <a href={`mailto:${claim.userEmail}`} className="text-sm text-[#D7B968] hover:underline">
                  {claim.userEmail}
                </a>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2">
              {claim.status !== "approved" ? (
                <Button
                  size="sm"
                  disabled={busyId === claim.id}
                  onClick={() => void decide(claim, "approved")}
                  className="rounded-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === claim.id}
                  onClick={() => void decide(claim, "revoked")}
                  className="rounded-sm border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  Revoke
                </Button>
              )}
              {claim.status === "pending" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === claim.id}
                  onClick={() => void decide(claim, "rejected")}
                  className="rounded-sm border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
              ) : null}
            </div>
          </div>

          {claim.evidence ? (
            <div className="mt-3 rounded-sm border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                <ShieldCheck className="h-3 w-3" />
                How to check them
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-white/75">{claim.evidence}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
