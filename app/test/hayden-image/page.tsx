import { createClient } from "@/lib/supabase/server"
import AthleteImage from "@/components/athlete-image"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function HaydenImageTestPage() {
  const supabase = createClient()

  const { data: hayden, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
    .single()

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Hayden Image Test</h1>

      {error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded">Error: {error.message}</div>
      ) : !hayden ? (
        <div className="p-4 bg-yellow-100 text-yellow-700 rounded">No data found for Hayden</div>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Hayden's Image</h2>
              <div className="w-64 h-80 mb-4">
                <AthleteImage photoUrl={hayden.photourl} name={hayden.name} size="lg" priority />
              </div>
              <p className="text-sm text-gray-500 break-all">Image URL: {hayden.photourl?.substring(0, 50)}...</p>
              <p className="text-sm text-gray-500">
                URL Type: {hayden.photourl?.startsWith("data:") ? "Data URL" : "Regular URL"}
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Athlete Details</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Name:</span> {hayden.name}
                </p>
                <p>
                  <span className="font-medium">High School:</span> {hayden.highschool}
                </p>
                <p>
                  <span className="font-medium">College:</span> {hayden.college}
                </p>
                <p>
                  <span className="font-medium">Division:</span> {hayden.division}
                </p>
                <p>
                  <span className="font-medium">Weight Class:</span> {hayden.weightclass}
                </p>
                <p>
                  <span className="font-medium">Graduation Year:</span> {hayden.graduationyear}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="flex gap-4">
              <a
                href="/api/fix-hayden-original"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Restore Original Image
              </a>
              <a href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Go to Homepage
              </a>
              <a href={`/athletes/${hayden.id}`} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Go to Athlete Page
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
