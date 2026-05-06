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
import {
  fundraisingWiringLooksReadyForNonAdminEdits,
  type FundraisingWiringAdminSnapshot,
} from "@/lib/fundraising/fundraising-wiring-status"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const NCU_PRIMARY_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

type Props = {
  fundraisingSlug: string
  profileId: string | null
  athleteId: string | null
  athleteDisplayLabel: string
  ncuHint: string | null
  /** Server snapshot — parent links vs claimed athlete profile for non-admin gift-page edits. */
  wiringSnapshot: FundraisingWiringAdminSnapshot | null
}

export function FundraisingAdminAssignmentPanel({
  fundraisingSlug,
  profileId,
  athleteId,
  athleteDisplayLabel,
  ncuHint,
  wiringSnapshot,
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
          <div
            className={cn(
              "mt-3 rounded-lg border px-3 py-2.5 text-xs leading-snug",
              fundraisingWiringLooksReadyForNonAdminEdits(wiringSnapshot)
                ? "border-emerald-500/45 bg-emerald-950/40"
                : "border-red-500/45 bg-red-950/35",
            )}
            role="status"
          >
            <p
              className={cn(
                "font-semibold",
                fundraisingWiringLooksReadyForNonAdminEdits(wiringSnapshot) ? "text-emerald-200" : "text-red-200",
              )}
            >
              {fundraisingWiringLooksReadyForNonAdminEdits(wiringSnapshot)
                ? "Non-admin edit path: good — at least one login can edit this gift page."
                : "Non-admin edit path: incomplete — use Attach parent or a claimed athlete profile."}
            </p>
            <ul className="mt-2 space-y-2 text-white/85">
              <li className="flex gap-2">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    wiringSnapshot.parentAthleteLinkCount > 0 ? "bg-emerald-500" : "bg-red-600",
                  )}
                  aria-hidden
                />
                <span>
                  <strong className="text-white">Links</strong> ({wiringSnapshot.parentAthleteLinkCount}) —{" "}
                  <code className="font-mono text-[10px] text-white/55">parent_athlete_links</code>. Parent account or wrestler
                  account linked via <strong className="text-white">Attach parent</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    wiringSnapshot.userProfilesAthleteIdMatchCount > 0 ? "bg-emerald-500" : "bg-red-600",
                  )}
                  aria-hidden
                />
                <span>
                  <strong className="text-white">Claim</strong> ({wiringSnapshot.userProfilesAthleteIdMatchCount}) —{" "}
                  <code className="font-mono text-[10px] text-white/55">user_profiles.athlete_id</code>. Wrestler&apos;s own login
                  claims this roster athlete (self-edit).
                </span>
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-white/45 leading-snug">
              Either green dot is usually enough for edits. Login email matching roster contact can still unlock edits without these
              rows.
            </p>
          </div>
        ) : null}
        {!profileId && athleteId ? (
          <p className="mt-3 text-xs leading-relaxed text-white/55">
            This URL is backed by the roster + NCU code only — there isn&apos;t a{" "}
            <span className="font-mono text-[10px] text-white/70">athlete_fundraising_profiles</span> row yet (bio/goal/custom slug).
            <strong className="text-white/85"> Parent linking below still works.</strong> One click creates the row so Attach athlete and edits behave like other donor pages.
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
