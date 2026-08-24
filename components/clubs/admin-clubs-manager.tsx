"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ExternalLink, Loader2, MapPin, RefreshCw, Search, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ClubSubmissionRow, programSummary } from "@/lib/clubs/club-submissions"

type EditableSubmission = ClubSubmissionRow & {
  latDraft: string
  lngDraft: string
  adminNotesDraft: string
}

function statusClass(status: ClubSubmissionRow["status"]) {
  switch (status) {
    case "approved":
      return "border-emerald-400/40 bg-emerald-950/50 text-emerald-100"
    case "declined":
      return "border-red-400/40 bg-red-950/50 text-red-100"
    case "needs_info":
      return "border-amber-300/40 bg-amber-950/40 text-amber-100"
    default:
      return "border-[#D7B968]/40 bg-[#D7B968]/15 text-[#F5D985]"
  }
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

export function AdminClubsManager() {
  const [submissions, setSubmissions] = useState<EditableSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("pending")
  const [search, setSearch] = useState("")

  async function loadSubmissions() {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/admin/clubs/submissions", { credentials: "include" })
    const data = await response.json().catch(() => ({}))
    setLoading(false)

    if (!response.ok) {
      setError(data.error ?? "Unable to load club submissions.")
      return
    }

    setSubmissions(
      ((data.submissions ?? []) as ClubSubmissionRow[]).map((submission) => ({
        ...submission,
        latDraft: submission.latitude == null ? "" : String(submission.latitude),
        lngDraft: submission.longitude == null ? "" : String(submission.longitude),
        adminNotesDraft: submission.admin_notes ?? "",
      })),
    )
  }

  useEffect(() => {
    void loadSubmissions()
  }, [])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return submissions.filter((submission) => {
      if (filter !== "all" && submission.status !== filter) return false
      if (!term) return true
      return [
        submission.club_name,
        submission.address,
        submission.city,
        submission.submitted_by_name,
        submission.submitted_by_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [filter, search, submissions])

  const stats = useMemo(() => {
    return {
      pending: submissions.filter((submission) => submission.status === "pending").length,
      needsInfo: submissions.filter((submission) => submission.status === "needs_info").length,
      approved: submissions.filter((submission) => submission.status === "approved").length,
      declined: submissions.filter((submission) => submission.status === "declined").length,
    }
  }, [submissions])

  function updateDraft(id: string, updates: Partial<EditableSubmission>) {
    setSubmissions((current) =>
      current.map((submission) => (submission.id === id ? { ...submission, ...updates } : submission)),
    )
  }

  async function runAction(submission: EditableSubmission, action: "save" | "approve" | "decline" | "needs_info") {
    setSavingId(submission.id)
    setError(null)
    const response = await fetch(`/api/admin/clubs/submissions/${submission.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        latitude: submission.latDraft,
        longitude: submission.lngDraft,
        adminNotes: submission.adminNotesDraft,
      }),
    })
    const data = await response.json().catch(() => ({}))
    setSavingId(null)

    if (!response.ok) {
      setError(data.error ?? "Unable to update club submission.")
      return
    }

    const updated = data.submission as ClubSubmissionRow
    updateDraft(submission.id, {
      ...updated,
      latDraft: updated.latitude == null ? "" : String(updated.latitude),
      lngDraft: updated.longitude == null ? "" : String(updated.longitude),
      adminNotesDraft: updated.admin_notes ?? "",
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Pending", stats.pending, "pending"],
          ["Needs info", stats.needsInfo, "needs_info"],
          ["Approved", stats.approved, "approved"],
          ["Declined", stats.declined, "declined"],
        ].map(([label, count, key]) => (
          <button
            key={String(key)}
            type="button"
            onClick={() => setFilter(String(key))}
            className={`rounded-sm border p-4 text-left transition ${
              filter === key ? "border-[#D7B968] bg-[#D7B968]/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">{label}</p>
            <p className="mt-2 text-3xl font-black text-white">{count}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-sm border border-white/10 bg-[#061427]/90 p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search club, city, submitter…"
            className="border-white/15 bg-[#020b18] pl-9 text-white"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setFilter("all")}
          className="border-white/15 bg-transparent text-white hover:bg-white/10"
        >
          All submissions
        </Button>
        <Button type="button" onClick={loadSubmissions} className="bg-[#D7B968] text-[#061427] hover:bg-[#e7ca78]">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-sm border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-sm border border-white/10 bg-[#061427]/90 p-10 text-center text-white/60">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#D7B968]" />
          Loading club submissions…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-sm border border-white/10 bg-[#061427]/90 p-10 text-center text-white/60">
          No club submissions match this view.
        </div>
      ) : (
        <div className="grid gap-5">
          {visible.map((submission) => {
            const saving = savingId === submission.id
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [submission.address, submission.city, submission.state, submission.zip_code].filter(Boolean).join(" "),
            )}`
            return (
              <article key={submission.id} className="rounded-sm border border-white/10 bg-[#061427]/95 p-5 shadow-2xl shadow-black/25">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black text-white">{submission.club_name}</h2>
                      <Badge className={statusClass(submission.status)}>{submission.status.replace("_", " ")}</Badge>
                      {submission.approved_club_id ? (
                        <Badge className="border-emerald-400/40 bg-emerald-950/40 text-emerald-100">
                          Club #{submission.approved_club_id}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-white/55">
                      Submitted by {submission.submitted_by_name || "RecruitNC user"} · {submission.submitted_by_email || "no email"} ·{" "}
                      {formatDate(submission.created_at)}
                    </p>
                    <p className="mt-3 flex items-start gap-2 text-white/80">
                      <MapPin className="mt-1 h-4 w-4 flex-none text-[#D7B968]" />
                      <span>
                        {submission.address}
                        {[submission.city, submission.state, submission.zip_code].filter(Boolean).length ? (
                          <> · {[submission.city, submission.state, submission.zip_code].filter(Boolean).join(" ")}</>
                        ) : null}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/10"
                    >
                      Maps <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </a>
                    {submission.website ? (
                      <a
                        href={submission.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/10"
                      >
                        Website <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-sm border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D7B968]">Programs</p>
                    <p className="mt-2 text-white/80">{programSummary(submission) || "No program types selected"}</p>
                    <div className="mt-4 grid gap-3 text-sm text-white/65 sm:grid-cols-2">
                      <p><span className="text-white/40">Contact:</span> {submission.contact_name || "—"}</p>
                      <p><span className="text-white/40">Phone:</span> {submission.contact_phone || "—"}</p>
                      <p><span className="text-white/40">Email:</span> {submission.contact_email || "—"}</p>
                    </div>
                    {submission.notes ? (
                      <p className="mt-4 whitespace-pre-wrap rounded-sm border border-white/10 bg-[#020b18] p-3 text-sm leading-6 text-white/70">
                        {submission.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-sm border border-white/10 bg-[#020b18] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D7B968]">Map approval</p>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                      Add coordinates before approving when possible. Approved clubs with no coordinates stay in the
                      database, but will not light up on the public map yet.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-white/70">Latitude</Label>
                        <Input
                          value={submission.latDraft}
                          onChange={(event) => updateDraft(submission.id, { latDraft: event.target.value })}
                          className="mt-2 border-white/15 bg-[#061427] text-white"
                          placeholder="35.7796"
                        />
                      </div>
                      <div>
                        <Label className="text-white/70">Longitude</Label>
                        <Input
                          value={submission.lngDraft}
                          onChange={(event) => updateDraft(submission.id, { lngDraft: event.target.value })}
                          className="mt-2 border-white/15 bg-[#061427] text-white"
                          placeholder="-78.6382"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <Label className="text-white/70">Admin notes</Label>
                      <Textarea
                        value={submission.adminNotesDraft}
                        onChange={(event) => updateDraft(submission.id, { adminNotesDraft: event.target.value })}
                        className="mt-2 min-h-20 border-white/15 bg-[#061427] text-white"
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={() => runAction(submission, "approve")}
                        className="bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Approve to map
                      </Button>
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={() => runAction(submission, "needs_info")}
                        className="bg-[#D7B968] text-[#061427] hover:bg-[#e7ca78]"
                      >
                        Needs info
                      </Button>
                      <Button
                        type="button"
                        disabled={saving}
                        onClick={() => runAction(submission, "decline")}
                        className="bg-[#CC0000] text-white hover:bg-[#a80000]"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                      <Button
                        type="button"
                        disabled={saving}
                        variant="outline"
                        onClick={() => runAction(submission, "save")}
                        className="border-white/15 bg-transparent text-white hover:bg-white/10"
                      >
                        Save notes
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
