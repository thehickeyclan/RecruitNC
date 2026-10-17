"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, BarChart3, CalendarDays, ChevronRight, Compass, DollarSign, FileText, GraduationCap, School, Sparkles, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type Link = { label: string; href: string; kind: "rule" | "timeline" | "college" | "tool" }
export type Turn = { role: "user"; text: string } | { role: "scout"; headline: string; body: string; links: Link[] } | { role: "error"; text: string }

const GOLD = "#D3B574"
const LINK_ICON: Record<Link["kind"], LucideIcon> = { rule: FileText, timeline: CalendarDays, college: School, tool: ChevronRight }
const STORE = "scout-conversation"

/** Scout's avatar: a plain mark until RecruitNC has its own mascot art (the mock-up's mascot carries another brand's mark). */
function Avatar({ size = 44 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full border-2 bg-[#0A1628]" style={{ width: size, height: size, borderColor: GOLD }} aria-hidden>
      <Compass className="h-1/2 w-1/2" style={{ color: GOLD }} />
    </span>
  )
}

/** Short paragraphs and "- " bullets: all Scout is asked to write. */
function Body({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const bullets = lines.filter((l) => l.startsWith("- "))
  const paras = lines.filter((l) => !l.startsWith("- "))
  return (
    <div className="mt-3 space-y-2 text-[15px] leading-6 text-white/65">
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {bullets.length ? (
        <ul className="list-disc space-y-1 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{b.slice(2)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ScoutChat({ firstName, initialTurns }: { firstName: string | null; initialTurns?: Turn[] }) {
  const name = firstName ?? "your wrestler"
  const [turns, setTurns] = useState<Turn[]>(initialTurns ?? [])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  // The conversation survives a reload in this tab, nowhere else.
  useEffect(() => {
    if (initialTurns) return
    try {
      const saved = sessionStorage.getItem(STORE)
      if (saved) setTurns(JSON.parse(saved) as Turn[])
    } catch {
      /* private window: start fresh */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (initialTurns) return
    try {
      sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-20)))
    } catch {
      /* not saved; fine */
    }
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [turns])

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    const history = turns.flatMap((t) =>
      t.role === "user" ? [{ role: "user", content: t.text }] : t.role === "scout" ? [{ role: "assistant", content: [t.headline, t.body].filter(Boolean).join("\n") }] : [],
    )
    setTurns((all) => [...all, { role: "user", text: q }])
    setDraft("")
    setBusy(true)
    const res = await fetch("/api/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, history }) }).catch(() => null)
    const json = (await res?.json().catch(() => null)) as { headline?: string; body?: string; links?: Link[]; error?: string } | null
    setTurns((all) => [
      ...all,
      res?.ok && json?.headline ? { role: "scout", headline: json.headline, body: json.body ?? "", links: json.links ?? [] } : { role: "error", text: json?.error ?? "Scout couldn't answer just now. Try again in a moment." },
    ])
    setBusy(false)
  }

  const tiles: Array<{ icon: LucideIcon; label: string; question: string }> = [
    { icon: GraduationCap, label: "What colleges fit my results?", question: `What colleges fit ${name}'s results?` },
    { icon: Users, label: "What do coaches look for?", question: "What do college coaches look for?" },
    { icon: DollarSign, label: "What does college cost?", question: "What would the colleges on our list really cost?" },
    { icon: BarChart3, label: "How do my results compare?", question: `How do ${name}'s results compare with wrestlers who went to college?` },
  ]

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <header className="pt-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Scout</h1>
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-black tracking-wider" style={{ borderColor: `${GOLD}99`, color: GOLD, backgroundColor: `${GOLD}1a` }}>
            BETA
          </span>
          {turns.length ? (
            <button type="button" onClick={() => setTurns([])} className="ml-auto text-xs font-semibold text-white/45 hover:text-white">
              New conversation
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-white/60">Your wrestling recruiting assistant</p>
      </header>

      <div className="mt-6 flex-1 space-y-5">
        {turns.length === 0 ? (
          <div className="flex items-start gap-3">
            <Avatar />
            <div className="rounded-2xl border border-white/10 bg-[#0d1d36]/90 p-5">
              <p className="text-lg font-semibold leading-7">Hi, I&apos;m Scout. Ask me anything about {firstName ? `${firstName}'s` : "your"} recruiting.</p>
              <p className="mt-2 text-[15px] leading-6 text-white/60">I know the rules for {firstName ? `${firstName}'s` : "your"} class, your college list, who has viewed the profile and what to do next.</p>
            </div>
          </div>
        ) : null}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3.5 text-[17px] leading-7">{t.text}</p>
            </div>
          ) : t.role === "error" ? (
            <div key={i} className="flex items-start gap-3">
              <Avatar />
              <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3.5 text-sm text-red-100">{t.text}</p>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-3">
              <Avatar />
              <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0d1d36]/90 p-5">
                <p className="text-lg font-semibold leading-7">{t.headline}</p>
                {t.body ? <Body text={t.body} /> : null}
                {t.links.length ? (
                  <div className="mt-4 space-y-2">
                    {t.links.map((l) => {
                      const Icon = LINK_ICON[l.kind]
                      return (
                        <a key={l.href} href={l.href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0A1628]/70 px-4 py-3 text-[15px] font-medium hover:border-white/25">
                          <Icon className="h-5 w-5 shrink-0 text-white/80" aria-hidden />
                          <span className="flex-1">{l.label}</span>
                          <ChevronRight className="h-4 w-4 text-white/50" aria-hidden />
                        </a>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ),
        )}
        {busy ? (
          <div className="flex items-center gap-3">
            <Avatar />
            <p className="text-sm text-white/55">Scout is looking that up…</p>
          </div>
        ) : null}
        <div ref={end} />
      </div>

      <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#060f1f] via-[#060f1f] to-transparent pb-4 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map(({ icon: Icon, label, question }) => (
            <button
              key={label}
              type="button"
              disabled={busy}
              onClick={() => ask(question)}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#0d1d36]/90 px-3 py-3.5 text-center text-sm leading-5 text-white/85 hover:border-white/25 disabled:opacity-50"
            >
              <Icon className="h-6 w-6" style={{ color: GOLD }} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
          className="mt-3 flex items-center gap-3 rounded-2xl border-2 bg-[#0A1628] py-2 pl-4 pr-2"
          style={{ borderColor: `${GOLD}cc` }}
        >
          <Sparkles className="h-5 w-5 shrink-0" style={{ color: GOLD }} aria-hidden />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Scout anything…"
            aria-label="Ask Scout a question"
            maxLength={600}
            className="min-w-0 flex-1 bg-transparent py-2 text-base text-white placeholder:text-white/45 focus:outline-none"
          />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#0A1628] disabled:opacity-40" style={{ backgroundColor: GOLD }}>
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-white/45">Get answers on recruiting rules, colleges, costs, next steps and more.</p>
      </div>
    </div>
  )
}
