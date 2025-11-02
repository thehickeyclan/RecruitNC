import { createClient } from "@/lib/supabase/server"
import AthleteImage from "@/components/athlete-image"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AllAthletesTestPage() {
  const supabase = createClient()

  const { data: athletes, error } = await supabase.from("athletes").select("*").order("name")

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">All Athletes Test</h1>

      <div className="mb-6 flex gap-4">
        <a
          href="/api/add-test-athlete"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          Add Test Athlete
        </a>
        <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Go to Homepage
        </Link>
      </div>

      {error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded">Error: {error.message}</div>
      ) : !athletes || athletes.length === 0 ? (
        <div className="p-4 bg-yellow-100 text-yellow-700 rounded">No athletes found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[4/5] relative">
                <AthleteImage photoUrl={athlete.photourl} name={athlete.name} size="lg" className="w-full h-full" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{athlete.name}</h3>
                <p className="text-sm text-gray-600">{athlete.highschool}</p>
                <p className="text-sm">
                  <span className="font-medium">{athlete.college}</span>
                  {athlete.division && <span className="ml-1 text-gray-500">({athlete.division})</span>}
                </p>
                <p className="text-xs text-gray-500 mt-2 truncate">
                  Image: {athlete.photourl ? athlete.photourl.substring(0, 30) + "..." : "None"}
                </p>
                <p className="text-xs text-gray-500">
                  Type: {athlete.photourl?.startsWith("data:") ? "Data URL" : "Regular URL"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
