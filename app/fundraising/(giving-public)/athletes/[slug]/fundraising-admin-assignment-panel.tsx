"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { HardLink } from "@/components/hard-link"
import { AttachAthleteToProfileDialog } from "@/components/fundraising-wiring/attach-athlete-to-profile-dialog"
import {
  LinkParentToAthleteDialog,
  type FundraisingParentLinkPayload,
} from "@/components/fundraising-wiring/link-parent-to-athlete-dialog"
import { fundraisingCodeFromSlug } from "@/lib/fundraising/athlete-fundraising-slug"
import type { FundraisingWiringAdminSnapshot } from "@/lib/fundraising/fundraising-wiring-status"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const NCU_PRIMARY_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

type ActivationWireStatus = "none" | "pending" | "approved" | "rejected"

type WiringChipTone = "good" | "pending" | "bad"

function wiringChipTone(connected: boolean, activationPending: boolean): WiringChipTone {
  if (connected) return "good"
  if (activationPending) return "pending"
  return "bad"
}

const CHIP_TONE_CLASS: Record<WiringChipTone, string> = {
  good: "border-emerald-500/55 bg-emerald-950/45 text-emerald-50",
  pending: "border-amber-500/55 bg-amber-950/40 text-amber-50",
  bad: "border-red-500/50 bg-red-950/35 text-red-50",
}

type Props = {
  fundraisingSlug: string
  profileId: string | null
  athleteId: string | null
  athleteDisplayLabel: string
  ncuHint: string | null
  /** Server snapshot — parent links for gift-page managers (see Attach parent). */
  wiringSnapshot: FundraisingWiringAdminSnapshot | null
  /** Latest family activation request — drives yellow “pending” on status chips. */
  latestActivationStatus: ActivationWireStatus
}

