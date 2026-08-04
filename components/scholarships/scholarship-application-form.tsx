"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { upload } from "@vercel/blob/client"

import { HardLink } from "@/components/hard-link"
import { parseScholarshipVideoPageUrl } from "@/lib/scholarships/scholarship-video-url"
import { countWords } from "@/lib/scholarships/word-count"
import { CADEN_NOMINATION_CONFIDENTIALITY } from "@/lib/scholarships/caden-perry-content"

const SCHOLARSHIP_DRAFT_PREFIX = "nc-united-scholarship-draft:"

function wordCountLabel(wc: number): string {
  return `${wc} word${wc === 1 ? "" : "s"}`
}

function essayStatusHint(wc: number): string {
  if (wc === 0) return "A short, specific nomination is enough."
  return "Ready to submit."
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
  const formRef = useRef<HTMLFormElement>(null)
  const draftKey = `${SCHOLARSHIP_DRAFT_PREFIX}${slug}`
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const [writtenStatement, setWrittenStatement] = useState("")
  const [submissionKind, setSubmissionKind] = useState<"written" | "video">("written")
  const [videoDelivery, setVideoDelivery] = useState<"youtube" | "upload">("youtube")
  const [videoLink, setVideoLink] = useState("")
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const wcMain = useMemo(() => countWords(writtenStatement), [writtenStatement])
  const essayOk = wcMain > 0

  const videoLinkParsed = useMemo(
    () => (videoLink.trim() ? parseScholarshipVideoPageUrl(videoLink) : null),
    [videoLink],
  )
  const videoUrlOk = videoDelivery === "youtube" && videoLinkParsed?.ok === true
  const videoUploadOk = videoDelivery === "upload" && Boolean(uploadedVideoUrl?.trim())
  const videoOk = submissionKind === "video" && (videoUrlOk || videoUploadOk)

  const canSubmit = submissionKind === "written" ? essayOk : videoOk

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey)
      if (!saved || !formRef.current) return
      const values = JSON.parse(saved) as Record<string, string>
      for (const [name, value] of Object.entries(values)) {
        const el = formRef.current.elements.namedItem(name)
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = value
      }
      if (values.written_statement_ui) setWrittenStatement(values.written_statement_ui)
    } catch {
      // A malformed or unavailable local draft must never block the form.
    }
  }, [draftKey])

  function saveDraft(form: HTMLFormElement) {
    try {
      const values: Record<string, string> = {}
      for (const [name, value] of new FormData(form).entries()) {
        if (typeof value === "string" && name !== "_hp") values[name] = value
      }
      window.localStorage.setItem(draftKey, JSON.stringify(values))
    } catch {
      // Submission remains available when browser storage is unavailable.
    }
  }

  async function runBlobUpload() {
    setUploadErr(null)
    if (!uploadFile) {
      setUploadErr("Choose a video file first.")
      return
    }
    setUploadBusy(true)
    try {
      const result = await upload(uploadFile.name, uploadFile, {
        access: "public",
        handleUploadUrl: "/api/scholarships/video-upload",
        clientPayload: JSON.stringify({ scholarshipSlug: slug }),
      })
      setUploadedVideoUrl(result.url)
      setUploadErr(null)
    } catch (e) {
      setUploadedVideoUrl(null)
      setUploadErr(e instanceof Error ? e.message : "Upload failed.")
    } finally {
      setUploadBusy(false)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!canSubmit) {
      setError(
        submissionKind === "video"
          ? "Add a valid YouTube/Vimeo link, or upload a video file, before submitting."
          : "Add a short written nomination before submitting.",
      )
      setStatus("error")
      return
    }

    if (submissionKind === "video" && videoDelivery === "youtube" && videoLink.trim() && videoLinkParsed && !videoLinkParsed.ok) {
      setError(videoLinkParsed.error)
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
      athlete_grad_year: String(fd.get("athlete_grad_year") ?? ""),
      athlete_weight_class: String(fd.get("athlete_weight_class") ?? ""),
      athlete_email: String(fd.get("athlete_email") ?? ""),
      athlete_phone: String(fd.get("athlete_phone") ?? ""),
      nominator_name: String(fd.get("nominator_name") ?? ""),
      nominator_relationship: String(fd.get("nominator_relationship") ?? ""),
      nominator_email: String(fd.get("nominator_email") ?? ""),
      nominator_phone: String(fd.get("nominator_phone") ?? ""),
      nominator_known_duration: String(fd.get("nominator_known_duration") ?? ""),
      submission_format: submissionKind,
      written_statement: submissionKind === "written" ? writtenStatement : "",
      video_url: submissionKind === "video" && videoDelivery === "youtube" ? videoLink.trim() : "",
      video_blob_url: submissionKind === "video" && videoDelivery === "upload" ? (uploadedVideoUrl ?? "").trim() : "",
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
      setSubmissionKind("written")
      setVideoDelivery("youtube")
      setVideoLink("")
      setUploadedVideoUrl(null)
      setUploadFile(null)
      setUploadErr(null)
      try {
        window.localStorage.removeItem(draftKey)
      } catch {
        // Successful submission is more important than clearing local storage.
      }
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
          NC United will contact you if follow-up is needed and will notify the selected recipient after review.
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

      <form ref={formRef} onSubmit={onSubmit} onInput={(event) => saveDraft(event.currentTarget)} className="mt-10 space-y-8">
        <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
          <legend className={`${label} px-1 text-[#C8A94A]`}>Section 1 — About the athlete</legend>
          <p className="text-xs leading-relaxed text-white/50">
            Only the athlete&apos;s name is required. Share anything else you know and NC United will match the nomination to information already on file.
          </p>
          <div>
            <label className={label}>Full name *</label>
            <input name="athlete_name" required className={field} autoComplete="name" />
          </div>
          <div>
            <label className={label}>School (if known)</label>
            <input name="athlete_school" className={field} />
          </div>
          <div>
            <label className={label}>Graduation year (if known)</label>
            <input name="athlete_grad_year" type="number" min={2024} max={2040} className={field} />
          </div>
          <div>
            <label className={label}>Weight class (if known)</label>
            <input name="athlete_weight_class" className={field} />
          </div>
          <div>
            <label className={label}>Athlete or parent email (if known)</label>
            <input name="athlete_email" type="email" className={field} autoComplete="email" />
          </div>
          <div>
            <label className={label}>Athlete or parent phone (if known)</label>
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
            <label className={label}>How long have you known this athlete? (optional)</label>
            <input name="nominator_known_duration" className={field} placeholder="e.g. 4 seasons, since sixth grade" />
          </div>
          <div>
            <label className={label}>Your email *</label>
            <input name="nominator_email" type="email" required className={field} autoComplete="email" />
          </div>
          <div>
            <label className={label}>Your phone</label>
            <input name="nominator_phone" type="tel" className={field} />
          </div>
          <p className="rounded-lg border border-[#C8A94A]/20 bg-[#C8A94A]/5 px-3 py-3 text-xs leading-relaxed text-white/65">
            You are the reference for this nomination. We may contact you only if we need help confirming the athlete or their story.
          </p>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-white/10 bg-[#0B2545]/35 p-4 sm:p-5">
          <legend className={`${label} px-1 text-[#C8A94A]`}>Section 3 — Short written nomination or video *</legend>
          <p className="text-xs leading-relaxed text-white/50">
            Pick <strong className="text-white/70">one</strong>: a short written nomination or a 1–2 minute video. A few specific sentences are
            enough, but a longer story is welcome too.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                submissionKind === "written" ? "border-[#C8A94A]/55 bg-[#C8A94A]/10" : "border-white/12 bg-black/10"
              }`}
            >
              <input
                type="radio"
                name="submission_kind_ui"
                className="accent-[#C8A94A]"
                checked={submissionKind === "written"}
                onChange={() => setSubmissionKind("written")}
              />
              Written nomination
            </label>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                submissionKind === "video" ? "border-[#C8A94A]/55 bg-[#C8A94A]/10" : "border-white/12 bg-black/10"
              }`}
            >
              <input
                type="radio"
                name="submission_kind_ui"
                className="accent-[#C8A94A]"
                checked={submissionKind === "video"}
                onChange={() => setSubmissionKind("video")}
              />
              Video (1–2 minutes)
            </label>
          </div>

          {submissionKind === "written" ? (
            <div>
              <label className={label}>The heart of this application</label>
              <p className="mt-2 text-xs leading-relaxed text-white/50">
                Describe a specific moment or period when this athlete faced genuine adversity — on or off the mat — and what their response
                revealed about their character. Use concrete examples. Tell us what you saw.
              </p>
              <textarea
                name="written_statement_ui"
                rows={10}
                required
                value={writtenStatement}
                onChange={(e) => setWrittenStatement(e.target.value)}
                className={`${field} resize-y`}
              />
              <p className={`mt-2 text-xs tabular-nums leading-relaxed ${essayOk ? "text-emerald-400/90" : "text-white/45"}`}>
                <span className="font-medium text-white/55">{wordCountLabel(wcMain)}</span>
                <span className="text-white/35"> · </span>
                {essayStatusHint(wcMain)}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className={`${label} text-white/75`}>Same prompt as the written version</p>
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  Describe a specific moment or period when this athlete faced genuine adversity — on or off the mat — and what their response
                  revealed about their character. Use concrete examples. Say what you saw.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    videoDelivery === "youtube" ? "border-[#C8A94A]/45 bg-[#C8A94A]/8" : "border-white/12"
                  }`}
                >
                  <input
                    type="radio"
                    className="accent-[#C8A94A]"
                    checked={videoDelivery === "youtube"}
                    onChange={() => {
                      setVideoDelivery("youtube")
                      setUploadedVideoUrl(null)
                      setUploadFile(null)
                      setUploadErr(null)
                    }}
                  />
                  YouTube or Vimeo link (unlisted is OK)
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    videoDelivery === "upload" ? "border-[#C8A94A]/45 bg-[#C8A94A]/8" : "border-white/12"
                  }`}
                >
                  <input
                    type="radio"
                    className="accent-[#C8A94A]"
                    checked={videoDelivery === "upload"}
                    onChange={() => {
                      setVideoDelivery("upload")
                      setVideoLink("")
                      setUploadErr(null)
                    }}
                  />
                  Upload MP4, WebM, or MOV
                </label>
              </div>

              {videoDelivery === "youtube" ? (
                <div>
                  <label className={label}>Video URL *</label>
                  <input
                    type="url"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/… or Vimeo"
                    className={field}
                  />
                  {videoLink.trim() && videoLinkParsed && !videoLinkParsed.ok ? (
                    <p className="mt-2 text-xs text-amber-400/90">{videoLinkParsed.error}</p>
                  ) : videoUrlOk ? (
                    <p className="mt-2 text-xs text-emerald-400/90">Link looks valid.</p>
                  ) : (
                    <p className="mt-2 text-xs text-white/45">Paste a full https link.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-white/12 bg-black/15 p-4">
                  <label className={label}>Video file *</label>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                    Large files upload directly to secure cloud storage. Upload requires the Vercel Blob token on the server (see deployment
                    docs). Maximum size about 450 MB.
                  </p>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
                    className={`${field} mt-2`}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      setUploadFile(f)
                      setUploadedVideoUrl(null)
                      setUploadErr(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void runBlobUpload()}
                    disabled={uploadBusy || !uploadFile}
                    className="mt-3 w-full rounded-lg border border-[#C8A94A]/45 bg-[#C8A94A]/15 px-4 py-2.5 text-sm font-semibold text-[#f5e6b8] hover:bg-[#C8A94A]/25 disabled:opacity-45 sm:w-auto"
                  >
                    {uploadBusy ? "Uploading…" : uploadedVideoUrl ? "Upload again" : "Upload video"}
                  </button>
                  {uploadErr ? <p className="mt-2 text-xs text-amber-400/90">{uploadErr}</p> : null}
                  {uploadedVideoUrl ? (
                    <p className="mt-3 break-all text-xs text-emerald-400/90">
                      Uploaded:{" "}
                      <a href={uploadedVideoUrl} className="underline hover:text-emerald-200" target="_blank" rel="noopener noreferrer">
                        open file
                      </a>
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </fieldset>

        <p className="rounded-lg border border-[#C8A94A]/25 bg-[#C8A94A]/5 px-4 py-3 text-xs leading-relaxed text-white/70">
          <strong className="text-white">Your nomination is confidential.</strong> {CADEN_NOMINATION_CONFIDENTIALITY}
        </p>

        {error ? (
          <p className="rounded-lg border border-red-400/35 bg-red-950/30 px-4 py-3 text-sm text-red-100/95">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting" || !canSubmit}
          className="font-[family-name:var(--font-fundraising-display)] w-full min-h-[52px] rounded-sm bg-[#CC0000] px-6 text-sm font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_14px_44px_-10px_rgba(204,0,0,0.55)] hover:bg-[#a80000] disabled:opacity-50"
        >
          {status === "submitting" ? "Submitting…" : "Submit application →"}
        </button>
      </form>
    </div>
  )
}
