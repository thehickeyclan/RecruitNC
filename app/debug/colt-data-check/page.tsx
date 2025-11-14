export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"

export default async function ColtDataCheckPage() {
  const supabase = createClient()

  try {
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("*")
      .ilike("name", "%colt%campbell%")
      .limit(5)

    if (error) {
      console.error("Error fetching Colt Campbell data:", error)
      return (
        <div className="container mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4">Colt Campbell Data Check</h1>
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-600">Error: {error.message}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Colt Campbell Data Check</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Search Results for "Colt Campbell"</h2>

          {athletes && athletes.length > 0 ? (
            <div className="space-y-4">
              {athletes.map((athlete) => (
                <div key={athlete.id} className="border rounded p-4">
                  <h3 className="font-medium">{athlete.name}</h3>
                  <p className="text-sm text-gray-600">ID: {athlete.id}</p>
                  <p className="text-sm text-gray-600">High School: {athlete.high_school}</p>
                  <p className="text-sm text-gray-600">College: {athlete.college}</p>
                  <p className="text-sm text-gray-600">Class: {athlete.class_year}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No athletes found matching "Colt Campbell"</p>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error fetching Colt Campbell data:", error)
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Colt Campbell Data Check</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-600">Unexpected error occurred</p>
        </div>
      </div>
    )
  }
}
