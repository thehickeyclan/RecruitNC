"use client"

/**
 * One wrestler's recruiting file for the program (Matt, 2 Nov 2026): a work page inside the coach
 * portal, never a second profile. The profile is who the wrestler is; the file is this program and
 * this wrestler - stage, next step, the staff's notes, what has happened between them, how to reach
 * the family. So the top is a compact summary with "Open full profile", and there are no results
 * tables or credential cards here.
 *
 * Data: lib/recruiting/recruit-file.ts. Read-only for an admin viewing as a coach (?as=).
 */
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Eye,
  FileText,
  GitCompareArrows,
  HeartHandshake,
  Lock,
  Mail,
  MessageSquare,
  NotebookPen,
  Phone,
  PhoneCall,
  Reply,
  Star,
  Trash2,
  Trophy,
  UserRound,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/recruiting/pipeline"
import type { RecruitFile } from "@/lib/recruiting/recruit-file"
import type { FileEvent } from "@/lib/recruiting/recruit-file-timeline"
import type { RecruitNote } from "@/lib/recruiting/recruit-notes"
import { CoachMessageButton } from "@/components/coach-messages/coach-message-button"
import { LogActivityDialog } from "@/components/my-recruits-board"

const ACCENT = "text-[#D3B574]"
const CARD = "rounded-xl border border-white/10 bg-[#0f1c2e] p-4 sm:p-5"
const LABEL = "text-[11px] font-black uppercase tracking-widest text-white/45"

const shortDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
const fullDay = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })

function Initials({ name }: { name: string }) {
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-white/60">
      {name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")}
    </span>
  )
}

