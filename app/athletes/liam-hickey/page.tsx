import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { YouTubeEmbed } from "@/components/youtube-embed"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ClientOnly } from "@/components/client-only"
import { PencilLine } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LiamHickeyPage() {
  const supabase = createClient()

  // Try to find Liam Hickey by name
  const { data: athletes } = await supabase.from("athletes").select("*").ilike("name", "%liam%hickey%").limit(1)

  // If not found, redirect to the athletes page
  if (!athletes || athletes.length === 0) {
    redirect("/athletes")
  }

  const athlete = athletes[0]
  const youtubeVideoId = "VdDhPZcWiz8"

  // Determine which photo to show
  const photoUrl = athlete.photourl || "/wrestler-silhouette.png"
  const commitmentPhotoUrl = athlete.commitmentPhotoUrl || photoUrl

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Action buttons at the top - Only Edit Request button */}
      <div className="mb-6 flex justify-end">
        <Link href={`/athletes/${athlete.id}/edit-request`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <PencilLine size={16} />
            Request Edit for this Athlete
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
          <div className="sticky top-8">
            {/* Main Photo - Show commitment photo prominently */}
            <div className="mb-6">
              <div className="relative aspect-[3/4] w-full bg-gray-100 rounded-lg shadow-md overflow-hidden">
                <ClientOnly>
                  <Image
                    src={commitmentPhotoUrl || "/placeholder.svg"}
                    alt={`${athlete.name} commitment photo`}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority
                  />
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-2/3">
          {/* Athlete name as a heading at the top of the info section */}
          <h1 className="text-3xl font-bold mb-4">{athlete.name}</h1>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Athlete Information - UPDATED BY V0!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">High School</p>
                <p className="font-medium">{athlete.highschool || "Not specified"}</p>
              </div>
              <div>
                <p className="text-gray-600">Graduation Year</p>
                <p className="font-medium">{athlete.graduationyear || "Not specified"}</p>
              </div>
              <div>
                <p className="text-gray-600">College Commitment</p>
                <p className="font-medium">{athlete.college || "Not committed"}</p>
              </div>
              <div>
                <p className="text-gray-600">Division</p>
                <p className="font-medium">{athlete.division || "Not specified"}</p>
              </div>
              <div>
                <p className="text-gray-600">Weight Class</p>
                <p className="font-medium">{athlete.weightclass || "Not specified"}</p>
              </div>
              <div>
                <p className="text-gray-600">Commitment Date</p>
                <p className="font-medium">
                  {athlete.commitmentdate ? new Date(athlete.commitmentdate).toLocaleDateString() : "Not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* YouTube Video Section - Prominently displayed */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-red-500">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-red-600 mr-2">▶</span> Highlight Video - MODIFIED BY V0!
            </h2>
            <YouTubeEmbed videoId={youtubeVideoId} title={`${athlete.name} Wrestling Highlights`} />
          </div>

          {athlete.bio && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Biography</h2>
              <p>{athlete.bio}</p>
            </div>
          )}

          {athlete.achievements && athlete.achievements.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Achievements</h2>
              <ul className="list-disc pl-5 space-y-1">
                {athlete.achievements.map((achievement, index) => (
                  <li key={index}>{achievement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile edit request button at the bottom (visible on small screens) */}
      <div className="mt-8 flex flex-col space-y-3 md:hidden">
        <Link href={`/athletes/${athlete.id}/edit-request`} className="w-full">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full flex items-center justify-center gap-2">
            <PencilLine size={16} />
            Request Edit for {athlete.name}
          </Button>
        </Link>
      </div>
    </main>
  )
}
