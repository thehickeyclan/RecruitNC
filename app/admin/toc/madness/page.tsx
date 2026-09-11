"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * TOC Madness — the game, run separately from the tournament.
 *
 * GO on the field board publishes the official brackets. This page runs what sits on top of them:
 * telling people the game is open, and reminding them before picks lock. Every button here refuses
 * to act until GO has been pressed, so nothing sent from this page can get ahead of the release.
 *
 * Each send asks once before it goes, because every one of them reaches real phones or inboxes and
 * none of them can be taken back.
 */

type Action = "announce" | "remind-push" | "remind-email"

type MadnessState = {
  schemaReady: boolean
  released: boolean
  deadlineText: string
  announcedAt: string | null
  pushRemindedAt: string | null
  emailRemindedAt: string | null
  lockedWeights: number[]
  entrants: number
  incomplete: number
  tocDevices: number
  result?: { kind: "push" | "email"; sent: number; failed: number; targeted?: number }
}

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "never"
}

export default function TocMadnessAdminPage() {
  const [state, setState] = useState<MadnessState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Action | null>(null)
  const [confirming, setConfirming] = useState<Action | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/toc/madness", { cache: "no-store" })
      const body = await res.json()
      if (!res.ok) return setError(body.error ?? "Could not load TOC Madness.")
      setError(null)
      setState(body as MadnessState)
    } catch {
      setError("Could not load TOC Madness.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run = useCallback(async (action: Action) => {
    setBusy(action)
    setLastResult(null)
    try {
      const res = await fetch("/api/admin/toc/madness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? "That did not send.")
        await load()
        return
      }
      setError(null)
      setState(body as MadnessState)
      const r = (body as MadnessState).result
      if (r) {
        setLastResult(
          r.kind === "push"
            ? `Sent to ${r.sent} phone${r.sent === 1 ? "" : "s"}${r.failed ? `, ${r.failed} failed` : ""}.`
            : `Emailed ${r.sent} of ${r.targeted ?? r.sent} unfinished entrant${(r.targeted ?? r.sent) === 1 ? "" : "s"}${r.failed ? `, ${r.failed} failed` : ""}.`,
        )
      }
    } catch {
      setError("That did not send.")
    } finally {
      setBusy(null)
      setConfirming(null)
    }
  }, [load])

  if (!state && !error) return <div className="p-6 text-sm text-white/60">Loading…</div>

  const locked = !state?.released

  const card = (opts: {
    action: Action
    title: string
    detail: string
    status: string
    confirmText: string
    disabled?: boolean
    done?: boolean
  }) => (
    <div className="rounded-lg border border-white/10 bg-[#0B1D3A] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="text-base font-bold text-white">{opts.title}</h2>
          <p className="mt-1 text-sm text-white/65">{opts.detail}</p>
          <p className="mt-2 text-xs text-white/45">{opts.status}</p>
        </div>
        {confirming === opts.action ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/75">{opts.confirmText}</span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void run(opts.action)}
              className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-bold text-[#04150d] hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy === opts.action ? "Sending…" : "Yes, send"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setConfirming(null)}
              className="rounded border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={opts.disabled || opts.done || busy !== null || !state?.schemaReady}
            onClick={() => setConfirming(opts.action)}
            className="rounded bg-[#D7B95A] px-3 py-1.5 text-xs font-bold text-[#0B1D3A] hover:bg-[#c9ab4f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {opts.done ? "Sent" : opts.title}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CC0000]">Tournament of Champions</p>
        <h1 className="text-2xl font-black text-white">TOC Madness</h1>
        <p className="mt-1 text-sm text-white/60">
          The game, run separately from the tournament. GO on the field board publishes the brackets; nothing here can send
          until it has been pressed.
        </p>
      </div>

      {state ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Brackets", state.released ? "Live" : "Not released"],
            ["Picks lock", state.deadlineText],
            ["Entrants", String(state.entrants)],
            ["Unfinished", String(state.incomplete)],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">{label}</p>
              <p className="mt-1 text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {state && !state.schemaReady ? (
        <p className="rounded border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
          The tracking columns are missing. Run the TOC Madness SQL, then reload this page.
        </p>
      ) : null}
      {locked && state?.schemaReady ? (
        <p className="rounded border border-white/15 bg-white/[0.03] p-3 text-sm text-white/70">
          Locked until the brackets are released. Press GO on the field board first.
        </p>
      ) : null}
      {error ? <p className="rounded border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      {lastResult ? <p className="rounded border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-100">{lastResult}</p> : null}

      {state ? (
        <>
          {card({
            action: "announce",
            title: "Announce TOC Madness",
            detail: `"TOC Madness is open — pick every bout at every weight. Picks lock ${state.deadlineText}." Opens Your Bracket when tapped.`,
            status: state.announcedAt ? `Announced ${when(state.announcedAt)}.` : `Goes to ${state.tocDevices} phones with TOC alerts on. Sends once, ever.`,
            confirmText: `Send to ${state.tocDevices} phones?`,
            disabled: locked,
            done: Boolean(state.announcedAt),
          })}
          {card({
            action: "remind-push",
            title: "Remind everyone",
            detail: `A push to every phone with TOC alerts on: "Make sure all ten are in before ${state.deadlineText}." Phones are not linked to accounts, so this also reaches people who have finished.`,
            status: `Last sent ${when(state.pushRemindedAt)}. At most once an hour.`,
            confirmText: `Send to ${state.tocDevices} phones?`,
            disabled: locked,
          })}
          {card({
            action: "remind-email",
            title: "Email unfinished entrants",
            detail: "An email only to signed-in entrants who started their picks and have not submitted every weight.",
            status: `${state.incomplete} unfinished right now. Last sent ${when(state.emailRemindedAt)}. At most once an hour.`,
            confirmText: `Email ${state.incomplete} entrant${state.incomplete === 1 ? "" : "s"}?`,
            disabled: locked || state.incomplete === 0,
          })}
        </>
      ) : null}
    </div>
  )
}
