import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

interface AthleteDebugPageProps {
  params: {
    id: string
  }
}

async function getAthleteRawData(id: string) {
  try {
    const supabase = createClient()

    const { data: athlete, error } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching athlete:", error)
      return null
    }

    return athlete
  } catch (error) {
    console.error("Exception fetching athlete:", error)
    return null
  }
}

export default async function AthleteDebugPage({ params }: AthleteDebugPageProps) {
  const rawData = await getAthleteRawData(params.id)

  if (!rawData) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Raw Database Data for Athlete ID: {params.id}</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">All Database Fields:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(rawData, null, 2)}</pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Field Mapping Analysis:</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold">Name Fields:</h3>
              <p>
                <strong>name:</strong> {rawData.name || "NOT SET"}
              </p>
              <p>
                <strong>first_name:</strong> {rawData.first_name || "NOT SET"}
              </p>
              <p>
                <strong>last_name:</strong> {rawData.last_name || "NOT SET"}
              </p>
              <p>
                <strong>firstName:</strong> {rawData.firstName || "NOT SET"}
              </p>
              <p>
                <strong>lastName:</strong> {rawData.lastName || "NOT SET"}
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold">High School Fields:</h3>
              <p>
                <strong>high_school:</strong> {rawData.high_school || "NOT SET"}
              </p>
              <p>
                <strong>highschool:</strong> {rawData.highschool || "NOT SET"}
              </p>
              <p>
                <strong>highSchool:</strong> {rawData.highSchool || "NOT SET"}
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold">Wrestling Club Fields:</h3>
              <p>
                <strong>club:</strong> {rawData.club || "NOT SET"}
              </p>
              <p>
                <strong>wrestlingclub:</strong> {rawData.wrestlingclub || "NOT SET"}
              </p>
              <p>
                <strong>wrestlingClub:</strong> {rawData.wrestlingClub || "NOT SET"}
              </p>
              <p>
                <strong>wrestling_club:</strong> {rawData.wrestling_club || "NOT SET"}
              </p>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold">Weight Class Fields:</h3>
              <p>
                <strong>weight_class:</strong> {rawData.weight_class || "NOT SET"}
              </p>
              <p>
                <strong>weightclass:</strong> {rawData.weightclass || "NOT SET"}
              </p>
              <p>
                <strong>weightClass:</strong> {rawData.weightClass || "NOT SET"}
              </p>
              <p>
                <strong>weight:</strong> {rawData.weight || "NOT SET"}
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-semibold">College Fields:</h3>
              <p>
                <strong>college:</strong> {rawData.college || "NOT SET"}
              </p>
              <p>
                <strong>college_name:</strong> {rawData.college_name || "NOT SET"}
              </p>
            </div>

            <div className="border-l-4 border-indigo-500 pl-4">
              <h3 className="font-semibold">Graduation Year Fields:</h3>
              <p>
                <strong>graduation_year:</strong> {rawData.graduation_year || "NOT SET"}
              </p>
              <p>
                <strong>graduationyear:</strong> {rawData.graduationyear || "NOT SET"}
              </p>
              <p>
                <strong>graduationYear:</strong> {rawData.graduationYear || "NOT SET"}
              </p>
            </div>

            <div className="border-l-4 border-pink-500 pl-4">
              <h3 className="font-semibold">Image Fields:</h3>
              <p>
                <strong>image_url:</strong> {rawData.image_url || "NOT SET"}
              </p>
              <p>
                <strong>photourl:</strong> {rawData.photourl || "NOT SET"}
              </p>
              <p>
                <strong>photoUrl:</strong> {rawData.photoUrl || "NOT SET"}
              </p>
              <p>
                <strong>commitmentPhotoUrl:</strong> {rawData.commitmentPhotoUrl || "NOT SET"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Logic Results:</h2>
          <div className="space-y-2">
            <p>
              <strong>Resolved Name:</strong>{" "}
              {rawData.name ||
                `${rawData.first_name || rawData.firstName || ""} ${rawData.last_name || rawData.lastName || ""}`.trim()}
            </p>
            <p>
              <strong>Resolved High School:</strong>{" "}
              {rawData.high_school || rawData.highschool || rawData.highSchool || "NOT FOUND"}
            </p>
            <p>
              <strong>Resolved Wrestling Club:</strong>{" "}
              {rawData.club || rawData.wrestlingclub || rawData.wrestlingClub || rawData.wrestling_club || "NOT FOUND"}
            </p>
            <p>
              <strong>Resolved Weight Class:</strong>{" "}
              {rawData.weight_class || rawData.weightclass || rawData.weightClass || rawData.weight || "NOT FOUND"}
            </p>
            <p>
              <strong>Resolved College:</strong> {rawData.college || rawData.college_name || "NOT FOUND"}
            </p>
            <p>
              <strong>Resolved Graduation Year:</strong>{" "}
              {rawData.graduation_year || rawData.graduationyear || rawData.graduationYear || "NOT FOUND"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
