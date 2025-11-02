import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SimpleHaydenPage() {
  const supabase = createClient()

  // Fetch Hayden directly from the database
  const { data: hayden, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
    .single()

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (!hayden) {
    return <div>Hayden not found</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Simple Hayden Image Test</h1>

      <div className="mb-4">
        <p>
          <strong>Name:</strong> {hayden.name}
        </p>
      </div>

      {hayden.photourl ? (
        <div className="mb-6">
          <p className="mb-2">
            <strong>Image from data URL:</strong>
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hayden.photourl || "/placeholder.svg"}
            alt={hayden.name}
            className="w-64 h-80 object-cover border rounded"
            onError={(e) => {
              console.error("Image failed to load")
              e.currentTarget.src = "/placeholder.svg"
            }}
          />
        </div>
      ) : (
        <p>No image available</p>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Using AthleteImage Component:</h2>
        <div className="flex items-center gap-4">
          <div>
            <p className="mb-2">Small:</p>
            <AthleteImage photoUrl={hayden.photourl} name={hayden.name} size="sm" />
          </div>
          <div>
            <p className="mb-2">Medium:</p>
            <AthleteImage photoUrl={hayden.photourl} name={hayden.name} size="md" />
          </div>
          <div>
            <p className="mb-2">Large:</p>
            <AthleteImage photoUrl={hayden.photourl} name={hayden.name} size="lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

import AthleteImage from "@/components/athlete-image"
