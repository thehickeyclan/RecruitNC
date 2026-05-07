"use client"

import { useMemo, useState } from "react"

import { HardLink } from "@/components/hard-link"
import { countWords } from "@/lib/scholarships/word-count"

function wordCountLabel(wc: number): string {
  return `${wc} word${wc === 1 ? "" : "s"}`
}

export function ScholarshipApplicationForm({
  slug,
  scholarshipName,
}: {
  slug: string
  scholarshipName: string
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const [writtenStatement, setWrittenStatement] = useState("")
  const [wrestlingMoment, setWrestlingMoment] = useState("")

  const wcMain = useMemo(() => countWords(writtenStatement), [writtenStatement])
  const wcMoment = useMemo(() => countWords(wrestlingMoment), [wrestlingMoment])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setStatus("submitting")

    const form = e.currentTarget
    const fd = new FormData(form)

    const payload = {
      _hp: String(fd.get("_hp") ?? ""),
      athlete_name: String(fd.get("athlete_name") ?? ""),
      athlete_school: String(fd.get("athlete_school") ?? ""),
      athlete_grad_year: Number(fd.get("athlete_grad_year")),
      athlete_weight_class: String(fd.get("athlete_weight_class") ?? ""),
      athlete_email: String(fd.get("athlete_email") ?? ""),
      athlete_phone: String(fd.get("athlete_phone") ?? ""),
      nominator_name: String(fd.get("nominator_name") ?? ""),
      nominator_relationship: String(fd.get("nominator_relationship") ?? ""),
      nominator_email: String(fd.get("nominator_email") ?? ""),
      nominator_phone: String(fd.get("nominator_phone") ?? ""),
      written_statement: writtenStatement,
      wrestling_moment: wrestlingMoment.trim(),
      reference_name: String(fd.get("reference_name") ?? ""),
      reference_relationship: String(fd.get("reference_relationship") ?? ""),
      reference_email: String(fd.get("reference_email") ?? ""),
      reference_phone: String(fd.get("reference_phone") ?? ""),
    }

    try {
      const res = await fetch(`/api/scholarships/${encodeURIComponent(slug)}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not submit.")
        setStatus("error")
        return
      }
      setStatus("done")
      form.reset()
      setWrittenStatement("")
      setWrestlingMoment("")
    } catch {
      setError("Network error.")
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-4 py-6 text-white">
        <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-emerald-200">
          Application received
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          Thank you. We emailed the nominator address on file with a confirmation and next steps.
        </p>
        <HardLink
          href={`/fundraising/scholarships/${slug}`}
          className="mt-6 inline-flex text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
        >
          ← Back to {scholarshipName}
        </HardLink>
      </div>
    )
  }

  const field =
    "mt-2 w-full rounded-lg border border-white/18 bg-[#061224] px-3 py-2.5 text-sm text-white/90 placeholder:text-white/35 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/45"
  const label = "block text-xs font-semibold uppercase tracking-wide text-white/65"

  return (
    <form onSubmit={onSubmit} className="space-y-8 text-white">
      <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
        <legend className={`${label} px-1 text-[#C8A94A]`}>About the athlete</legend>
        <div>
          <label className={label}>Full name *</label>
          <input name="athlete_name" required className={field} autoComplete="name" />
        </div>
        <div>
          <label className={label}>School *</label>
          <input name="athlete_school" required className={field} />
        </div>
        <div>
          <label className={label}>Graduation year *</label>
          <input name="athlete_grad_year" type="number" required min={2024} max={2040} className={field} />
        </div>
        <div>
          <label className={label}>Weight class</label>
          <input name="athlete_weight_class" className={field} />
        </div>
        <div>
          <label className={label}>Email *</label>
          <input name="athlete_email" type="email" required className={field} autoComplete="email" />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input name="athlete_phone" type="tel" className={field} autoComplete="tel" />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
        <legend className={`${label} px-1 text-[#C8A94A]`}>About you (the nominator)</legend>
        <div>
          <label className={label}>Your full name *</label>
          <input name="nominator_name" required className={field} autoComplete="name" />
        </div>
        <div>
          <label className={label}>Relationship to the athlete *</label>
          <input name="nominator_relationship" required className={field} placeholder="Coach, parent, …" />
        </div>
        <div>
          <label className={label}>Your email *</label>
          <input name="nominator_email" type="email" required className={field} autoComplete="email" />
        </div>
        <div>
          <label className={label}>Your phone</label>
          <input name="nominator_phone" type="tel" className={field} />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
        <legend className={`${label} px-1 text-[#C8A94A]`}>Your statement</legend>
        <div>
          <label className={label}>Written statement * (300–500 words)</label>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Tell us why this athlete embodies the standard — resilience, character, and the courage to continue when things
            are difficult.
          </p>
          <textarea
            name="written_statement_outer"
            rows={8}
            required
            value={writtenStatement}
            onChange={(e) => setWrittenStatement(e.target.value)}
            className={`${field} resize-y`}
          />
          <p className={`mt-2 text-xs tabular-nums ${wcMain >= 300 && wcMain <= 500 ? "text-emerald-400/90" : "text-white/45"}`}>
            {wordCountLabel(wcMain)} · aim for 300–500
          </p>
        </div>
        <div>
          <label className={label}>A wrestling moment (optional, max 200 words)</label>
          <textarea
            rows={4}
            value={wrestlingMoment}
            onChange={(e) => setWrestlingMoment(e.target.value)}
            className={`${field} resize-y`}
          />
          <p className={`mt-2 text-xs tabular-nums ${wcMoment <= 200 ? "text-white/45" : "text-amber-400/90"}`}>
            {wordCountLabel(wcMoment)} · max 200
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
        <legend className={`${label} px-1 text-[#C8A94A]`}>Supporting reference</legend>
        <div>
          <label className={label}>Reference name</label>
          <input name="reference_name" className={field} />
        </div>
        <div>
          <label className={label}>Relationship</label>
          <input name="reference_relationship" className={field} placeholder="Coach, teacher, …" />
        </div>
        <div>
          <label className={label}>Reference email</label>
          <input name="reference_email" type="email" className={field} />
        </div>
        <div>
          <label className={label}>Reference phone</label>
          <input name="reference_phone" type="tel" className={field} />
        </div>
      </fieldset>

      {error ? (
        <p className="rounded-lg border border-red-400/35 bg-red-950/30 px-4 py-3 text-sm text-red-100/95">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="font-[family-name:var(--font-fundraising-display)] w-full min-h-[52px] rounded-sm bg-[#CC0000] px-6 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000] disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit application"}
      </button>
    </form>
  )
}
