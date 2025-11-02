import { getHaydenData } from "@/lib/athlete-service"
import AthleteImage from "@/components/athlete-image"

export const dynamic = "force-dynamic"
export const revalidate = 0 // Don't cache this page

export default async function HaydenDebugPage() {
  const haydenData = await getHaydenData()

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Hayden Debug Page</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Raw Data</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(haydenData.rawData, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Mapped Data</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(haydenData.mappedData, null, 2)}
        </pre>
      </div>

      {haydenData.mappedData && haydenData.mappedData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Image Preview</h2>
          <div className="flex flex-col items-center">
            <AthleteImage
              photoUrl={haydenData.mappedData[0].photourl}
              name={haydenData.mappedData[0].name}
              size="xl"
              priority
            />
            <p className="mt-4 text-gray-600">
              Photo URL:{" "}
              {haydenData.mappedData[0].photourl
                ? haydenData.mappedData[0].photourl.startsWith("data:")
                  ? "Data URL (too long to display)"
                  : haydenData.mappedData[0].photourl
                : "No photo URL"}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
