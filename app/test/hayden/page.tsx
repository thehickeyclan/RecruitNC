import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import Image from "next/image"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function HaydenTest() {
  const supabase = await createClient()

  // Fetch Hayden directly from the database
  const { data: hayden, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
    .single()

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700">Error: {error.message}</div>
  }

  if (!hayden) {
    return <div className="p-4 bg-yellow-100 text-yellow-700">Hayden not found</div>
  }

  // Get the first 100 characters of the photourl for debugging
  const photoUrlPreview = hayden.photourl ? `${hayden.photourl.substring(0, 100)}...` : "No photo URL"

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Hayden Test Page</h1>

      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Raw Data</h2>
        <div className="mb-4">
          <strong>ID:</strong> {hayden.id}
        </div>
        <div className="mb-4">
          <strong>Name:</strong> {hayden.name}
        </div>
        <div className="mb-4">
          <strong>Photo URL (preview):</strong>
          <div className="text-xs font-mono bg-gray-200 p-2 mt-1 overflow-x-auto">{photoUrlPreview}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Approach 1: Direct img tag */}
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-4">Approach 1: Direct img tag</h2>
          {hayden.photourl ? (
            <div>
              <img
                src={hayden.photourl || "/placeholder.svg"}
                alt={`${hayden.name}`}
                className="w-48 h-48 object-cover rounded"
              />
              <p className="mt-2 text-sm text-gray-600">Using standard img tag</p>
            </div>
          ) : (
            <div className="bg-gray-200 w-48 h-48 flex items-center justify-center rounded">No image</div>
          )}
        </div>

        {/* Approach 2: Next.js Image with unoptimized */}
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-4">Approach 2: Next.js Image unoptimized</h2>
          {hayden.photourl ? (
            <div>
              <div className="relative w-48 h-48">
                <Image
                  src={hayden.photourl || "/placeholder.svg"}
                  alt={`${hayden.name}`}
                  fill
                  className="object-cover rounded"
                  unoptimized
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">Using Next.js Image with unoptimized</p>
            </div>
          ) : (
            <div className="bg-gray-200 w-48 h-48 flex items-center justify-center rounded">No image</div>
          )}
        </div>

        {/* Approach 3: Data URL in img with explicit type */}
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-4">Approach 3: Explicit data URL handling</h2>
          {hayden.photourl ? (
            <div>
              <img
                src={hayden.photourl || "/placeholder.svg"}
                alt={`${hayden.name}`}
                className="w-48 h-48 object-cover rounded"
                onError={(e) => {
                  console.error("Image load error:", e)
                  e.currentTarget.src = "/diverse-group-athletes.png"
                }}
              />
              <p className="mt-2 text-sm text-gray-600">With error handling</p>
            </div>
          ) : (
            <div className="bg-gray-200 w-48 h-48 flex items-center justify-center rounded">No image</div>
          )}
        </div>

        {/* Approach 4: Simple placeholder */}
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-4">Approach 4: Simple placeholder</h2>
          <div>
            <img src="/person-contemplating-nature.png" alt="Placeholder" className="w-48 h-48 object-cover rounded" />
            <p className="mt-2 text-sm text-gray-600">Placeholder image</p>
          </div>
        </div>
      </div>

      {/* Full data URL for inspection */}
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Full Photo URL</h2>
        <details>
          <summary className="cursor-pointer text-blue-600">Click to expand/collapse</summary>
          <div className="text-xs font-mono bg-gray-200 p-2 mt-1 overflow-x-auto whitespace-pre-wrap">
            {hayden.photourl || "No photo URL"}
          </div>
        </details>
      </div>
    </div>
  )
}

export default function HaydenTestPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Hayden's data...</div>}>
      <HaydenTest />
    </Suspense>
  )
}
