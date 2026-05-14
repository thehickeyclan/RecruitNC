type Props = {
  videoUrl: string
  posterUrl?: string | null
  athleteFirstName: string
}

/** Public gift-page fundraising clip — no autoplay; `videoUrl` is already a time-limited signed URL. */
export function FundraisingPublicVideo({ videoUrl, posterUrl, athleteFirstName }: Props) {
  if (!videoUrl.trim()) return null

  return (
    <div className="mb-2">
      <p className="mb-2 text-sm text-white/55">A message from {athleteFirstName}</p>
      <video
        src={videoUrl}
        poster={posterUrl?.trim() || undefined}
        controls
        preload="metadata"
        playsInline
        className="max-h-[400px] w-full rounded-lg bg-black object-contain"
      >
        Your browser does not support video playback.
      </video>
    </div>
  )
}
