"use client"

import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import { Loader2, Trash2, Video } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { FUNDRAISING_VIDEOS_BUCKET } from "@/lib/fundraising/fundraising-video-storage"

type Props = {
  fundraisingSlug: string
  athleteFirstName: string
  hasFundraisingProfile: boolean
  canEdit: boolean
  isRecruitNcAdmin: boolean
  checkoutLive: boolean
  fundraisingVideoPath: string | null
  fundraisingThumbPath: string | null
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
}: Props) {
  const router = useRouter()
  const fundInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  /** Staff see controls even when roster resolution omits athletes.id; API still requires profile.athlete_id to save. */
  const mayEditVideos = (canEdit || isRecruitNcAdmin) && hasFundraisingProfile
  const familyMayEdit = checkoutLive || isRecruitNcAdmin || canEdit
  if (!mayEditVideos) return null

  const slugEnc = encodeURIComponent(fundraisingSlug)
  const api = `/api/fundraising/athletes/${slugEnc}/video`
  const signedApi = `/api/fundraising/athletes/${slugEnc}/video-signed`
  const commitApi = `/api/fundraising/athletes/${slugEnc}/video-commit`

  const upload = useCallback(
    async (file: File) => {
      setErr(null)
      setMsg(null)
      if (file.size > 100 * 1024 * 1024) {
        setErr("Video must be 100MB or smaller.")
        return
      }
      const mime = (file.type || "application/octet-stream").split(";")[0]!.trim().toLowerCase()
      setBusy(true)
      setProgress(8)
      try {
        const thumb = await thumbnailBlobFromVideoFile(file)
        setProgress(22)
        const signedRes = await fetch(signedApi, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mime,
            videoSize: file.size,
            hasThumbnail: thumb != null,
          }),
        })
        const signedData = await signedRes.json().catch(() => ({}))
        if (!signedRes.ok) {
          setErr(typeof signedData.error === "string" ? signedData.error : "Upload failed")
          return
        }
        const bucket = typeof signedData.bucket === "string" ? signedData.bucket : FUNDRAISING_VIDEOS_BUCKET
        const v = signedData.video as { path?: string; token?: string } | undefined
        const videoContentType =
          typeof signedData.videoContentType === "string" ? signedData.videoContentType : mime || "video/mp4"
        if (!v?.path || !v?.token) {
          setErr("Upload failed")
          return
        }
        const supabase = createBrowserClient()
        setProgress(40)
        const { error: vErr } = await supabase.storage.from(bucket).uploadToSignedUrl(v.path, v.token, file, {
          contentType: videoContentType,
        })
        if (vErr) {
          setErr(vErr.message || "Video upload failed")
          return
        }
        setProgress(70)
        let thumbPath: string | null = null
        const t = signedData.thumbnail as { path?: string; token?: string } | null | undefined
        if (thumb != null && t?.path && t.token) {
          const thumbFile = new File([thumb], "fundraising-thumb.jpg", { type: "image/jpeg" })
          const { error: tErr } = await supabase.storage.from(bucket).uploadToSignedUrl(t.path, t.token, thumbFile, {
            contentType: "image/jpeg",
          })
          if (tErr) {
            setErr(tErr.message || "Thumbnail upload failed")
            return
          }
          thumbPath = t.path
        }
        setProgress(90)
        const commitRes = await fetch(commitApi, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoPath: v.path, thumbnailPath: thumbPath }),
        })
        const commitData = await commitRes.json().catch(() => ({}))
        if (!commitRes.ok) {
          setErr(typeof commitData.error === "string" ? commitData.error : "Could not save video")
          return
        }
        setProgress(100)
        setMsg("Fundraising video saved.")
        router.refresh()
      } catch {
        setErr("Upload failed — try again on Wi‑Fi.")
      } finally {
        setBusy(false)
        setProgress(null)
      }
    },
    [signedApi, commitApi, router],
  )

  const remove = useCallback(async () => {
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const res = await fetch(api, { method: "DELETE", credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Could not remove")
        return
      }
      setMsg("Fundraising video removed.")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }, [api, router])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (f) void upload(f)
  }

  return (
    <section className="mt-8 rounded-xl border border-[#C8A94A]/30 bg-[#0B2545]/45 px-4 py-5 sm:px-6 sm:py-6">
      <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
        Your fundraising page video
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-white/50">
        Optional — film on your phone (MP4, MOV, or WebM, up to 100MB). Donors see it on this page (with your goal and written note) once
        giving is turned on. Short and authentic works best.
      </p>
      {!checkoutLive && canEdit ? (
        <p className="mt-2 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
          You can upload or replace the clip now; donors will only see it after NC United turns on giving for this page.
        </p>
      ) : null}

      {err ? <p className="mt-3 text-sm text-red-400/90">{err}</p> : null}
      {msg ? <p className="mt-3 text-sm text-emerald-400/90">{msg}</p> : null}
      {progress != null ? <p className="mt-2 text-xs text-white/45">Uploading… {progress}%</p> : null}

      <div className="mt-6 flex items-start gap-2">
        <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A94A]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/90">Fundraising video (optional)</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            Aim for about 60 seconds — who you are, what you&apos;re raising for, and why it matters.
          </p>
          <input ref={fundInputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => fundInputRef.current?.click()}
              className="rounded-md border border-[#C8A94A]/45 bg-[#C8A94A]/15 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-[#C8A94A] hover:bg-[#C8A94A]/25 disabled:opacity-50"
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </span>
              ) : fundraisingVideoPath ? (
                "Replace video (new upload)"
              ) : (
                "Upload fundraising video"
              )}
            </button>
            {fundraisingVideoPath ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2.5 text-xs font-semibold text-red-100/95 hover:bg-red-950/65 disabled:opacity-50"
                aria-label="Delete fundraising video from this page"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Delete video
              </button>
            ) : null}
          </div>
          {fundraisingVideoPath ? (
            <p className="mt-2 text-[11px] leading-snug text-white/45">
              Replace picks a new file in one step. Delete clears the clip and poster so you can upload fresh.
            </p>
          ) : null}
          {fundraisingThumbPath ? (
            <p className="mt-2 text-[11px] text-white/40">Poster image saved — shows before play.</p>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-white/35">
        Video for <strong className="text-white/50">{athleteFirstName}</strong> is stored securely and only shown on this gift page.
      </p>
    </section>
  )
}