function Header({ file, asUserId }: { file: RecruitFile; asUserId: string | null }) {
  const row = file.row
  const name = row?.name ?? file.basic?.name ?? "Wrestler"
  const photo = row?.photoUrl ?? file.basic?.photoUrl ?? null
  // The weight he last competed at, from his results; never the listed weight on its own.
  const weight = row?.activity?.lastWeight ?? null
  const facts = [row?.classYear ? `Class of ${row.classYear}` : null, weight ? `${weight} lbs` : null].filter(Boolean)
  const school = [row?.highSchool, row?.state].filter(Boolean).join(", ")
  const button = "inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors"
  return (
    <section className={cn(CARD, "sm:p-5")}>
      <div className="flex items-start gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- athlete photos come from mixed hosts
          <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover object-top" />
        ) : (
          <Initials name={name} />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black leading-tight text-white sm:text-2xl">{name}</h1>
          <p className="mt-0.5 text-sm text-white/70">
            {facts.join(" · ") || "—"}
            {weight ? <span className="text-white/40"> last competed</span> : null}
          </p>
          {school ? <p className="truncate text-sm text-white/55">{school}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
            {row?.rank != null ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#D3B574]/15 px-2 py-1 text-[#D3B574]">
                <Trophy className="h-3.5 w-3.5" aria-hidden />
                {row.womensRank ? "W " : ""}#{row.rank} · {row.state ?? "NC"} {row.classYear}
                {file.rankAsOf ? <span className="font-semibold opacity-80">· {shortDay(file.rankAsOf)}</span> : null}
              </span>
            ) : null}
            {row?.committedTo ? (
              <span className={cn("rounded-md px-2 py-1", row.committedToUs ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/80")}>
                {row.committedToUs ? "Committed to you" : `Committed · ${row.committedTo}`}
              </span>
            ) : null}
            {row?.interestedAt ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/15 px-2 py-1 text-emerald-200">
                <HeartHandshake className="h-3.5 w-3.5" aria-hidden /> Interested in you
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`/view-profile?id=${file.athleteId}`} className={cn(button, "bg-[#D3B574] text-[#0A1628] hover:opacity-90")}>
          <UserRound className="h-4 w-4" aria-hidden /> Open full profile
        </a>
        {asUserId ? null : <CoachMessageButton athleteId={file.athleteId} athleteName={name} variant="action" showLabel />}
        <a href={`/compare?left=${file.athleteId}&src=recruit-file`} className={cn(button, "border border-white/20 text-white hover:bg-white/10")}>
          <GitCompareArrows className="h-4 w-4" aria-hidden /> Compare
        </a>
        {row?.hasReport ? (
          <a href={`/athletes/${file.athleteId}/scouting-report`} className={cn(button, "border border-white/20 text-white hover:bg-white/10")}>
            <FileText className="h-4 w-4" aria-hidden /> Scouting report
          </a>
        ) : null}
      </div>
    </section>
  )
}

function StageCard({ file, readOnly, onLog }: { file: RecruitFile; readOnly: boolean; onLog: () => void }) {
  const row = file.row!
  const [stage, setStage] = useState<PipelineStage>(row.stage)
  const [error, setError] = useState<string | null>(null)
  const move = async (next: PipelineStage) => {
    if (readOnly || next === stage) return
    const before = stage
    setStage(next)
    setError(null)
    const res = await fetch("/api/coach-portal/update-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ athleteId: row.athleteId, stage: next }),
    }).catch(() => null)
    if (!res?.ok) {
      setStage(before)
      setError("That stage change did not save. Try again.")
    }
  }
  const next = file.nextStep
  const overdue = next ? next.date < new Date().toISOString().slice(0, 10) : false
  return (
    <section className={CARD} aria-labelledby="rf-stage">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rf-stage" className={LABEL}>
          Stage
        </h2>
        <span className="text-[11px] text-white/40">
          Added {fullDay(row.starredAt)}
          {row.starredBy !== "You" ? ` by ${row.starredBy}` : ""}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stage">
        {PIPELINE_STAGES.map((s) => {
          const on = s === stage
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={readOnly}
              onClick={() => move(s)}
              className={cn(
                "min-h-[36px] rounded-full border px-3 text-xs font-bold transition-colors disabled:cursor-default",
                on ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/15 text-white/65 hover:border-white/40 hover:text-white",
              )}
            >
              {s}
            </button>
          )
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="min-w-0">
          <p className={LABEL}>Next step</p>
          {next ? (
            <p className="mt-1 text-sm text-white">
              <span className={cn("font-black", overdue ? "text-amber-200" : ACCENT)}>Follow up {shortDay(next.date)}</span>
              {next.note ? <span className="text-white/75"> · {next.note}</span> : null}
              <span className="text-white/40"> · {next.by}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-white/55">No follow-up set</p>
          )}
          {row.lastContact ? (
            <p className="mt-0.5 text-xs text-white/45">
              Last contact {shortDay(row.lastContact.date)} · {row.lastContact.by}
            </p>
          ) : null}
        </div>
        {readOnly ? null : (
          <button type="button" onClick={onLog} className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#D3B574]/60 px-3 text-sm font-bold text-[#D3B574] hover:bg-[#D3B574]/10">
            <PhoneCall className="h-4 w-4" aria-hidden /> Log contact
          </button>
        )}
      </div>
    </section>
  )
}

function Notes({ athleteId, initial, readOnly, program }: { athleteId: string; initial: RecruitNote[]; readOnly: boolean; program: string | null }) {
  const [notes, setNotes] = useState(initial)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const add = async () => {
    const note = draft.trim()
    if (!note) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/coach-portal/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, note }),
      })
      const body = (await res.json().catch(() => ({}))) as { note?: RecruitNote; error?: string }
      if (!res.ok || !body.note) throw new Error(body.error ?? "Could not save the note.")
      setNotes((n) => [body.note!, ...n])
      setDraft("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the note.")
    } finally {
      setSaving(false)
    }
  }
  const remove = async (id: string) => {
    const before = notes
    setNotes((n) => n.filter((x) => x.id !== id))
    const res = await fetch(`/api/coach-portal/notes?noteId=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" }).catch(() => null)
    if (!res?.ok) setNotes(before)
  }
  return (
    <section className={CARD} aria-labelledby="rf-notes">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rf-notes" className={cn(LABEL, "flex items-center gap-1.5")}>
          <NotebookPen className={cn("h-3.5 w-3.5", ACCENT)} aria-hidden /> Notes {notes.length ? <span className="text-white/35">· {notes.length}</span> : null}
        </h2>
        <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
          <Lock className="h-3 w-3" aria-hidden /> {program ? `${program} staff only` : "Only you"}
        </span>
      </div>
      {readOnly ? null : (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void add()
            }}
            rows={3}
            maxLength={4000}
            placeholder="Call notes, what you saw at the last event, what comes next"
            aria-label="New note"
            // 16px on a phone so iOS does not zoom into the field.
            className="w-full resize-y rounded-lg border border-white/15 bg-[#0A1628] px-3 py-2.5 text-base text-white placeholder:text-white/35 focus:border-[#D3B574] focus:outline-none sm:text-sm"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            {error ? <p className="text-xs text-red-300">{error}</p> : <span />}
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="min-h-[40px] rounded-lg bg-[#D3B574] px-4 text-sm font-black text-[#0A1628] disabled:opacity-40"
            >
              {saving ? "Saving…" : "Add note"}
            </button>
          </div>
        </form>
      )}
      {notes.length ? (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="whitespace-pre-wrap break-words text-sm text-white/90">{n.note}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-white/45">
                <span>
                  <span className="font-semibold text-white/65">{n.by}</span> · {fullDay(n.createdAt)}
                </span>
                {n.mine && !readOnly ? (
                  <button type="button" onClick={() => remove(n.id)} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-white/40 hover:text-red-300" aria-label="Delete note">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-white/45">No notes yet.</p>
      )}
    </section>
  )
}

const KIND: Record<FileEvent["kind"], { icon: typeof Eye; tone: string }> = {
  upcoming: { icon: CalendarDays, tone: "text-sky-300" },
  result: { icon: Trophy, tone: "text-[#D3B574]" },
  view: { icon: Eye, tone: "text-white/55" },
  message_out: { icon: MessageSquare, tone: "text-[#D3B574]" },
  message_in: { icon: Reply, tone: "text-emerald-300" },
  interest: { icon: HeartHandshake, tone: "text-emerald-300" },
  logged: { icon: PhoneCall, tone: "text-white/75" },
  added: { icon: Star, tone: "text-[#D3B574]" },
}

function Timeline({ events }: { events: FileEvent[] }) {
  const [all, setAll] = useState(false)
  const FIRST = 12
  const shown = all ? events : events.slice(0, FIRST)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <section className={CARD} aria-labelledby="rf-activity">
      <h2 id="rf-activity" className={LABEL}>
        Activity
      </h2>
      {events.length ? (
        <ol className="mt-3 space-y-0.5">
          {shown.map((e, i) => {
            const k = KIND[e.kind]
            const upcoming = e.kind === "upcoming" && e.at.slice(0, 10) >= today
            const body = (
              <>
                <k.icon className={cn("mt-0.5 h-4 w-4 shrink-0", k.tone)} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    {e.title}
                    {upcoming ? <span className="ml-1.5 rounded bg-sky-400/15 px-1.5 py-px text-[10px] font-black uppercase text-sky-200">Upcoming</span> : null}
                    {e.fresh ? <span className="ml-1.5 rounded bg-red-600 px-1.5 py-px text-[10px] font-black uppercase text-white">New</span> : null}
                  </span>
                  {e.detail ? <span className="block truncate text-xs text-white/55">{e.detail}</span> : null}
                  {e.by ? <span className="block text-[11px] text-white/40">{e.by}</span> : null}
                </span>
                <span className="shrink-0 pt-0.5 text-[11px] font-semibold text-white/45">{shortDay(e.at)}</span>
              </>
            )
            return (
              <li key={`${e.kind}-${e.at}-${i}`}>
                {e.href ? (
                  <a href={e.href} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.05]">
                    {body}
                  </a>
                ) : (
                  <div className="flex items-start gap-3 px-2 py-2">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-white/45">Nothing yet. Views, messages, contacts and new results show here.</p>
      )}
      {events.length > FIRST ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-xs font-bold text-[#D3B574] hover:underline">
          {all ? "Show less" : `Show all ${events.length}`}
        </button>
      ) : null}
    </section>
  )
}

function Family({ family }: { family: RecruitFile["family"] }) {
  const p = family.parent
  const line = "flex min-h-[40px] items-center gap-2 text-sm text-white/85 hover:text-white"
  return (
    <section className={CARD} aria-labelledby="rf-family">
      <div className="flex items-center justify-between gap-2">
        <h2 id="rf-family" className={LABEL}>
          Family
        </h2>
        {family.claimed ? <span className="rounded bg-emerald-400/15 px-1.5 py-px text-[10px] font-black uppercase text-emerald-200">On the platform</span> : null}
      </div>
      {!family.see ? (
        <p className="mt-2 text-sm text-white/55">Family contacts show to staff-approved coaches.</p>
      ) : (
        <div className="mt-2 space-y-0.5">
          {p?.name ? <p className="text-sm font-bold text-white">{p.name}</p> : null}
          {p?.email ? (
            <a href={`mailto:${p.email}`} className={line}>
              <Mail className={cn("h-4 w-4 shrink-0", ACCENT)} aria-hidden /> <span className="truncate">{p.email}</span>
            </a>
          ) : null}
          {p?.phone ? (
            <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className={line}>
              <Phone className={cn("h-4 w-4 shrink-0", ACCENT)} aria-hidden /> {p.phone}
            </a>
          ) : null}
          {family.wrestlerCell ? (
            <a href={`tel:${family.wrestlerCell.replace(/[^\d+]/g, "")}`} className={line}>
              <Phone className="h-4 w-4 shrink-0 text-white/45" aria-hidden /> {family.wrestlerCell} <span className="text-xs text-white/40">wrestler</span>
            </a>
          ) : null}
          {!p ? <p className="text-sm text-white/45">No parent contact on file.</p> : null}
        </div>
      )}
    </section>
  )
}

export function RecruitFileView({ file, viewingAs = null }: { file: RecruitFile; viewingAs?: { userId: string; label: string } | null }) {
  const router = useRouter()
  const [logging, setLogging] = useState(false)
  const readOnly = Boolean(viewingAs)
  const name = file.row?.name ?? file.basic?.name ?? "Wrestler"
  const back = viewingAs ? `/my-recruits?as=${encodeURIComponent(viewingAs.userId)}` : "/my-recruits"
  return (
    <>
      {viewingAs ? (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-[#A3E635]/40 bg-[#15243B] px-4 py-2 text-sm text-white">
          <span>
            Viewing as <span className="font-bold">{viewingAs.label}</span> · read-only
          </span>
          <Link href="/admin/view-as-coach" className="font-semibold text-[#A3E635] underline">
            Pick another coach
          </Link>
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl px-4 py-5 text-white sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
            <a href={back} className="shrink-0 whitespace-nowrap font-semibold text-white/60 hover:text-[#D3B574]">
              My Recruits
            </a>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
            <span className="truncate font-bold text-white" aria-current="page">
              {name}
            </span>
          </nav>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-white/70">
            <Lock className="h-3 w-3" aria-hidden /> Private to {file.program ? `${file.program} staff` : "you"}
          </span>
        </div>

        <Header file={file} asUserId={viewingAs?.userId ?? null} />

        {file.row ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-4">
              <StageCard file={file} readOnly={readOnly} onLog={() => setLogging(true)} />
              <Notes athleteId={file.athleteId} initial={file.notes} readOnly={readOnly} program={file.program} />
            </div>
            <div className="min-w-0 space-y-4">
              <Timeline events={file.timeline} />
              <Family family={file.family} />
            </div>
          </div>
        ) : (
          <section className={cn(CARD, "mt-4")}>
            <p className="text-sm font-bold text-white">Not in your recruits</p>
            <p className="mt-1 text-sm text-white/60">Star this wrestler on the profile to start a file: stage, notes and activity for your staff.</p>
            <a href={`/view-profile?id=${file.athleteId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#D3B574] hover:underline">
              Open full profile <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </section>
        )}
      </div>
      {logging && file.row ? (
        <LogActivityDialog
          row={{ athleteId: file.athleteId, name }}
          onClose={() => setLogging(false)}
          onSaved={() => {
            setLogging(false)
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
