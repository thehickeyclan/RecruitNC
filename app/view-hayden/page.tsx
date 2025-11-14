import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ViewHaydenPage() {
  const supabase = createClient()

  // Get Hayden's record
  const { data: hayden, error } = await supabase.from("athletes").select("*").eq("name", "Hayden Haynes").single()

  if (error || !hayden) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error ? error.message : "Hayden not found"}</p>
        <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">
          Return to Homepage
        </Link>
      </div>
    )
  }

  const isDataUrl = hayden.photourl?.startsWith("data:")

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Hayden's Current Image</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Athlete Information</h2>
        <p>
          <strong>Name:</strong> {hayden.name}
        </p>
        <p>
          <strong>High School:</strong> {hayden.highschool}
        </p>
        <p>
          <strong>College:</strong> {hayden.college}
        </p>
        <p>
          <strong>Division:</strong> {hayden.division}
        </p>
        <p>
          <strong>Weight Class:</strong> {hayden.weightclass}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Current Image</h2>
        {hayden.photourl ? (
          <div>
            <div className="w-40 h-40 relative mb-2">
              {isDataUrl ? (
                <img
                  src={hayden.photourl || "/placeholder.svg"}
                  alt={hayden.name}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Image
                  src={hayden.photourl || "/placeholder.svg"}
                  alt={hayden.name}
                  width={160}
                  height={160}
                  className="object-cover"
                />
              )}
            </div>
            <p>
              <strong>Image Type:</strong> {isDataUrl ? "Data URL" : "Regular URL"}
            </p>
            <p>
              <strong>Image URL:</strong> {hayden.photourl.substring(0, 50)}...
            </p>
          </div>
        ) : (
          <p>No image available</p>
        )}
      </div>

      <div className="flex space-x-4">
        <Link href="/upload-hayden" className="bg-blue-500 text-white px-4 py-2 rounded">
          Upload New Image
        </Link>
        <Link href="/" className="text-blue-500 hover:underline mt-2 inline-block">
          Return to Homepage
        </Link>
      </div>
    </div>
  )
}
