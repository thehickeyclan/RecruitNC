import { YouTubeEmbed } from "@/components/youtube-embed"

export default function YouTubeTestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">YouTube Embed Test</h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Liam Hickey Highlight Video</h2>
        <YouTubeEmbed videoId="VdDhPZcWiz8" title="Liam Hickey Wrestling Highlights" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Video 1</h2>
          <YouTubeEmbed videoId="dQw4w9WgXcQ" title="Test Video 1" />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Video 2</h2>
          <YouTubeEmbed videoId="jNQXAC9IVRw" title="Test Video 2" />
        </div>
      </div>
    </div>
  )
}
