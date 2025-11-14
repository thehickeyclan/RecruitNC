interface YouTubeEmbedProps {
  videoId?: string
  url?: string
  title?: string
  className?: string
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export function YouTubeEmbed({ videoId, url, title = "YouTube video player", className = "" }: YouTubeEmbedProps) {
  let actualVideoId = videoId

  if (!actualVideoId && url) {
    actualVideoId = extractVideoId(url)
  }

  if (!actualVideoId) {
    return (
      <div
        className={`relative w-full pt-[56.25%] bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
      >
        <p className="text-gray-500">Invalid video URL or ID</p>
      </div>
    )
  }

  return (
    <div className={`relative w-full pt-[56.25%] ${className}`}>
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        src={`https://www.youtube.com/embed/${actualVideoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  )
}

// Also export as default for backward compatibility
export default YouTubeEmbed
