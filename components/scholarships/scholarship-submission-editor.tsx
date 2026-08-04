"use client"

import { useState } from "react"

type EditableSubmission = {
  athlete_name: string
  athlete_school: string
  athlete_grad_year: number | null
  athlete_weight_class: string | null
  athlete_email: string | null
  athlete_phone: string | null
  nominator_name: string
  nominator_relationship: string
  nominator_email: string
  nominator_phone: string | null
  nominator_known_duration: string | null
  submission_format: string | null
  written_statement: string
  video_url: string | null
  video_blob_url: string | null
}

export function ScholarshipSubmissionEditor({
  applicationId,
  token,
  initial,
}: {
  applicationId: string
  token: string
  initial: EditableSubmission
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("saving")
    setError(null)

    const form = event.currentTarget
    const fd = new FormData(form)
    const payload = Object.fromEntries(
      [
        "athlete_name",
        "athlete_school",
        "athlete_grad_year",
        "athlete_weight_class",
        "athlete_email",
        "athlete_phone",
        "nominator_name",
        "nominator_relationship",
        "nominator_phone",
        "nominator_known_duration",
        "written_statement",
        "video_url",
      ].map((name) => [name, String(fd.get(name) ?? "")]),
    )

    try {
      const response = await fetch(`/api/scholarships/submissions/${encodeURIComponent(applicationId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-scholarship-edit-token": token,
        },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setStatus("error")
        setError(data.error || "Could not save your changes.")
        return
      }
      setStatus("saved")
    } catch {
      setStatus("error")
      setError("Network error. Your text is still on this page—please try Save changes again.")
    }
  }

  const field =
    "mt-2 w-full rounded-lg border border-white/20 bg-[#061224] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/45"
  const label = "block text-xs font-semibold uppercase tracking-wide text-white/65"

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <div className="rounded-xl border border-[#C8A94A]/35 bg-[#C8A94A]/8 px-4 py-3 text-sm leading-relaxed text-white/80">
        This private link is the key to this nomination. Keep it private. Changes are saved only when you press Save changes.
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Athlete name
          <input name="athlete_name" required defaultValue={initial.athlete_name} className={field} />
        </label>
        <label className={label}>
          School, if known
          <input name="athlete_school" defaultValue={initial.athlete_school} className={field} />
        </label>
        <label className={label}>
          Graduation year, if known
          <input
            name="athlete_grad_year"
            inputMode="numeric"
            defaultValue={initial.athlete_grad_year ?? ""}
            className={field}
          />
        </label>
        <label className={label}>
          Weight class, if known
          <input name="athlete_weight_class" defaultValue={initial.athlete_weight_class ?? ""} className={field} />
        </label>
        <label className={label}>
          Athlete or parent email, if known
          <input name="athlete_email" type="email" defaultValue={initial.athlete_email ?? ""} className={field} />
        </label>
        <label className={label}>
          Athlete or parent phone, if known
          <input name="athlete_phone" defaultValue={initial.athlete_phone ?? ""} className={field} />
        </label>
      </div>

      <div className="border-t border-white/12 pt-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={label}>
            Your name
            <input name="nominator_name" required defaultValue={initial.nominator_name} className={field} />
          </label>
          <label className={label}>
            Relationship to athlete
            <input
              name="nominator_relationship"
              required
              defaultValue={initial.nominator_relationship}
              className={field}
            />
          </label>
          <label className={label}>
            How long have you known the athlete?
            <input name="nominator_known_duration" defaultValue={initial.nominator_known_duration ?? ""} className={field} />
          </label>
          <label className={label}>
            Your phone
            <input name="nominator_phone" defaultValue={initial.nominator_phone ?? ""} className={field} />
          </label>
        </div>
        <p className="mt-4 text-xs text-white/50">
          Submitted by {initial.nominator_email}. The submission owner email cannot be changed here.
        </p>
      </div>

      {initial.submission_format === "video" ? (
        <div>
          <label className={label}>
            Video link
            <input name="video_url" type="url" defaultValue={initial.video_url ?? ""} className={field} />
          </label>
          {initial.video_blob_url ? (
            <p className="mt-2 text-xs text-white/50">Your uploaded video is already attached and will remain with the nomination.</p>
          ) : null}
        </div>
      ) : (
        <label className={label}>
          Nomination
          <textarea
            name="written_statement"
            required
            defaultValue={initial.written_statement}
            rows={16}
            className={`${field} min-h-[22rem] resize-y leading-relaxed`}
          />
        </label>
      )}

      {status === "error" && error ? (
        <div className="rounded-lg border border-red-400/35 bg-red-950/35 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}
      {status === "saved" ? (
        <div className="rounded-lg border border-emerald-400/35 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
          Changes saved successfully.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#CC0000] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-[#e00000] disabled:cursor-wait disabled:opacity-65"
      >
        {status === "saving" ? "Saving…" : "Save changes"}
      </button>
    </form>
  )
}
