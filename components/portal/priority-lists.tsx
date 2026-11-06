"use client"

import { useState } from "react"
import { ArrowRight, Check, Undo2 } from "lucide-react"

import type { ListCard, PriorityListsView } from "@/app/my-recruiting/priority-lists"
import { FIRST_LIST_GOAL, FirstListProgress } from "@/components/portal/first-list-progress"
import { DONT_KNOW, KEEP_CHIPS, PASS_REASONS, REACTIONS, reasonLabel, theirLine, type SeenReaction } from "@/lib/recruiting/priorities/reactions"
import type { ReactionKind } from "@/lib/recruiting/priorities/sharing"

const LEVEL_COLOR: Record<string, string> = { D1: "#60a5fa", D2: "#34d399", D3: "#fbbf24", NAIA: "#f472b6", NJCAA: "#a78bfa" }

/** No logo on file: the college's initials, never a blank box. */
function monogram(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w) && !["Of", "The", "And", "At"].includes(w))
  return (words.length ? words : [name]).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

/**
 * The two suggestion lists, shaped by the survey (priorities v3, part 3). Each card says why it
 * fits, what might not, and the one thing to check next. Never padded: a list can be short.
 */
export function PriorityLists({
  lists,
  athleteId,
  firstName,
  levelColors,
  readOnly,
  savedCount = 0,
  bare = false,
}: {
  lists: PriorityListsView
  athleteId: string
  firstName: string
  levelColors?: Record<string, string>
  readOnly?: boolean
  savedCount?: number
  bare?: boolean
}) {
  const [mine, setMine] = useState<Record<string, SeenReaction>>(lists.reactions.mine)
  const [newlySaved, setNewlySaved] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [inviteNote, setInviteNote] = useState<string | null>(null)
  const colors = levelColors ?? LEVEL_COLOR
  const theirs = lists.reactions.theirs
  const batchOf = (id: string) => (lists.bestFit.some((c) => c.id === id) ? lists.batchIds.bestFit : lists.batchIds.opportunities)
  const canReact = !readOnly && Boolean(lists.batchIds.bestFit || lists.batchIds.opportunities)

  const react = async (id: string, reaction: ReactionKind, extra: { reason?: string | null; chips?: string[] } = {}) => {
    const batchId = batchOf(id)
    if (!canReact || !batchId) return
    const before = mine[id]
    const next: SeenReaction = { reaction, reason: extra.reason ?? null, chips: extra.chips ?? [] }
    setMine((m) => ({ ...m, [id]: next }))
    setBusy(id)
    setFailed(null)
    const res = await fetch("/api/recruiting-priorities/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId, batchId, schoolId: id, reaction, reason: next.reason, chips: next.chips }),
    }).catch(() => null)
    setBusy(null)
    if (!res?.ok) {
      setMine((m) => {
        const copy = { ...m }
        if (before) copy[id] = before
        else delete copy[id]
        return copy
      })
      setFailed(id)
      return
    }
    const out = (await res.json().catch(() => null)) as { saved?: boolean } | null
    if (out?.saved) setNewlySaved((n) => n + 1)
  }
  const undo = async (id: string) => {
    const before = mine[id]
    setMine((m) => {
      const copy = { ...m }
      delete copy[id]
      return copy
    })
    const res = await fetch(`/api/recruiting-priorities/reactions?athleteId=${encodeURIComponent(athleteId)}&schoolId=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null)
    if (!res?.ok && before) {
      setMine((m) => ({ ...m, [id]: before }))
      setFailed(id)
    }
  }

  const chip = (on: boolean, label: string, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${on ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/20 text-white/70 hover:border-white/40"}`}
    >
      {label}
    </button>
  )

  /** The three one-tap reactions, then what each one opens. */
  const reactions = (c: ListCard) => {
    const r = mine[c.id]
    const other = theirs[c.id]
    const otherLine = other ? <p className="mt-2 text-[11px] font-bold text-white/55">{theirLine(lists.otherLabel, other)}</p> : null
    if (!canReact) return otherLine
    const pass = r?.reaction === "not_for_us" && r.reason !== DONT_KNOW
    return (
      <>
        {otherLine}
        {!r || r.reason === DONT_KNOW ? (
          <div className="mt-2.5 grid grid-cols-3 gap-1.5" role="group" aria-label={`Your reaction to ${c.name}`}>
            {REACTIONS.map((x) => (
              <button
                key={x.key}
                type="button"
                disabled={busy === c.id}
                onClick={() => react(c.id, x.key)}
                className="rounded-lg border border-white/20 px-1.5 py-1.5 text-[11px] font-bold leading-tight text-white hover:border-[#D3B574]"
              >
                {x.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2.5 rounded-lg bg-white/[0.04] p-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-black ${r.reaction === "closer_look" ? "text-emerald-300" : r.reaction === "maybe" ? "text-amber-200" : "text-white/70"}`}>
                {r.reaction === "closer_look" ? "Worth a closer look · on your My List" : r.reaction === "maybe" ? "Maybe · on your To check list" : `Not for us${r.reason ? ` · ${reasonLabel(r.reason)?.toLowerCase()}` : ""}`}
              </span>
              <button type="button" onClick={() => undo(c.id)} className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-white/50 hover:text-white">
                <Undo2 className="h-3 w-3" aria-hidden /> Undo
              </button>
            </div>
            {r.reaction === "closer_look" ? (
              <div className="mt-1.5">
                <p className="text-[11px] text-white/45">What stood out (optional)</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {KEEP_CHIPS.map((k) => chip(r.chips.includes(k.key), k.label, () => react(c.id, "closer_look", { chips: r.chips.includes(k.key) ? r.chips.filter((x) => x !== k.key) : [...r.chips, k.key] }), k.key))}
                </div>
              </div>
            ) : null}
            {pass && !r.reason ? (
              <div className="mt-1.5">
                <p className="text-[11px] text-white/45">Why (optional)</p>
                <div className="mt-1 flex flex-wrap gap-1">{PASS_REASONS.map((p) => chip(false, p.label, () => react(c.id, "not_for_us", { reason: p.key }), p.key))}</div>
              </div>
            ) : null}
          </div>
        )}
        {failed === c.id ? <p className="mt-1 text-[11px] text-red-300">Could not save that. Try again.</p> : null}
      </>
    )
  }

  const card = (c: ListCard) => {
    const r = mine[c.id]
    const passed = r?.reaction === "not_for_us" && r.reason !== DONT_KNOW && Boolean(r.reason)
    // A pass with its reason picked folds to one line; Undo brings the card back.
    if (passed && canReact)
      return (
        <li key={c.id} className="flex items-center justify-between gap-2 self-start rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <span className="min-w-0 truncate text-xs text-white/50">
            <span className="font-bold text-white/70">{c.name}</span> · Not for us · {reasonLabel(r.reason)?.toLowerCase()}
          </span>
          <button type="button" onClick={() => undo(c.id)} className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-white/50 hover:text-white">
            <Undo2 className="h-3 w-3" aria-hidden /> Undo
          </button>
        </li>
      )
    const unknown = r?.reaction === "not_for_us" && r.reason === DONT_KNOW
    return (
    <li key={c.id} className="flex flex-col rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start gap-2.5">
        {c.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.logo} alt="" className="h-9 w-9 shrink-0 rounded bg-white object-contain p-0.5" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/[0.08] text-[11px] font-black text-white/70" aria-hidden>
            {monogram(c.name)}
          </span>
        )}
        <a href={`/recruiting/schools/${c.id}`} className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-bold leading-5 hover:underline">{c.name}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
            <span className="shrink-0 rounded px-1 text-[10px] font-black text-[#071427]" style={{ backgroundColor: colors[c.level] ?? "#94a3b8" }}>
              {c.level}
            </span>
            <span className="truncate">{c.place}</span>
          </span>
        </a>
      </div>
      {unknown ? (
        <a href={`/recruiting/schools/${c.id}`} className="mt-2 block rounded-lg bg-sky-400/10 px-2 py-1.5 text-[11px] font-bold text-sky-200 hover:underline">
          New to you. Learn about {c.name} →
        </a>
      ) : null}
      <ul className="mt-2.5 space-y-1 text-xs leading-4">
        {c.why.map((w) => (
          <li key={w} className="flex gap-1.5 text-white/80">
            <Check className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            {w}
          </li>
        ))}
        {c.mightNot.map((m) => (
          <li key={m} className="flex gap-1.5 text-amber-200/85">
            <span className="mt-px w-3.5 shrink-0 text-center font-black" aria-hidden>
              !
            </span>
            {m}
          </li>
        ))}
      </ul>
      {c.opportunityNote ? <p className="mt-1.5 text-[11px] leading-4 text-white/40">{c.opportunityNote}</p> : null}
      <a href={c.next.href} className="mt-auto flex items-center gap-1 pt-2.5 text-xs font-bold text-[#D3B574] hover:underline" {...(c.next.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
        {c.next.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </a>
      {reactions(c)}
    </li>
    )
  }
  const invite = async () => {
    setInviteNote(null)
    const res = await fetch("/api/recruiting-priorities/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ athleteId }) }).catch(() => null)
    const out = (await res?.json().catch(() => null)) as { text?: string } | null
    if (!res?.ok || !out?.text) return setInviteNote("Could not make the link. Try again.")
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ text: out.text })
        return setInviteNote(`Sent. ${firstName}'s answers will shape the lists once ${firstName} finishes.`)
      } catch {
        /* closed the share sheet: fall through to copy */
      }
    }
    await navigator.clipboard?.writeText(out.text).catch(() => null)
    setInviteNote(`Copied. Paste it in a text to ${firstName}.`)
  }
  const toCheck = [...lists.bestFit, ...lists.opportunities].filter((c, i, all) => mine[c.id]?.reaction === "maybe" && all.findIndex((x) => x.id === c.id) === i)
  const list = (id: string, title: string, sub: string, cards: ListCard[]) =>
    cards.length ? (
      <div className="mt-4">
        <h3 id={id} className="text-sm font-black">
          {title} <span className="font-bold text-white/45">· {cards.length}</span>
        </h3>
        <p className="text-xs text-white/50">{sub}</p>
        <ul aria-labelledby={id} className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(card)}
        </ul>
      </div>
    ) : null
  if (!lists.bestFit.length && !lists.opportunities.length && !lists.shortLine) return null
  return (
    <section className={bare ? "mt-5 scroll-mt-24" : "mt-4 scroll-mt-24 rounded-xl border border-white/10 bg-[#0f1c2e] p-5"} id="cc-lists" aria-labelledby="cc-lists-h">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="cc-lists-h" className="text-base font-black">
          Colleges for {firstName}, from what matters to your family
        </h2>
        <a href={`/my-recruiting/priorities?w=${athleteId}`} className="text-xs font-bold text-[#D3B574] hover:underline">
          Change answers →
        </a>
      </div>
      <p className="text-xs text-white/50">{lists.shapedBy}{canReact ? " React to each one. Worth a closer look saves it to your My List." : ""}</p>
      {lists.goalsLastSeason && !readOnly ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D3B574]/30 bg-[#D3B574]/[0.06] p-3">
          <p className="min-w-0 flex-1 text-xs text-white/75">Your goals are from last season. Goals change as {firstName} grows. Check they still fit.</p>
          <a href={`/my-recruiting/priorities?w=${athleteId}`} className="shrink-0 rounded-lg bg-[#D3B574] px-3 py-1.5 text-xs font-black text-[#0A1628]">
            Review my goals
          </a>
        </div>
      ) : null}
      {lists.inviteAthlete && !readOnly ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D3B574]/30 bg-[#D3B574]/[0.06] p-3">
          <p className="min-w-0 flex-1 text-xs text-white/75">
            {firstName} has a short set to answer too. {firstName}&apos;s answers make these lists better, and {firstName} chooses what you see.
          </p>
          <button type="button" onClick={invite} className="shrink-0 rounded-lg bg-[#D3B574] px-3 py-1.5 text-xs font-black text-[#0A1628]">
            Send {firstName} the link
          </button>
          {inviteNote ? <p className="w-full text-[11px] text-white/60">{inviteNote}</p> : null}
        </div>
      ) : null}
      {lists.alignment ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3" id="cc-alignment">
          <h3 className="text-sm font-black">Where you and {lists.otherLabel === "Your parent" ? "your parent" : lists.otherLabel} line up</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {lists.alignment.agree.length ? (
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-emerald-300/80">You agree</p>
                <ul className="mt-1 space-y-1 text-xs leading-4">
                  {lists.alignment.agree.map((l) => (
                    <li key={l.text} className="flex gap-1.5 text-white/80">
                      <Check className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                      {l.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {lists.alignment.differ.length ? (
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-amber-200/80">Worth talking through</p>
                <ul className="mt-1 space-y-1 text-xs leading-4">
                  {lists.alignment.differ.map((l) => (
                    <li key={l.text} className="flex gap-1.5 text-amber-100/85">
                      <span className="mt-px w-3.5 shrink-0 text-center font-black" aria-hidden>
                        ≠
                      </span>
                      {l.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-white/40">From answers you each shared. Coaches never see any of this.</p>
        </div>
      ) : null}
      {savedCount < FIRST_LIST_GOAL ? <FirstListProgress count={savedCount + newlySaved} firstName={firstName} className="mt-3" /> : null}
      {list("cc-best", "Best fit", `Levels you're open to, ranked by what you said matters most, where ${firstName}'s results fit.`, lists.bestFit)}
      {list("cc-opps", "Opportunities worth pursuing", `Where there's evidence a program could use ${firstName}: a projected opening at the weight, a coach-posted need, or coaches viewing the profile.`, lists.opportunities)}
      {toCheck.length ? (
        <div className="mt-4 rounded-lg border border-amber-200/20 bg-amber-200/[0.04] p-3">
          <h3 className="text-sm font-black">To check · {toCheck.length}</h3>
          <ul className="mt-1.5 space-y-1">
            {toCheck.map((c) => (
              <li key={c.id} className="text-xs">
                <span className="font-bold">{c.name}:</span>{" "}
                <a href={c.next.href} className="font-bold text-[#D3B574] hover:underline" {...(c.next.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                  {c.next.label} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {lists.shortLine ? <p className="mt-3 text-xs text-white/55">{lists.shortLine}</p> : null}
      {lists.notes.map((n) => (
        <p key={n} className="mt-2 text-[11px] text-white/45">
          {n}
        </p>
      ))}
    </section>
  )
}
