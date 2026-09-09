"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * The seeding a weight would take from The NC Mat, and the two buttons that decide it.
 *
 * The tournament is seeded by scoped staff whose order lives in their own account, invisible to
 * everyone else — a finished ten-weight seeding once sat that way while the board showed
 * something different. This is where an admin reads it, takes it, and freezes it.
 *
 * Adopting is explicit rather than continuous on purpose: wrestlers keep dropping right up to the
 * first whistle, so the seeder keeps working, and each of those changes should be something staff
 * take deliberately rather than something that moves a published bracket unattended.
 */

type AdoptionRow = {
  invitationId: string
  athleteName: string
  seed: number
  officialSeed: number | null
  moved: boolean
}

type Seeder = {
  userId: string
  email: string | null
  isLead: boolean
  rows: AdoptionRow[]
  changed: number
  blocked: string | null
}

type SeedingState = {
  weightClass: number
  submission: {
    submitted: boolean
    submittedAt: string | null
    readyToSubmit: boolean
    adoptedFrom: string | null
    adoptedAt: string | null
  }
  confirmed: number
  seeders: Seeder[]
}

export function TocSeedAdoptionPanel({
  weightClass,
  onAdopted,
}: {
  weightClass: number
  /** Refresh the board — adopting rewrites the seeds this card is drawn from. */
  onAdopted: () => void | Promise<void>
}) {
  const [state, setState] = useState<SeedingState | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/toc/field/seeding?weightClass=${weightClass}`, { cache: "no-store" })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? "Could not read the seeding.")
        return
      }
      setError(null)
      setState(body as SeedingState)
    } catch {
      setError("Could not read the seeding.")
    }
  }, [weightClass])

  useEffect(() => {
    void load()
  }, [load])

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      try {
        const res = await fetch("/api/admin/toc/field/seeding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, weightClass }),
        })
        const result = await res.json()
        if (!res.ok) {
          setError(result.error ?? "That did not work.")
          return
        }
        setError(null)
        await load()
        await onAdopted()
      } catch {
        setError("That did not work.")
      } finally {
        setBusy(false)
      }
    },
    [weightClass, load, onAdopted],
  )

  if (error && !state) {
    return <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-[11px] text-red-200">{error}</p>
  }
  if (!state) return null

  const locked = state.submission.submitted
  // Nobody has seeded this weight yet: say nothing rather than show an empty panel.
  if (!state.seeders.length && !locked && !state.submission.adoptedAt) return null

  return (
    <div
      className={`rounded-lg border p-3 ${
        locked ? "border-emerald-400/35 bg-emerald-400/10" : "border-[#D7B95A]/30 bg-[#D7B95A]/[0.07]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={locked ? "bg-emerald-500 text-[#04150d] hover:bg-emerald-500" : "bg-[#D7B95A] text-[#0B1D3A] hover:bg-[#D7B95A]"}>
          {locked ? "Submitted to brackets" : "Seeding"}
        </Badge>
        <span className="text-[11px] text-white/60">
          {state.submission.adoptedAt
            ? `Adopted ${new Date(state.submission.adoptedAt).toLocaleDateString()}`
            : "Never adopted"}
        </span>
      </div>
      {/*
        There is no lock here on purpose. Locking the draw below is the submit, and a second
        switch for one decision is a pair that eventually disagrees.
      */}
      {locked ? (
        <p className="mt-2 text-[11px] text-white/50">
          Seeds are fixed while this weight is submitted. Unlock the draw below to change them.
        </p>
      ) : null}

      {error ? <p className="mt-2 text-[11px] text-red-200">{error}</p> : null}

      {state.seeders.map((seeder) => (
        <div key={seeder.userId} className={`mt-3 border-t border-white/10 pt-2 ${seeder.isLead ? "" : "opacity-70"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-white/80">
              {seeder.isLead ? (
                <Badge className="mr-2 bg-[#D7B95A] text-[10px] text-[#0B1D3A] hover:bg-[#D7B95A]">Lead</Badge>
              ) : null}
              {seeder.email ?? "A seeder"}
              {seeder.blocked ? null : (
                <span className="ml-2 font-normal text-white/45">
                  {seeder.changed === 0
                    ? "matches the official order"
                    : `${seeder.changed} of ${seeder.rows.length} would move`}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {seeder.rows.length ? (
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  className="h-auto p-0 text-[11px] text-[#D7B95A]"
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? "Hide" : "Show"} their order
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={busy || locked || Boolean(seeder.blocked) || seeder.changed === 0}
                variant={seeder.isLead ? "default" : "outline"}
                className={
                  seeder.isLead
                    ? "h-7 bg-[#D7B95A] text-[11px] font-bold text-[#0B1D3A] hover:bg-[#c9ab4f]"
                    : "h-7 border-white/20 bg-transparent text-[11px] text-white hover:bg-white/10"
                }
                onClick={() => void act({ action: "adopt", sourceUserId: seeder.userId })}
              >
                {locked ? "Submitted" : seeder.changed === 0 ? "Already adopted" : "Adopt this seeding"}
              </Button>
            </div>
          </div>

          {seeder.blocked ? (
            <p className="mt-1 text-[11px] text-amber-200">{seeder.blocked}</p>
          ) : open ? (
            <ol className="mt-2 space-y-0.5">
              {seeder.rows.map((row) => (
                <li key={row.invitationId} className="text-[11px] text-white/70">
                  <span className="inline-block w-5 text-white/40">{row.seed}.</span>
                  {row.athleteName}
                  {row.moved ? (
                    <span className="ml-2 text-amber-200">
                      {row.officialSeed == null ? "(unseeded)" : `(official #${row.officialSeed})`}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ))}
    </div>
  )
}
