"use client"

import { useMemo, useState } from "react"

import { HardLink } from "@/components/hard-link"
import { countWords } from "@/lib/scholarships/word-count"

function wordCountLabel(wc: number): string {
  return `${wc} word${wc === 1 ? "" : "s"}`
}

const REFERENCE_ROLES = ["Coach", "Teacher", "Counselor", "Community member", "Other"] as const

function combineRelationship(selectVal: string, otherDetail: string): string {
  const o = otherDetail.trim()
  if (selectVal === "Other") return o ? `Other (${o})` : "Other"
  return selectVal
}

export function ScholarshipApplicationForm({
  slug,
  scholarshipName,
  applicationsCloseLabel,
}: {
  slug: string
  scholarshipName: string
  /** e.g. "May 31, 2026" */
  applicationsCloseLabel: string | null
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const [writtenStatement, setWrittenStatement] = useState("")
  const [wrestlingMoment, setWrestlingMoment] = useState("")
  const [parentNominating, setParentNominating] = useState(false)

  const [refRelSelect, setRefRelSelect] = useState("")
  const [refRelOther, setRefRelOther] = useState("")
  const [secRefRelSelect, setSecRefRelSelect] = useState("")
  const [secRefRelOther, setSecRefRelOther] = useState("")

  const wcMain = useMemo(() => countWords(writtenStatement), [writtenStatement])
  const wcMoment = useMemo(() => countWords(wrestlingMoment), [wrestlingMoment])
  const essayOk = wcMain >= 400 && wcMain <= 600
  const extraOk = wcMoment <= 200

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const refRel = combineRelationship(refRelSelect, refRelSelect === "Other" ? refRelOther : "")
    const secRel = combineRelationship(secRefRelSelect, secRefRelSelect === "Other" ? secRefRelOther : "")

    if (!refRelSelect || (refRelSelect === "Other" && !refRelOther.trim())) {
      setError("Choose the reference's relationship to the athlete.")
      setStatus("error")
      return
    }
    if (parentNominating) {
      if (!secRefRelSelect || (secRefRelSelect === "Other" && !secRefRelOther.trim())) {
        setError("Second reference: relationship is required.")
        setStatus("error")
        return
      }
    }

    if (!essayOk || !extraOk) {
      setError("Check word counts before submitting.")
      setStatus("error")
      return
    }

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
      nominator_known_duration: String(fd.get("nominator_known_duration") ?? ""),
      is_parent_nominating_own_child: parentNominating,
      written_statement: writtenStatement,
      wrestling_moment: wrestlingMoment.trim(),
      reference_name: String(fd.get("reference_name") ?? ""),
      reference_relationship: refRel,
      reference_email: String(fd.get("reference_email") ?? ""),
      reference_phone: String(fd.get("reference_phone") ?? ""),
      secondary_reference_name: parentNominating ? String(fd.get("secondary_reference_name") ?? "") : "",
      secondary_reference_relationship: parentNominating ? secRel : "",
      secondary_reference_email: parentNominating ? String(fd.get("secondary_reference_email") ?? "") : "",
      secondary_reference_phone: parentNominating ? String(fd.get("secondary_reference_phone") ?? "") : "",
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
      setParentNominating(false)
      setRefRelSelect("")
      setRefRelOther("")
      setSecRefRelSelect("")
      setSecRefRelOther("")
    } catch {
      setError("Network error.")
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-4 py-6 text-white">
        <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-emerald-200">
          Thank you
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/85">
          Your nomination has been received. Applications are reviewed blind — athlete names and schools are removed before scoring begins.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/75">
          You will hear from us by June 10, 2026.
        </p>
        <p className="mt-4 text-xs leading-relaxed text-white/45">
          We emailed the nominator address on file with your blind-review id and next steps.
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

  const deadlineLine = applicationsCloseLabel ? ` — Deadline ${applicationsCloseLabel}` : ""

  return (
    <div className="text-white">
      <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
        {scholarshipName.toUpperCase()}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        Application{deadlineLine}
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-8">
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
          <legend className={`${label} px-1 text-[#C8A94A]`}>Section 1 — About the athlete</legend>
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
          <legend className={`${label} px-1 text-[#C8A94A]`}>Section 2 — About you (the nominator)</legend>
          <div>
            <label className={label}>Your full name *</label>
            <input name="nominator_name" required className={field} autoComplete="name" />
          </div>
          <div>
            <label className={label}>Your relationship to this athlete *</label>
            <input name="nominator_relationship" required className={field} placeholder="Coach, teacher, …" />
          </div>
          <div>
            <label className={label}>How long have you known this athlete? *</label>
            <input name="nominator_known_duration" required className={field} placeholder="e.g. 4 seasons, since sixth grade" />
          </div>
          <div>
            <label className={label}>Your email *</label>
            <input name="nominator_email" type="email" required className={field} autoComplete="email" />
          </div>
          <div>
            <label className={label}>Your phone</label>
            <input name="nominator_phone" type="tel" className={field} />
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-black/15 px-3 py-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
              <input
                type="checkbox"
                checked={parentNominating}
                onChange={(e) => setParentNominating(e.target.checked)}
                className="mt-1"
              />
              <span>I am a parent nominating my own child.</span>
            </label>
            {parentNominating ? (
              <p className="mt-3 text-xs leading-relaxed text-[#C8A94A]/90">
                A second adult reference (below) is required — someone outside your immediate household who knows this athlete in wrestling,
                school, or the community.
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
          <legend className={`${label} px-1 text-[#C8A94A]`}>Section 3 — Your essay *</legend>
          <div>
            <label className={label}>The heart of this application</label>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              Describe a specific moment or period when this athlete faced genuine adversity — on or off the mat — and what their response
              revealed about their character. Use concrete examples. Tell us what you saw.
            </p>
            <textarea
              rows={10}
              required
              value={writtenStatement}
              onChange={(e) => setWrittenStatement(e.target.value)}
              className={`${field} resize-y`}
            />
            <p className={`mt-2 text-xs tabular-nums ${essayOk ? "text-emerald-400/90" : "text-white/45"}`}>
              {wordCountLabel(wcMain)} · required 400–600 words to submit
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
          <legend className={`${label} px-1 text-[#C8A94A]`}>Section 4 — Additional context (optional)</legend>
          <div>
            <label className={label}>Anything else the committee should know?</label>
            <p className="mt-1 text-xs text-white/45">Optional · max 200 words</p>
            <textarea rows={4} value={wrestlingMoment} onChange={(e) => setWrestlingMoment(e.target.value)} className={`${field} resize-y`} />
            <p className={`mt-2 text-xs tabular-nums ${extraOk ? "text-white/45" : "text-amber-400/90"}`}>
              {wordCountLabel(wcMoment)} · max 200
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
          <legend className={`${label} px-1 text-[#C8A94A]`}>Section 5 — Supporting reference</legend>
          <p className="text-xs leading-relaxed text-white/45">
            References will only be contacted for finalist applications.
          </p>
          <div>
            <label className={label}>Reference full name *</label>
            <input name="reference_name" required className={field} />
          </div>
          <div>
            <label className={label}>Relationship to athlete *</label>
            <select
              required
              value={refRelSelect}
              onChange={(e) => setRefRelSelect(e.target.value)}
              className={field}
            >
              <option value="">Select…</option>
              {REFERENCE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {refRelSelect === "Other" ? (
              <input
                value={refRelOther}
                onChange={(e) => setRefRelOther(e.target.value)}
                placeholder="Describe relationship"
                required
                className={`${field} mt-2`}
              />
            ) : null}
          </div>
          <div>
            <label className={label}>Reference email *</label>
            <input name="reference_email" type="email" required className={field} />
          </div>
          <div>
            <label className={label}>Reference phone</label>
            <input name="reference_phone" type="tel" className={field} />
          </div>

          {parentNominating ? (
            <div className="mt-4 space-y-4 border-t border-white/[0.07] pt-6">
              <p className={`${label} text-[#C8A94A]`}>Second reference (required)</p>
              <div>
                <label className={label}>Reference full name *</label>
                <input name="secondary_reference_name" required={parentNominating} className={field} />
              </div>
              <div>
                <label className={label}>Relationship to athlete *</label>
                <select
                  required={parentNominating}
                  value={secRefRelSelect}
                  onChange={(e) => setSecRefRelSelect(e.target.value)}
                  className={field}
                >
                  <option value="">Select…</option>
                  {REFERENCE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {secRefRelSelect === "Other" ? (
                  <input
                    value={secRefRelOther}
                    onChange={(e) => setSecRefRelOther(e.target.value)}
                    placeholder="Describe relationship"
                    required={parentNominating}
                    className={`${field} mt-2`}
                  />
                ) : null}
              </div>
              <div>
                <label className={label}>Reference email *</label>
                <input name="secondary_reference_email" type="email" required={parentNominating} className={field} />
              </div>
              <div>
                <label className={label}>Reference phone</label>
                <input name="secondary_reference_phone" type="tel" className={field} />
              </div>
            </div>
          ) : null}
        </fieldset>

        {error ? (
          <p className="rounded-lg border border-red-400/35 bg-red-950/30 px-4 py-3 text-sm text-red-100/95">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting" || !essayOk || !extraOk}
          className="font-[family-name:var(--font-fundraising-display)] w-full min-h-[52px] rounded-sm bg-[#CC0000] px-6 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000] disabled:opacity-50"
        >
          {status === "submitting" ? "Submitting…" : "Submit application →"}
        </button>
      </form>
    </div>
  )
}