export function FundraisingAdminAssignmentPanel({
  fundraisingSlug,
  profileId,
  athleteId,
  athleteDisplayLabel,
  ncuHint,
  wiringSnapshot,
  latestActivationStatus,
}: Props) {
  const router = useRouter()
  const [attachProfile, setAttachProfile] = useState<{
    id: string
    slug: string
    athlete_id: string
    athlete_name: string | null
  } | null>(null)
  const [parentPayload, setParentPayload] = useState<FundraisingParentLinkPayload | null>(null)
  const [createProfileBusy, setCreateProfileBusy] = useState(false)

  const primaryNcuCode = useMemo(() => {
    const hint = ncuHint?.trim() ?? ""
    if (hint && NCU_PRIMARY_RE.test(hint)) return hint.toUpperCase()
    const fromSlug = fundraisingCodeFromSlug(fundraisingSlug).trim().toUpperCase()
    return NCU_PRIMARY_RE.test(fromSlug) ? fromSlug : null
  }, [ncuHint, fundraisingSlug])

  const ncuLine = ncuHint?.trim() || "—"

  const activationPending = latestActivationStatus === "pending"
  const parentLinked = !!(wiringSnapshot && wiringSnapshot.parentAthleteLinkCount > 0)
  const parentTone = wiringSnapshot ? wiringChipTone(parentLinked, activationPending) : "bad"

  function chipSubtitle(tone: WiringChipTone, connectedLabel: string) {
    if (tone === "good") return connectedLabel
    if (tone === "pending") return "Awaiting review"
    return "Not connected"
  }

  const createDonorProfileRow = async () => {
    if (!athleteId) return
    setCreateProfileBusy(true)
    try {
      const body: Record<string, unknown> = {
        athlete_id: athleteId,
        slug: fundraisingSlug.trim().toLowerCase(),
        is_active: true,
      }
      if (primaryNcuCode) body.primary_fundraising_code = primaryNcuCode

      const res = await fetch("/api/admin/athlete-fundraising-profiles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast({
          title: "Could not create profile",
          description: j.error ?? res.statusText,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Donor profile created",
        description: `${fundraisingSlug} is linked to this athlete — Attach athlete opens next.`,
      })
      router.refresh()
    } catch (e) {
      toast({
        title: "Request failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setCreateProfileBusy(false)
    }
  }

  return (
    <>
      <section
        className="mb-6 mt-6 rounded-xl border border-amber-500/45 bg-amber-950/35 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-5 sm:py-5"
        aria-label="RecruitNC admin assignment tools"
      >
        <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/95">
          RecruitNC admin only — not shown to the public
        </p>
        <p className="mt-2 text-sm font-semibold text-white">Wire this gift page</p>
        <p className="mt-1 text-xs leading-relaxed text-white/65">
          Page{" "}
          <HardLink href={`/fundraising/athletes/${fundraisingSlug}`} className="font-mono text-[11px] text-[#C8A94A] underline-offset-2 hover:underline">
            /fundraising/athletes/{fundraisingSlug}
          </HardLink>
          . Athlete shown: <span className="text-white/90">{athleteDisplayLabel}</span>
          {athleteId ? (
            <>
              {" "}
              (<span className="font-mono text-[10px] text-white/45">{athleteId.slice(0, 8)}…</span>)
            </>
          ) : null}
          . NCU hint: <span className="font-mono text-[11px] text-white/55">{ncuLine}</span>
        </p>
        {athleteId && wiringSnapshot ? (
          <div className="mt-3" role="status" aria-label="Parent linked for gift-page management">
            <div
              className={cn(
                "min-h-[52px] rounded-lg border px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                CHIP_TONE_CLASS[parentTone],
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-90">Family (parent link)</p>
              <p className="mt-1 text-xs font-semibold">{chipSubtitle(parentTone, "Linked")}</p>
            </div>
          </div>
        ) : null}
        {!profileId && athleteId ? (
          <p className="mt-3 text-xs leading-relaxed text-white/55">
            This link works from the roster and fundraising code, but there isn&apos;t a saved gift-page profile yet (no bio,
            goal, or custom settings in our system).
            <strong className="text-white/85"> You can still link a parent below.</strong> Use &quot;Create donor profile&quot; to add that saved page so tools match other athletes.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {profileId ? (
            <button
              type="button"
              onClick={() =>
                setAttachProfile({
                  id: profileId,
                  slug: fundraisingSlug,
                  athlete_id: athleteId ?? "",
                  athlete_name: athleteDisplayLabel,
                })
              }
              className="rounded-md border border-amber-400/50 bg-[#061224]/80 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 hover:bg-[#061224] hover:border-amber-300/60"
            >
              Attach athlete
            </button>
          ) : athleteId ? (
            <button
              type="button"
              disabled={createProfileBusy}
              onClick={() => void createDonorProfileRow()}
              className="rounded-md border border-emerald-500/50 bg-emerald-950/50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-950/70 hover:border-emerald-400/60 disabled:opacity-50"
            >
              {createProfileBusy ? "Creating…" : "Create donor profile"}
            </button>
          ) : (
            <span className="text-xs text-white/50">Resolve an athlete on this page first.</span>
          )}
          {athleteId ? (
            <button
              type="button"
              onClick={() =>
                setParentPayload({
                  athleteId,
                  displayName: athleteDisplayLabel,
                  athleteCode: ncuHint?.trim() || primaryNcuCode || "—",
                  fundraisingSlug,
                })
              }
              className="rounded-md border border-amber-400/50 bg-[#061224]/80 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 hover:bg-[#061224] hover:border-amber-300/60"
            >
              Attach parent
            </button>
          ) : (
            <span className="text-xs text-white/50">Resolve an athlete on this page before linking a parent account.</span>
          )}
        </div>
      </section>

      <AttachAthleteToProfileDialog
        profile={attachProfile}
        variant="fundraising"
        onClose={() => setAttachProfile(null)}
        onApplied={() => router.refresh()}
      />

      <LinkParentToAthleteDialog
        payload={parentPayload}
        variant="fundraising"
        onClose={() => setParentPayload(null)}
        onRefresh={() => router.refresh()}
      />
    </>
  )
}
