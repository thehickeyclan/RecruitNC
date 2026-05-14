"use client"

import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import { Loader2, Trash2, Video } from "lucide-react"

type Props = {
  fundraisingSlug: string
  athleteFirstName: string
  hasFundraisingProfile: boolean
  canEdit: boolean
  isRecruitNcAdmin: boolean
  checkoutLive: boolean
  fundraisingVideoPath: string | null
  fundraisingThumbPath: string | null
  thankyouVideoPath: string | null
  thankyouThumbPath: string | null
}

const ACCEPT = "video/mp4,video/webm,video/quicktime,video/mov,.mp4,.webm,.mov"

async function thumbnailBlobFromVideoFile(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error("video load"))
      setTimeout(() => reject(new Error("timeout")), 15_000)
    })
    video.currentTime = Math.min(0.25, (video.duration || 1) * 0.05)
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      setTimeout(() => resolve(), 3_000)
    })
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return null
    const canvas = document.createElement("canvas")
    const maxW = 640
    const scale = w > maxW ? maxW / w : 1
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82))
    return blob
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function FundraisingAthleteVideosSection({
  fundraisingSlug,
  athleteFirstName,
  hasFundraisingProfile,
  canEdit,
  isRecruitNcAdmin,
  checkoutLive,
  fundraisingVideoPath,
  fundraisingThumbPath,
  thankyouVideoPath,
  thankyouThumbPath,
}: Props) {
  const router = useRouter()
  const fundInputRef = useRef<HTMLInputElement>(null)
  const tyInputRef = useRef<HTMLInputElement>(null)
  const [busyKind, setBusyKind] = useState<"fundraising" | "thankyou" | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const familyMayEdit = checkoutLive || isRecruitNcAdmin
  if (!canEdit || !familyMayEdit) return null
  if (!hasFundraisingProfile) return null

  const slugEnc = encodeURIComponent(fundraisingSlug)
  const api = `/api/fundraising/athletes/${slugEnc}/video`

  const upload = useCallback(
    async (kind: "fundraising" | "thankyou", file: File) => {
      setErr(null)
      setMsg(null)
      if (file.size > 100 * 1024 * 1024) {
        setErr("Video must be 100MB or smaller.")
        return
      }
      setBusyKind(kind)
      setProgress(10)
      try {
        const thumb = await thumbnailBlobFromVideoFile(file)
        const form = new FormData()
        form.set("kind", kind)
        form.set("video", file)
        if (thumb) {
          form.set("thumbnail", new File([thumb], `${kind}-thumb.jpg`, { type: "image/jpeg" }))
        }
        setProgress(45)
        const res = await fetch(api, { method: "POST", body: form, credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setErr(typeof data.error === "string" ? data.error : "Upload failed")
          return
        }
        setProgress(100)
        setMsg(kind === "fundraising" ? "Fundraising video saved." : "Thank-you video saved.")
        router.refresh()
      } catch {
        setErr("Upload failed — try again on Wi‑Fi.")
      } finally {
        setBusyKind(null)
        setProgress(null)
      }
    },
    [api, router],
  )

  const remove = useCallback(
    async (kind: "fundraising" | "thankyou") => {
      setErr(null)
      setMsg(null)
      setBusyKind(kind)
      try {
        const res = await fetch(`${api}?kind=${kind}`, { method: "DELETE", credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setErr(typeof data.error === "string" ? data.error : "Could not remove")
          return
        }
        setMsg(kind === "fundraising" ? "Fundraising video removed." : "Thank-you video removed.")
        router.refresh()
      } finally {
        setBusyKind(null)
      }
    },
    [api, router],
  )

  const onPick = (kind: "fundraising" | "thankyou", e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (f) void upload(kind, f)
  }

  return (
    <section className="mt-8 rounded-xl border border-[#C8A94A]/30 bg-[#0B2545]/45 px-4 py-5 sm:px-6 sm:py-6">
      <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
        Your fundraising page videos
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-white/50">
        Optional — film on your phone (MP4, MOV, or WebM, up to 100MB). Short and authentic works best.
      </p>

      {err ? <p className="mt-3 text-sm text-red-400/90">{err}</p> : null}
      {msg ? <p className="mt-3 text-sm text-emerald-400/90">{msg}</p> : null}
      {progress != null ? (
        <p className="mt-2 text-xs text-white/45">
          Uploading… {progress}%
        </p>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-6">
        <div className="flex items-start gap-2">
          <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A94A]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white/90">Fundraising video (optional)</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Shown on your public gift page above your written note once checkout is live. Aim for about 60 seconds — who you are, what
              you&apos;re raising for, and why it matters.
            </p>
            <input
              ref={fundInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onPick("fundraising", e)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyKind !== null}
                onClick={() => fundInputRef.current?.click()}
                className="rounded-md border border-[#C8A94A]/45 bg-[#C8A94A]/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#C8A94A] hover:bg-[#C8A94A]/25 disabled:opacity-50"
              >
                {busyKind === "fundraising" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </span>
                ) : fundraisingVideoPath ? (
                  "Replace fundraising video"
                ) : (
                  "Upload fundraising video"
                )}
              </button>
              {fundraisingVideoPath ? (
                <button
                  type="button"
                  disabled={busyKind !== null}
                  onClick={() => void remove("fundraising")}
                  className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}
            </div>
            {fundraisingThumbPath ? (
              <p className="mt-2 text-[11px] text-white/40">Poster image saved — shows before play.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10 pt-6">
        <div className="flex items-start gap-2">
          <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A94A]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white/90">Thank-you video (optional)</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Sent privately to donors in their gift acknowledgment email — not on your public page. About 30 seconds works well. Thank
              supporters; you can mention thanking them in person too.
            </p>
            <input ref={tyInputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onPick("thankyou", e)} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyKind !== null}
                onClick={() => tyInputRef.current?.click()}
                className="rounded-md border border-[#C8A94A]/45 bg-[#C8A94A]/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#C8A94A] hover:bg-[#C8A94A]/25 disabled:opacity-50"
              >
                {busyKind === "thankyou" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </span>
                ) : thankyouVideoPath ? (
                  "Replace thank-you video"
                ) : (
                  "Upload thank-you video"
                )}
              </button>
              {thankyouVideoPath ? (
                <button
                  type="button"
                  disabled={busyKind !== null}
                  onClick={() => void remove("thankyou")}
                  className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              ) : null}
            </div>
            {thankyouThumbPath ? (
              <p className="mt-2 text-[11px] text-white/40">Poster generated for processing — donors open the email link to watch.</p>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-white/35">
        Videos for{" "}
        <strong className="text-white/50">{athleteFirstName}</strong> are stored securely. Donors only receive the thank-you link after they give.
      </p>
    </section>
  )
}
